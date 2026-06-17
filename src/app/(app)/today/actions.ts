'use server';

import { after } from 'next/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { createMealInputSchema, type CreateMealInput, isoDate, isDateKey } from '@/lib/meals';
import { evaluateMealById, markEvaluationPending } from '@/lib/evaluations.server';
import { generateMealName, nameFromEntries } from '@/lib/mealName.server';
import { markDayEvaluationPending, evaluateDayByDate } from '@/lib/dayEvaluation.server';
import { estimateMealFromText } from '@/lib/freeTextEstimation.server';
import type { EstimationResult } from '@/lib/freeTextEstimation';
import { loadMealFormData } from '@/app/(app)/today/_data';

export type ActionResult = { ok: true; mealId?: string } | { ok: false; error: string };

const descriptionSchema = z
  .string()
  .trim()
  .min(3, 'Describe what you ate in a bit more detail.')
  .max(800, 'Keep the description under 800 characters.');

/**
 * Ask Klara to turn a free-text meal description into structured
 * entries. Used by the inline "Describe to estimate" panel in MealForm.
 */
export async function estimateMealAction(description: unknown): Promise<EstimationResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: 'Unauthorized' };

  const parsed = descriptionSchema.safeParse(description);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  try {
    // Offer the user's library so "yogurt" resolves to their own product.
    const { items } = await loadMealFormData(session.user.id);
    const data = await estimateMealFromText(parsed.data, items);
    return { ok: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Klara could not estimate this meal.';
    return { ok: false, error: message };
  }
}

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');
  return session.user.id;
}

const suggestNameSchema = z
  .array(z.object({ name: z.string().min(1).max(200), grams: z.number().positive() }))
  .min(1)
  .max(50);

/**
 * Suggest a short meal name from a set of (not-yet-saved) entries — used to
 * name a meal the moment it's staged into the batch, before it's posted.
 */
export async function suggestMealName(entries: unknown): Promise<{ name: string }> {
  await requireUserId();
  const parsed = suggestNameSchema.safeParse(entries);
  if (!parsed.success) return { name: '' };
  return { name: await nameFromEntries(parsed.data) };
}

function flatFirstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Invalid input.';
}

const ALLOWED_REDIRECTS = ['/today', '/library', '/history'] as const;
const HISTORY_DAY_PATTERN = /^\/history\/\d{4}-\d{2}-\d{2}$/;
const TODAY_DAY_PATTERN = /^\/today\?date=\d{4}-\d{2}-\d{2}$/;

function safeReturnTo(returnTo: unknown): string {
  if (typeof returnTo !== 'string') return '/today';
  if ((ALLOWED_REDIRECTS as readonly string[]).includes(returnTo)) return returnTo;
  if (HISTORY_DAY_PATTERN.test(returnTo)) return returnTo;
  if (TODAY_DAY_PATTERN.test(returnTo)) return returnTo;
  return '/today';
}

/** Verify every productId/recipeId referenced in the entries belongs to the user. */
async function assertOwnership(userId: string, entries: CreateMealInput['entries']) {
  const productIds = Array.from(
    new Set(entries.map((e) => e.productId).filter((id): id is string => Boolean(id))),
  );
  const recipeIds = Array.from(
    new Set(entries.map((e) => e.recipeId).filter((id): id is string => Boolean(id))),
  );
  if (productIds.length > 0) {
    const owned = await prisma.product.count({
      where: { id: { in: productIds }, userId },
    });
    if (owned !== productIds.length) {
      throw new Error('One of the products is not yours.');
    }
  }
  if (recipeIds.length > 0) {
    const owned = await prisma.recipe.count({
      where: { id: { in: recipeIds }, userId },
    });
    if (owned !== recipeIds.length) {
      throw new Error('One of the recipes is not yours.');
    }
  }
}

const createMealWithSourceSchema = createMealInputSchema.extend({
  /** If the meal was seeded from a favorite template. */
  templateId: z.string().min(1).optional(),
});

/** Create a full meal — type + optional name + entries — in one shot. */
export async function createMeal(input: unknown, returnTo?: string): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = createMealWithSourceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: flatFirstError(parsed.error) };

  try {
    await assertOwnership(userId, parsed.data.entries);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Could not save.' };
  }

  if (parsed.data.templateId) {
    const t = await prisma.mealTemplate.findFirst({
      where: { id: parsed.data.templateId, userId },
      select: { id: true },
    });
    if (!t) return { ok: false, error: 'Favorite not found.' };
  }

  const dayDate = new Date(parsed.data.date + 'T00:00:00Z');
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { defaultEvalTone: true },
  });
  const meal = await prisma.meal.create({
    data: {
      userId,
      date: dayDate,
      type: parsed.data.type,
      name: parsed.data.name ?? null,
      templateId: parsed.data.templateId ?? null,
      entries: {
        create: parsed.data.entries.map((e) => ({
          name: e.name,
          grams: e.grams,
          kcalPer100g: e.kcalPer100g,
          proteinPer100g: e.proteinPer100g,
          carbsPer100g: e.carbsPer100g,
          fatPer100g: e.fatPer100g,
          productId: e.productId ?? null,
          recipeId: e.recipeId ?? null,
        })),
      },
    },
  });
  if (user) {
    await markEvaluationPending(meal.id, user.defaultEvalTone, userId);
    after(async () => {
      await generateMealName(meal.id);
      await evaluateMealById(meal.id);
      revalidatePath('/today');
    });
  }
  revalidatePath('/today');
  redirect(safeReturnTo(returnTo));
}

