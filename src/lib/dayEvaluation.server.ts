import 'server-only';
import { EvalStatus, type EvalTone } from '@prisma/client';
import { getAnthropic, MODELS } from './anthropic';
import { prisma } from './prisma';
import { TONE_GUIDANCE } from './evaluations';
import { dayScore } from './dayScore';
import { MEAL_TYPE_LABELS, sumEntries, type Totals } from './meals';
import { fetchWeeklyContext } from './weeklyContext.server';

type DailyTargets = {
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
};

/** Upsert a PENDING day evaluation so the UI can show a loading state. */
export async function markDayEvaluationPending(userId: string, dateKey: string, tone: EvalTone) {
  const date = new Date(dateKey + 'T00:00:00Z');
  await prisma.dayEvaluation.upsert({
    where: { userId_date: { userId, date } },
    create: { userId, date, tone, status: EvalStatus.PENDING },
    update: { tone, status: EvalStatus.PENDING, markdown: null, errorMessage: null },
  });
}

function buildDayStatusBlock(totals: Totals, targets: DailyTargets): string[] {
  const rows = [
    { label: 'Calories', actual: totals.kcal, target: targets.kcal, unit: ' kcal' },
    { label: 'Protein', actual: totals.protein, target: targets.protein, unit: 'g' },
    { label: 'Carbs', actual: totals.carbs, target: targets.carbs, unit: 'g' },
    { label: 'Fat', actual: totals.fat, target: targets.fat, unit: 'g' },
  ];
  return rows.map(({ label, actual, target, unit }) => {
    if (target == null || target <= 0) {
      return `- ${label}: ${actual.toFixed(1)}${unit} (target UNSET — do not mention)`;
    }
    const pct = Math.round((actual / target) * 100);
    const tag = pct >= 110 ? 'OVER' : pct <= 90 ? 'UNDER' : 'ON-TRACK';
    return `- ${label}: ${actual.toFixed(1)}${unit} / ${Math.round(target)}${unit} (${pct}% — ${tag})`;
  });
}

function buildSystemPrompt(tone: EvalTone): string {
  return [
    "You are Klara, the user's personal nutrition coach. The user just closed",
    'their day.',
    '',
    'CRITICAL — read this before writing:',
    '1. The user can see all their numbers in the app. NEVER narrate their data',
    '   back ("you logged X of your Y kcal" is forbidden). Skip the scorekeeping.',
    '2. Use the meal history to DIAGNOSE patterns — never name a full meal as a recommendation.',
    '3. Name the ROOT CAUSE as a BEHAVIOR, not a macro:',
    '   Good: "the dinner slot was empty" / "everything happened before noon".',
    '   Bad: "protein fell short" / "carbs ran ahead of fat".',
    '   The OVER/UNDER tags help you reason — they must NOT appear in your output.',
    '4. The 🎯 recommendation must name a specific ingredient or product',
    '   (e.g. "Greek yogurt", "oats", "eggs") — not a full meal from their history.',
    '',
    TONE_GUIDANCE[tone],
    '',
    'Output format — THREE separate blocks, each on its own line with a blank line between them:',
    '',
    '👀 [what happened structurally today — 1 sentence]',
    '',
    '🧠 [recurring habit or pattern from their week — 1 sentence]',
    '',
    '🎯 [what to add tomorrow — 1 sentence naming a specific ingredient or product]',
    '',
    'CRITICAL: never run the sections together. Each must start on a new line.',
    'Blank line between each block — exactly as shown above.',
    'Max 50 words total. Plain text only. No greeting, no sign-off.',
  ].join('\n');
}

/**
 * Generate Klara's holistic review of a closed day with Sonnet and store it
 * on the DayEvaluation row. Best-effort: failures land as status ERROR.
 */
