'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { createMealInputSchema, type CreateMealInput } from '@/lib/meals';

export type ActionResult = { ok: true; mealId?: string } | { ok: false; error: string };

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');
  return session.user.id;
}

function flatFirstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Invalid input.';
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

/** Create a full meal — type + optional name + entries — in one shot. */
export async function createMeal(input: unknown): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = createMealInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: flatFirstError(parsed.error) };

  try {
    await assertOwnership(userId, parsed.data.entries);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Could not save.' };
  }

  const dayDate = new Date(parsed.data.date + 'T00:00:00Z');
  const meal = await prisma.meal.create({
    data: {
      userId,
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
  });
  revalidatePath('/today');
  redirect('/today');
  return { ok: true, mealId: meal.id };
}

export async function toggleFavorite(mealId: string): Promise<ActionResult> {
  const userId = await requireUserId();
  const meal = await prisma.meal.findFirst({
    where: { id: mealId, userId },
    select: { id: true, isFavorite: true },
  });
  if (!meal) return { ok: false, error: 'Meal not found.' };
  await prisma.meal.update({
    where: { id: mealId },
    data: { isFavorite: !meal.isFavorite },
  });
  revalidatePath('/today');
  revalidatePath('/library');
  return { ok: true };
}

export async function deleteMeal(mealId: string): Promise<ActionResult> {
  const userId = await requireUserId();
  const meal = await prisma.meal.findFirst({
    where: { id: mealId, userId },
    select: { id: true },
  });
  if (!meal) return { ok: false, error: 'Meal not found.' };
  await prisma.meal.delete({ where: { id: mealId } });
  revalidatePath('/today');
  revalidatePath('/library');
  return { ok: true };
}