/** Replace a meal's metadata + entries atomically. */
export async function updateMeal(
  mealId: string,
  input: unknown,
  returnTo?: string,
): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = createMealInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: flatFirstError(parsed.error) };

  const existing = await prisma.meal.findFirst({
    where: { id: mealId, userId },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: 'Meal not found.' };

  try {
    await assertOwnership(userId, parsed.data.entries);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Could not save.' };
  }

  const dayDate = new Date(parsed.data.date + 'T00:00:00Z');
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { defaultEvalTone: true },
  });
  await prisma.$transaction([
    prisma.mealEntry.deleteMany({ where: { mealId } }),
    prisma.meal.update({
      where: { id: mealId },
      data: {
        date: dayDate,
        type: parsed.data.type,
        name: parsed.data.name ?? null,
        entries: {
          create: parsed.data.entries.map((e) => ({
            name: e.name,
            grams: e.grams,
            kcalPer100g: e.kcalPer100g,
            proteinPer100g: e.proteinPer100g,
            carbsPer100g: e.carbsPer100g,
            fatPer100g: e.fatPer100g,
            productId: e.productId ?? null,
            recipeId: e.recipeId ?? null,
          })),
        },
      },
    }),
  ]);
  if (user) {
    await markEvaluationPending(mealId, user.defaultEvalTone, userId);
    after(async () => {
      await generateMealName(mealId);
      await evaluateMealById(mealId);
      revalidatePath('/today');
    });
  }
  revalidatePath('/today');
  revalidatePath('/library');
  redirect(safeReturnTo(returnTo));
}

const createMealBatchSchema = z.object({
  meals: z.array(createMealInputSchema).min(1).max(8),
});

/**
 * Create N meals logged in one session. Every meal in the batch shares
 * the same opaque `batchId`; only the last meal carries the AIEvaluation,
 * whose prompt sees the rest of the batch as context.
 */
export async function createMealBatch(input: unknown, returnTo?: string): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = createMealBatchSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: flatFirstError(parsed.error) };

  for (const meal of parsed.data.meals) {
    try {
      await assertOwnership(userId, meal.entries);
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Could not save.' };
    }
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { defaultEvalTone: true },
  });

  const batchId = crypto.randomUUID();
  const created = await prisma.$transaction(
    parsed.data.meals.map((m) =>
      prisma.meal.create({
        data: {
          userId,
          batchId,
          date: new Date(m.date + 'T00:00:00Z'),
          type: m.type,
          name: m.name ?? null,
          entries: {
            create: m.entries.map((e) => ({
              name: e.name,
              grams: e.grams,
              kcalPer100g: e.kcalPer100g,
              proteinPer100g: e.proteinPer100g,
              carbsPer100g: e.carbsPer100g,
              fatPer100g: e.fatPer100g,
              productId: e.productId ?? null,
              recipeId: e.recipeId ?? null,
            })),
          },
        },
      }),
    ),
  );

  const lastMeal = created[created.length - 1];
  if (user && lastMeal) {
    await markEvaluationPending(lastMeal.id, user.defaultEvalTone, userId);
    after(async () => {
      // Name every meal in the batch; evaluate only the last (it sees the rest).
      for (const m of created) await generateMealName(m.id);
      await evaluateMealById(lastMeal.id);
      revalidatePath('/today');
    });
  }

  revalidatePath('/today');
  redirect(safeReturnTo(returnTo));
}

/**
 * Replace today with the meals logged on `sourceDateKey`: clears today's
 * meals, then copies the source day in as fresh logs (new snapshots, not
 * favorites). Used by "Copy this day to today" when viewing a past day.
 */
