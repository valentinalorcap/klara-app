import { z } from 'zod';
import { macrosForGrams } from './products';

/** Per-100g macros embedded on every ingredient (snapshot). */
export const ingredientMacrosSchema = z.object({
  kcalPer100g: z.coerce.number().min(0).max(2000),
  proteinPer100g: z.coerce.number().min(0).max(200),
  carbsPer100g: z.coerce.number().min(0).max(200),
  fatPer100g: z.coerce.number().min(0).max(200),
});

export type IngredientMacros = z.infer<typeof ingredientMacrosSchema>;

/** A single ingredient line in a recipe form. */
export const recipeIngredientSchema = ingredientMacrosSchema.extend({
  name: z.string().trim().min(1, 'Name is required').max(120),
  grams: z.coerce.number().positive('Must be greater than 0').max(10_000),
  /** Optional reference to a user's product, when the ingredient came from the library. */
  productId: z.string().min(1).optional(),
});

export type RecipeIngredientInput = z.infer<typeof recipeIngredientSchema>;

/** Optional weight + portion fields the user can set on a recipe. */
const optionalWeight = z
  .union([z.literal(''), z.coerce.number().positive().max(20_000)])
  .optional()
  .transform((v) => (v === '' || v === undefined ? undefined : v));

/** Form input for create/update of a Recipe. */
export const recipeInputSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  portions: z.coerce.number().int().positive('Must be at least 1').max(100),
  ingredients: z.array(recipeIngredientSchema).min(1, 'Add at least one ingredient'),
  /** Optional cooked weight — when present, overrides the ingredient sum as the denominator for per-100g macros. */
  totalGrams: optionalWeight,
  /** Optional default portion size in grams — used to seed the meal entry grams field. */
  suggestedPortionGrams: optionalWeight,
});

export type RecipeInput = z.infer<typeof recipeInputSchema>;

/** What `computeRecipeTotals` returns. */
export type RecipeTotals = {
  totalKcal: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
};

/**
 * Sum each ingredient's macros for its grams. Pure and deterministic —
 * uses the macros stored on each ingredient, no external lookup needed.
 */
export function computeRecipeTotals(ingredients: RecipeIngredientInput[]): RecipeTotals {
  return ingredients.reduce<RecipeTotals>(
    (acc, ing) => {
      const m = macrosForGrams(ing, ing.grams);
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

/**
 * The weight to divide by when computing per-100g macros. Uses the
 * user-set cooked weight if present; otherwise falls back to the sum
 * of ingredient grams.
 */
export function effectiveTotalGrams(opts: {
  totalGrams?: number | null;
  ingredientSumGrams: number;
}): number {
  return opts.totalGrams ?? opts.ingredientSumGrams;
}

/**
 * Default grams when adding this recipe to a meal entry:
 * 1) Whatever the user set as suggestedPortionGrams, or
 * 2) effectiveTotalGrams / portions.
 */
export function defaultPortionGrams(opts: {
  suggestedPortionGrams?: number | null;
  totalGrams?: number | null;
  portions: number;
  ingredientSumGrams: number;
}): number {
  if (opts.suggestedPortionGrams != null) return opts.suggestedPortionGrams;
  const total = effectiveTotalGrams(opts);
  return opts.portions > 0 ? total / opts.portions : total;
}
