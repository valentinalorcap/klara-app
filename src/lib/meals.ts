import { z } from 'zod';
import { MealType } from '@prisma/client';
import { ingredientMacrosSchema, type IngredientMacros } from './recipes';
import { macrosForGrams } from './products';

export { MealType };

/** Human-readable label per meal type — kept here so the UI doesn't hard-code. */
export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  BREAKFAST: 'Breakfast',
  LUNCH: 'Lunch',
  DINNER: 'Dinner',
  SNACK: 'Snack',
  PREWORKOUT: 'Pre-workout',
  OTHER: 'Other',
};

/** Display order for the Today screen. */
export const MEAL_TYPE_ORDER: MealType[] = [
  MealType.BREAKFAST,
  MealType.PREWORKOUT,
  MealType.LUNCH,
  MealType.SNACK,
  MealType.DINNER,
  MealType.OTHER,
];

/** Per-meal-entry input — used by both the form and the server action. */
export const mealEntryInputSchema = ingredientMacrosSchema.extend({
  name: z.string().trim().min(1, 'Name is required').max(120),
  grams: z.coerce.number().positive('Must be greater than 0').max(10_000),
  productId: z.string().min(1).optional(),
  recipeId: z.string().min(1).optional(),
});

export type MealEntryInput = z.infer<typeof mealEntryInputSchema>;

/** Input for creating or appending to a meal. */
export const mealInputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Bad date'),
  type: z.nativeEnum(MealType),
  entry: mealEntryInputSchema,
});

export type MealInput = z.infer<typeof mealInputSchema>;

/** Compute the macros contributed by an entry given its per-100g snapshot. */
export function entryMacros(entry: IngredientMacros & { grams: number }) {
  return macrosForGrams(entry, entry.grams);
}

export type Totals = { kcal: number; protein: number; carbs: number; fat: number };

const ZERO: Totals = { kcal: 0, protein: 0, carbs: 0, fat: 0 };

/** Sum the macros of any iterable of entries (or rows with that shape). */
export function sumEntries(entries: ReadonlyArray<IngredientMacros & { grams: number }>): Totals {
  return entries.reduce<Totals>(
    (acc, e) => {
      const m = entryMacros(e);
      return {
        kcal: acc.kcal + m.kcal,
        protein: acc.protein + m.protein,
        carbs: acc.carbs + m.carbs,
        fat: acc.fat + m.fat,
      };
    },
    { ...ZERO },
  );
}

/** Per-100g macros derived from a Recipe's totals + the sum of ingredient grams. */
export function recipePer100g(
  recipe: {
    totalKcal: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
  },
  totalGrams: number,
): IngredientMacros {
  if (totalGrams <= 0) {
    return { kcalPer100g: 0, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 0 };
  }
  const f = 100 / totalGrams;
  return {
    kcalPer100g: recipe.totalKcal * f,
    proteinPer100g: recipe.totalProtein * f,
    carbsPer100g: recipe.totalCarbs * f,
    fatPer100g: recipe.totalFat * f,
  };
}

/** Format a Date as `YYYY-MM-DD` in local time — the canonical day key. */
export function isoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
