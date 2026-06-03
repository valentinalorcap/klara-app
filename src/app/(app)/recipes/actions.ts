'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import {
  recipeInputSchema,
  computeRecipeTotals,
  type RecipeInput,
  type RecipeIngredientInput,
} from '@/lib/recipes';

type FieldErrors = Partial<Record<'name' | 'portions' | 'ingredients', string>>;

export type RecipeFormState = {
  fieldErrors?: FieldErrors;
  formError?: string;
};

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');
  return session.user.id;
}

function flattenFieldErrors(error: z.ZodError): FieldErrors {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === 'string' && !(key in out)) out[key] = issue.message;
  }
  return out as FieldErrors;
}

function parseForm(formData: FormData) {
  const rawIngredients = formData.get('ingredients');
  let ingredients: unknown = [];
  if (typeof rawIngredients === 'string' && rawIngredients.length > 0) {
    try {
      ingredients = JSON.parse(rawIngredients);
    } catch {
      // schema will reject
    }
  }
  return recipeInputSchema.safeParse({
    name: formData.get('name'),
    portions: formData.get('portions'),
    ingredients,
  });
}

/**
 * If any ingredient claims to come from the library, make sure the productId
 * actually belongs to this user. Macros themselves are trusted (snapshot).
 */
async function assertLibraryRefsBelongToUser(userId: string, ingredients: RecipeIngredientInput[]) {
  const ids = ingredients.map((i) => i.productId).filter((id): id is string => Boolean(id));
  if (ids.length === 0) return;
  const owned = await prisma.product.count({
    where: { id: { in: ids }, userId },
  });
  if (owned !== new Set(ids).size) {
    throw new Error('One of the ingredients refers to a product that is not yours.');
  }
}

function buildRecipeData(input: RecipeInput) {
  const totals = computeRecipeTotals(input.ingredients);
  return {
    name: input.name,
    portions: input.portions,
    totalKcal: totals.totalKcal,
    totalProtein: totals.totalProtein,
    totalCarbs: totals.totalCarbs,
    totalFat: totals.totalFat,
  };
}

function ingredientCreates(ingredients: RecipeIngredientInput[]) {
  return ingredients.map((ing) => ({
    name: ing.name,
    grams: ing.grams,
    productId: ing.productId ?? null,
    kcalPer100g: ing.kcalPer100g,
    proteinPer100g: ing.proteinPer100g,
    carbsPer100g: ing.carbsPer100g,
    fatPer100g: ing.fatPer100g,
  }));
}

export async function createRecipe(
  _prev: RecipeFormState,
  formData: FormData,
): Promise<RecipeFormState> {
  const userId = await requireUserId();
  const parsed = parseForm(formData);
  if (!parsed.success) return { fieldErrors: flattenFieldErrors(parsed.error) };

  try {
    await assertLibraryRefsBelongToUser(userId, parsed.data.ingredients);
  } catch (err) {
    return { formError: err instanceof Error ? err.message : 'Could not save the recipe.' };
  }

  await prisma.recipe.create({
    data: {
      userId,
      ...buildRecipeData(parsed.data),
      ingredients: { create: ingredientCreates(parsed.data.ingredients) },
    },
  });
  revalidatePath('/recipes');
  redirect('/recipes');
}

export async function updateRecipe(
  recipeId: string,
  _prev: RecipeFormState,
  formData: FormData,
): Promise<RecipeFormState> {
  const userId = await requireUserId();
  const parsed = parseForm(formData);
  if (!parsed.success) return { fieldErrors: flattenFieldErrors(parsed.error) };

  const existing = await prisma.recipe.findUnique({ where: { id: recipeId } });
  if (!existing || existing.userId !== userId) {
    return { formError: 'Recipe not found.' };
  }

  try {
    await assertLibraryRefsBelongToUser(userId, parsed.data.ingredients);
  } catch (err) {
    return { formError: err instanceof Error ? err.message : 'Could not save the recipe.' };
  }

  await prisma.$transaction([
    prisma.recipeIngredient.deleteMany({ where: { recipeId } }),
    prisma.recipe.update({
      where: { id: recipeId },
      data: {
        ...buildRecipeData(parsed.data),
        ingredients: { create: ingredientCreates(parsed.data.ingredients) },
      },
    }),
  ]);
  revalidatePath('/recipes');
  redirect('/recipes');
}

export async function deleteRecipe(recipeId: string) {
  const userId = await requireUserId();
  const existing = await prisma.recipe.findUnique({ where: { id: recipeId } });
  if (!existing || existing.userId !== userId) return;
  await prisma.recipe.delete({ where: { id: recipeId } });
  revalidatePath('/recipes');
  redirect('/recipes');
}