export async function copyDayToToday(sourceDateKey: unknown): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!isDateKey(sourceDateKey)) return { ok: false, error: 'Invalid date.' };

  const todayKey = isoDate(new Date());
  if (sourceDateKey === todayKey) return { ok: false, error: "That's already today." };

  const meals = await prisma.meal.findMany({
    where: { userId, date: new Date(sourceDateKey + 'T00:00:00Z') },
    include: { entries: true },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });
  if (meals.length === 0) return { ok: false, error: 'No meals to copy from that day.' };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { defaultEvalTone: true },
  });

  const todayDate = new Date(todayKey + 'T00:00:00Z');
  const batchId = crypto.randomUUID();
  // "Copy day" REPLACES today: wipe whatever is logged today, then copy the
  // source day in — atomically, so a failure can't leave today half-cleared.
  const lastMeal = await prisma.$transaction(async (tx) => {
    await tx.meal.deleteMany({ where: { userId, date: todayDate } });
    let last: { id: string } | null = null;
    for (const m of meals) {
      last = await tx.meal.create({
        data: {
          userId,
          batchId,
          date: todayDate,
          type: m.type,
          name: m.name,
          entries: {
            create: m.entries.map((e) => ({
              name: e.name,
              grams: e.grams,
              kcalPer100g: e.kcalPer100g,
              proteinPer100g: e.proteinPer100g,
              carbsPer100g: e.carbsPer100g,
              fatPer100g: e.fatPer100g,
              productId: e.productId,
              recipeId: e.recipeId,
            })),
          },
        },
        select: { id: true },
      });
    }
    return last;
  });

  if (user && lastMeal) {
    await markEvaluationPending(lastMeal.id, user.defaultEvalTone, userId);
    after(async () => {
      await evaluateMealById(lastMeal.id);
      revalidatePath('/today');
    });
  }

  revalidatePath('/today');
  redirect('/today');
}

/**
 * "Finish day" — the user closes a day so Klara reviews the whole thing.
 * Queues a day-level evaluation (Sonnet) generated in the background. Safe to
 * re-run: it overwrites the existing review (e.g. after adding a meal). Works
 * for today or any past day.
 */
export async function finishDay(dateKey: unknown): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!isDateKey(dateKey)) return { ok: false, error: 'Invalid date.' };

  const date = new Date(dateKey + 'T00:00:00Z');
  const mealCount = await prisma.meal.count({ where: { userId, date } });
  if (mealCount === 0) return { ok: false, error: 'Log a meal before finishing the day.' };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { defaultEvalTone: true },
  });
  if (!user) return { ok: false, error: 'User not found.' };

  await markDayEvaluationPending(userId, dateKey, user.defaultEvalTone);
  after(async () => {
    await evaluateDayByDate(userId, dateKey);
    revalidatePath('/today');
  });
  revalidatePath('/today');
  return { ok: true };
}

/** Re-trigger the evaluation for a meal — used by the UI retry button. */
export async function retryEvaluation(mealId: string): Promise<ActionResult> {
  const userId = await requireUserId();
  const meal = await prisma.meal.findFirst({
    where: { id: mealId, userId },
    select: { id: true, userId: true },
  });
  if (!meal) return { ok: false, error: 'Meal not found.' };
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { defaultEvalTone: true },
  });
  if (!user) return { ok: false, error: 'User not found.' };
  await markEvaluationPending(mealId, user.defaultEvalTone, userId);
  after(async () => {
    await evaluateMealById(mealId);
    revalidatePath('/today');
  });
  revalidatePath('/today');
  return { ok: true };
}

/**
 * Star or unstar a meal. Stars are independent `MealTemplate` rows, so
 * trashing the meal later doesn't touch the saved favorite.
 */
export async function toggleFavorite(mealId: string): Promise<ActionResult> {
  const userId = await requireUserId();
  const meal = await prisma.meal.findFirst({
    where: { id: mealId, userId },
    include: { entries: true },
  });
  if (!meal) return { ok: false, error: 'Meal not found.' };

  if (meal.templateId) {
    // Unstar — delete the template. The FK on Meal.templateId is SetNull.
    await prisma.mealTemplate.delete({ where: { id: meal.templateId } });
  } else {
    // Star — clone the entries into a new template and link the meal to it.
    const template = await prisma.mealTemplate.create({
      data: {
        userId,
        type: meal.type,
        name: meal.name,
        entries: {
          create: meal.entries.map((e) => ({
            name: e.name,
            grams: e.grams,
            kcalPer100g: e.kcalPer100g,
            proteinPer100g: e.proteinPer100g,
            carbsPer100g: e.carbsPer100g,
            fatPer100g: e.fatPer100g,
            productId: e.productId,
            recipeId: e.recipeId,
          })),
        },
      },
    });
    await prisma.meal.update({
      where: { id: mealId },
      data: { templateId: template.id },
    });
  }
  revalidatePath('/today');
  revalidatePath('/library');
  return { ok: true };
}

/** Remove a favorite template directly (used from the Library). */
export async function removeFavorite(templateId: string): Promise<ActionResult> {
  const userId = await requireUserId();
  const template = await prisma.mealTemplate.findFirst({
    where: { id: templateId, userId },
    select: { id: true },
  });
  if (!template) return { ok: false, error: 'Favorite not found.' };
  await prisma.mealTemplate.delete({ where: { id: templateId } });
  revalidatePath('/today');
  revalidatePath('/library');
  return { ok: true };
}

/** Trash the meal log only — favorites (`MealTemplate`) are not touched. */
export async function deleteMeal(mealId: string): Promise<ActionResult> {
  const userId = await requireUserId();
  const meal = await prisma.meal.findFirst({
    where: { id: mealId, userId },
    select: { id: true },
  });
  if (!meal) return { ok: false, error: 'Meal not found.' };
  await prisma.meal.delete({ where: { id: mealId } });
  revalidatePath('/today');
  return { ok: true };
}
