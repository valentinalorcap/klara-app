import 'server-only';
import { EvalStatus, type EvalTone } from '@prisma/client';
import { getAnthropic, MODELS } from './anthropic';
import { prisma } from './prisma';
import { TONE_GUIDANCE } from './evaluations';
import { dayScore } from './dayScore';
import { MEAL_TYPE_LABELS, sumEntries, type Totals } from './meals';

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
    "You are Klara, the user's nutrition coach. The user just CLOSED their day,",
    'so write a short end-of-day review of the whole day (2–4 sentences, plain',
    'text, no markdown, no bullets, no greeting or sign-off).',
    '',
    'How to write it:',
    '1. The user message has a Day status block (actual vs target per macro,',
    '   tagged OVER / UNDER / ON-TRACK / UNSET) and a 0–100 day score. Anchor',
    '   your review on those numbers.',
    '2. Call out what went well and what to adjust TOMORROW. Only mention macros',
    '   that have a target; never mention an UNSET macro. Never suggest more of a',
    '   macro that is OVER.',
    '3. This is a finished day — frame it as a wrap-up/reflection, never as',
    '   "the rest of your day". You may note the overall pattern (e.g. protein',
    '   spread across meals, a heavy dinner), not just one meal.',
    '4. Be specific with numbers, honest, and never recommend skipping meals or',
    '   extreme restriction.',
    '',
    TONE_GUIDANCE[tone],
    '',
    'Output: plain text, English, 2–4 sentences.',
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

    const userMessage = [
      'The user closed this day. Write your end-of-day review.',
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
