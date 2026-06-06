import 'server-only';
import type Anthropic from '@anthropic-ai/sdk';
import { EvalStatus, EvalTone } from '@prisma/client';
import { getAnthropic, MODELS } from './anthropic';
import { prisma } from './prisma';
import { entryMacros, isoDate, MEAL_TYPE_LABELS, sumEntries } from './meals';
import {
  buildSystemPrompt,
  buildUserMessage,
  type DailyTargets,
  type EvalEntry,
  type EvalMealSummary,
  type EvaluationInput,
  type MacroSum,
} from './evaluations';

/**
 * Ensure a PENDING evaluation row exists for the meal — called right after
 * the meal is saved so the UI can render a skeleton immediately. Idempotent:
 * if an evaluation already exists, flips it back to PENDING and clears the
 * previous result so a re-eval looks fresh in the UI.
 */
export async function markEvaluationPending(mealId: string, tone: EvalTone, userId: string) {
  await prisma.aIEvaluation.upsert({
    where: { mealId },
    create: { mealId, userId, tone, status: EvalStatus.PENDING },
    update: { tone, status: EvalStatus.PENDING, markdown: null, errorMessage: null },
  });
}

/**
 * Load the meal + day context, call Claude Haiku, and write the result back.
 * Safe to invoke from `after()` — wraps its own errors and records them on
 * the row instead of letting them escape.
 */
export async function evaluateMealById(mealId: string): Promise<void> {
  try {
    const meal = await prisma.meal.findUnique({
      where: { id: mealId },
      include: {
        entries: { orderBy: { createdAt: 'asc' } },
        user: {
          select: {
            id: true,
            defaultEvalTone: true,
            dailyKcalGoal: true,
            dailyProteinGoal: true,
            dailyCarbsGoal: true,
            dailyFatGoal: true,
          },
        },
      },
    });
    if (!meal) return;

    const dayKey = isoDate(meal.date);
    const dayDate = new Date(dayKey + 'T00:00:00Z');
    const dayMeals = await prisma.meal.findMany({
      where: { userId: meal.userId, date: dayDate },
      include: { entries: true },
    });
    const dayTotals = sumEntries(dayMeals.flatMap((m) => m.entries));

    const targets: DailyTargets = {
      kcal: meal.user.dailyKcalGoal,
      protein: meal.user.dailyProteinGoal,
      carbs: meal.user.dailyCarbsGoal,
      fat: meal.user.dailyFatGoal,
    };

    const entries: EvalEntry[] = meal.entries.map((e) => {
      const m = entryMacros(e);
      return { name: e.name, grams: e.grams, ...m };
    });

    const mealTotals: MacroSum = sumEntries(meal.entries);

    let batchSiblings: EvalMealSummary[] | undefined;
    if (meal.batchId) {
      const siblings = await prisma.meal.findMany({
        where: { batchId: meal.batchId, id: { not: meal.id } },
        orderBy: { createdAt: 'asc' },
        include: { entries: { orderBy: { createdAt: 'asc' } } },
      });
      batchSiblings = siblings.map((s) => ({
        typeLabel: MEAL_TYPE_LABELS[s.type],
        name: s.name,
        entries: s.entries.map((e) => {
          const m = entryMacros(e);
          return { name: e.name, grams: e.grams, ...m };
        }),
        totals: sumEntries(s.entries),
      }));
    }

    const input: EvaluationInput = {
      meal: {
        typeLabel: MEAL_TYPE_LABELS[meal.type],
        name: meal.name,
        entries,
        totals: mealTotals,
      },
      batchSiblings,
      dayTotals,
      targets,
      tone: meal.user.defaultEvalTone,
    };

    const client = getAnthropic();
    const response = await client.messages.create({
      model: MODELS.haiku,
      max_tokens: 220,
      temperature: 0.4,
      system: [
        {
          type: 'text',
          text: buildSystemPrompt(meal.user.defaultEvalTone),
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: buildUserMessage(input) }],
    });

    const markdown = response.content
      .filter((block): block is Anthropic.Messages.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim();

    if (!markdown) {
      throw new Error('Claude returned an empty evaluation.');
    }

    await prisma.aIEvaluation.update({
      where: { mealId },
      data: {
        status: EvalStatus.DONE,
        markdown,
        model: MODELS.haiku,
        tokensIn: response.usage.input_tokens,
        tokensOut: response.usage.output_tokens,
        errorMessage: null,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.aIEvaluation
      .update({
        where: { mealId },
        data: { status: EvalStatus.ERROR, errorMessage: message },
      })
      .catch(() => {
        // Row may not exist if markEvaluationPending wasn't called first —
        // nothing to record in that case.
      });
  }
}
