'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { mealEntryInputSchema, mealInputSchema, type MealEntryInput, MealType } from '@/lib/meals';

export type ActionResult = { ok: true } | { ok: false; error: string };

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');
  return session.user.id;
}

function flatFirstError(error: z.ZodError): string {
  const issue = error.issues[0];
  return issue?.message ?? 'Invalid input.';
}

/** If the entry references a library item, make sure it belongs to the user. */
async function assertOwnership(userId: string, entry: MealEntryInput) {
  if (entry.productId) {
    const p = await prisma.product.findFirst({
      where: { id: entry.productId, userId },
      select: { id: true },
    });
    if (!p) throw new Error('That product is not yours.');
  }
  if (entry.recipeId) {
    const r = await prisma.recipe.findFirst({
      where: { id: entry.recipeId, userId },
      select: { id: true },
    });
    if (!r) throw new Error('That recipe is not yours.');
  }
}

function entryDataFromInput(entry: MealEntryInput) {
  return {
    name: entry.name,
    grams: entry.grams,
    kcalPer100g: entry.kcalPer100g,
    proteinPer100g: entry.proteinPer100g,
    carbsPer100g: entry.carbsPer100g,
    fatPer100g: entry.fatPer100g,
    productId: entry.productId ?? null,
    recipeId: entry.recipeId ?? null,
  };
}

/**
 * Append an entry to today's meal of a given type. Creates the parent Meal
 * row if this is the first entry for that (user, date, type).
 */
export async function logEntry(input: unknown): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = mealInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: flatFirstError(parsed.error) };

  try {
    await assertOwnership(userId, parsed.data.entry);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Could not log.' };
  }

  const dayDate = new Date(parsed.data.date + 'T00:00:00Z');
  const existing = await prisma.meal.findFirst({
    where: { userId, date: dayDate, type: parsed.data.type },
    select: { id: true },
  });

  if (existing) {
    await prisma.mealEntry.create({
      data: { mealId: existing.id, ...entryDataFromInput(parsed.data.entry) },
    });
  } else {
    await prisma.meal.create({
      data: {
        userId,
        date: dayDate,
        type: parsed.data.type,
        entries: { create: entryDataFromInput(parsed.data.entry) },
      },
    });
  }

  revalidatePath('/today');
  return { ok: true };
}

const updateEntrySchema = z.object({
  entryId: z.string().min(1),
  grams: z.coerce.number().positive().max(10_000),
});

export async function updateEntry(input: unknown): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = updateEntrySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: flatFirstError(parsed.error) };

  const entry = await prisma.mealEntry.findUnique({
    where: { id: parsed.data.entryId },
    select: { id: true, meal: { select: { userId: true } } },
  });
  if (!entry || entry.meal.userId !== userId) {
    return { ok: false, error: 'Entry not found.' };
  }

  await prisma.mealEntry.update({
    where: { id: parsed.data.entryId },
    data: { grams: parsed.data.grams },
  });
  revalidatePath('/today');
  return { ok: true };
}

export async function deleteEntry(entryId: string): Promise<ActionResult> {
  const userId = await requireUserId();
  const entry = await prisma.mealEntry.findUnique({
    where: { id: entryId },
    select: { id: true, mealId: true, meal: { select: { userId: true } } },
  });
  if (!entry || entry.meal.userId !== userId) {
    return { ok: false, error: 'Entry not found.' };
  }

  await prisma.mealEntry.delete({ where: { id: entryId } });

  // Clean up the parent Meal if it's now empty.
  const remaining = await prisma.mealEntry.count({ where: { mealId: entry.mealId } });
  if (remaining === 0) {
    await prisma.meal.delete({ where: { id: entry.mealId } });
  }

  revalidatePath('/today');
  return { ok: true };
}

// Surfaced for the tests + UI; keeping the MealType re-exported makes imports
// short across the app.
export { MealType };
