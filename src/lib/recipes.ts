import { z } from 'zod';
import { macrosForGrams } from './products';

/** A single line in a recipe: a product reference + how many grams of it. */
export const recipeIngredientSchema = z.object({
  productId: z.string().min(1, 'Pick a product'),
  grams: z.coerce.number().positive('Must be greater than 0').max(10_000),
});

export type RecipeIngredientInput = z.infer<typeof recipeIngredientSchema>;

/** Form input for create/update of a Recipe. */
export const recipeInputSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  portions: z.coerce.number().int().positive('Must be at least 1').max(100),
  ingredients: z.array(recipeIngredientSchema).min(1, 'Add at least one ingredient'),
});

export type RecipeInput = z.infer<typeof recipeInputSchema>;

/** Per-100g macros for a product — the only fields the calculator needs. */
export type ProductMacros = {
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
};

/** What `computeRecipeTotals` returns. */
export type RecipeTotals = {
  totalKcal: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
};

/**
 * Sum each ingredient's macros for its grams. Pure and deterministic.
 * If a product is missing from `productsById` (e.g. it was deleted), that
 * ingredient contributes zero — the recipe still resolves to a number.
 */
export function computeRecipeTotals(
  ingredients: RecipeIngredientInput[],
  productsById: Record<string, ProductMacros>,
): RecipeTotals {
  return ingredients.reduce<RecipeTotals>(
    (acc, ing) => {
      const product = productsById[ing.productId];
      if (!product) return acc;
      const m = macrosForGrams(product, ing.grams);
      acc.totalKcal += m.kcal;
      acc.totalProtein += m.protein;
      acc.totalCarbs += m.carbs;
      acc.totalFat += m.fat;
      return acc;
    },
    { totalKcal: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 },
  );
}

/** Divide each total by `portions` to get per-portion values. */
export function perPortion(totals: RecipeTotals, portions: number) {
  const p = portions > 0 ? portions : 1;
  return {
    kcal: totals.totalKcal / p,
    protein: totals.totalProtein / p,
    carbs: totals.totalCarbs / p,
    fat: totals.totalFat / p,
  };
}
