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
      // schema will reject as not-an-array
    }
  }
  return recipeInputSchema.safeParse({
    name: formData.get('name'),
    portions: formData.get('portions'),
    ingredients,
  });
}

/**
 * Fetch the user's products referenced by `ingredients`, verify ownership,
 * and return them keyed by id. Throws if any ingredient points to a product
 * the user does not own.
 */
async function loadOwnedProducts(userId: string, ingredients: RecipeIngredientInput[]) {
  const ids = Array.from(new Set(ingredients.map((i) => i.productId)));
  const products = await prisma.product.findMany({
    where: { id: { in: ids }, userId },
    select: {
      id: true,
      kcalPer100g: true,
      proteinPer100g: true,
      carbsPer100g: true,
      fatPer100g: true,
    },
  });
  if (products.length !== ids.length) {
    throw new Error('One of the ingredients refers to a product that is not yours.');
  }
  return Object.fromEntries(products.map((p) => [p.id, p]));
}

function buildRecipeData(input: RecipeInput, totals: ReturnType<typeof computeRecipeTotals>) {
  return {
    name: input.name,
    portions: input.portions,
    totalKcal: totals.totalKcal,
    totalProtein: totals.totalProtein,
    totalCarbs: totals.totalCarbs,
    totalFat: totals.totalFat,
  };
}

export async function createRecipe(
  _prev: RecipeFormState,
  formData: FormData,
): Promise<RecipeFormState> {
  const userId = await requireUserId();
  const parsed = parseForm(formData);
  if (!parsed.success) return { fieldErrors: flattenFieldErrors(parsed.error) };

  let productsById;
  try {
    productsById = await loadOwnedProducts(userId, parsed.data.ingredients);
  } catch (err) {
    return { formError: err instanceof Error ? err.message : 'Could not save the recipe.' };
  }
  const totals = computeRecipeTotals(parsed.data.ingredients, productsById);

  await prisma.recipe.create({
    data: {
      userId,
      ...buildRecipeData(parsed.data, totals),
      ingredients: {
        create: parsed.data.ingredients.map((ing) => ({
          productId: ing.productId,
          grams: ing.grams,
        })),
      },
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

  let productsById;
  try {
    productsById = await loadOwnedProducts(userId, parsed.data.ingredients);
  } catch (err) {
    return { formError: err instanceof Error ? err.message : 'Could not save the recipe.' };
  }
  const totals = computeRecipeTotals(parsed.data.ingredients, productsById);

  await prisma.$transaction([
    prisma.recipeIngredient.deleteMany({ where: { recipeId } }),
    prisma.recipe.update({
      where: { id: recipeId },
      data: {
        ...buildRecipeData(parsed.data, totals),
        ingredients: {
          create: parsed.data.ingredients.map((ing) => ({
            productId: ing.productId,
            grams: ing.grams,
          })),
        },
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