export async function evaluateDayByDate(userId: string, dateKey: string): Promise<void> {
  const date = new Date(dateKey + 'T00:00:00Z');
  try {
    const [user, meals] = await Promise.all([
      prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          defaultEvalTone: true,
          dailyKcalGoal: true,
          dailyProteinGoal: true,
          dailyCarbsGoal: true,
          dailyFatGoal: true,
        },
      }),
      prisma.meal.findMany({
        where: { userId, date },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        include: { entries: true },
      }),
    ]);

    if (meals.length === 0) {
      await prisma.dayEvaluation.update({
        where: { userId_date: { userId, date } },
        data: { status: EvalStatus.ERROR, errorMessage: 'No meals logged for this day.' },
      });
      return;
    }

    const targets: DailyTargets = {
      kcal: user.dailyKcalGoal,
      protein: user.dailyProteinGoal,
      carbs: user.dailyCarbsGoal,
      fat: user.dailyFatGoal,
    };
    const dayTotals = sumEntries(meals.flatMap((m) => m.entries));
    const score = dayScore(dayTotals, {
      dailyKcalGoal: user.dailyKcalGoal,
      dailyProteinGoal: user.dailyProteinGoal,
      dailyCarbsGoal: user.dailyCarbsGoal,
      dailyFatGoal: user.dailyFatGoal,
    });

    const mealLines = meals.map((m) => {
      const t = sumEntries(m.entries);
      const label = m.name ? `${MEAL_TYPE_LABELS[m.type]} — ${m.name}` : MEAL_TYPE_LABELS[m.type];
      return `- ${label}: ${Math.round(t.kcal)} kcal · P ${t.protein.toFixed(0)}g · C ${t.carbs.toFixed(
        0,
      )}g · F ${t.fat.toFixed(0)}g`;
    });

    const weeklyContext = await fetchWeeklyContext(userId, date, {
      dailyKcalGoal: user.dailyKcalGoal,
      dailyProteinGoal: user.dailyProteinGoal,
      dailyCarbsGoal: user.dailyCarbsGoal,
      dailyFatGoal: user.dailyFatGoal,
    });

    const userMessage = [
      'The user closed this day.',
      '',
      score
        ? `Day score: ${score.score}/100 (${score.label}).`
        : 'Day score: not available (no goals set).',
      '',
      'Day status:',
      ...buildDayStatusBlock(dayTotals, targets),
      '',
      `Meals logged (${meals.length}):`,
      ...mealLines,
    ].join('\n');

    const client = getAnthropic();
    const res = await client.messages.create({
      model: MODELS.sonnet,
      max_tokens: 450,
      temperature: 0.4,
      system: [
        {
          type: 'text',
          text: buildSystemPrompt(user.defaultEvalTone),
          cache_control: { type: 'ephemeral' },
        },
        ...(weeklyContext
          ? [
              {
                type: 'text' as const,
                text: weeklyContext,
                cache_control: { type: 'ephemeral' as const },
              },
            ]
          : []),
      ],
      messages: [{ role: 'user', content: userMessage }],
    });

    const text = res.content
      .filter((b) => b.type === 'text')
      .map((b) => (b.type === 'text' ? b.text : ''))
      .join('')
      .trim();

    if (!text) {
      await prisma.dayEvaluation.update({
        where: { userId_date: { userId, date } },
        data: { status: EvalStatus.ERROR, errorMessage: 'Klara returned an empty review.' },
      });
      return;
    }

    await prisma.dayEvaluation.update({
      where: { userId_date: { userId, date } },
      data: {
        status: EvalStatus.DONE,
        markdown: text,
        model: MODELS.sonnet,
        tokensIn: res.usage?.input_tokens ?? null,
        tokensOut: res.usage?.output_tokens ?? null,
        errorMessage: null,
      },
    });
  } catch (err) {
    await prisma.dayEvaluation
      .update({
        where: { userId_date: { userId, date } },
        data: {
          status: EvalStatus.ERROR,
          errorMessage: err instanceof Error ? err.message : 'Day evaluation failed.',
        },
      })
      .catch(() => {});
  }
}
