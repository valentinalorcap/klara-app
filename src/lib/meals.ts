import { z } from 'zod';
import { MealType } from '@prisma/client';
import { ingredientMacrosSchema, type IngredientMacros } from './recipes';
import { macrosForGrams } from './products';

export { MealType };

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  BREAKFAST: 'Breakfast',
  PREWORKOUT: 'Pre-workout',
  LUNCH: 'Lunch',
  SNACK: 'Snack',
  DINNER: 'Dinner',
  OTHER: 'Other',
};

export const MEAL_TYPE_OPTIONS: { value: MealType; label: string }[] = [
  { value: MealType.BREAKFAST, label: 'Breakfast' },
  { value: MealType.PREWORKOUT, label: 'Pre-workout' },
  { value: MealType.LUNCH, label: 'Lunch' },
  { value: MealType.SNACK, label: 'Snack' },
  { value: MealType.DINNER, label: 'Dinner' },
  { value: MealType.OTHER, label: 'Other' },
];

/** One ingredient line inside a meal — same shape as a recipe ingredient. */
export const mealEntryInputSchema = ingredientMacrosSchema.extend({
  name: z.string().trim().min(1, 'Name is required').max(120),
  grams: z.coerce.number().positive('Must be greater than 0').max(10_000),
  productId: z.string().min(1).optional(),
  recipeId: z.string().min(1).optional(),
});

export type MealEntryInput = z.infer<typeof mealEntryInputSchema>;

/** Full meal input — the form sends the whole meal at once, not entry by entry. */
export const createMealInputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Bad date'),
  type: z.nativeEnum(MealType),
  name: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => (v === '' || v === undefined ? undefined : v)),
  entries: z.array(mealEntryInputSchema).min(1, 'Add at least one ingredient'),
});

export type CreateMealInput = z.infer<typeof createMealInputSchema>;

/** Macros contributed by one entry (per-100g × grams/100). */
export function entryMacros(entry: IngredientMacros & { grams: number }) {
  return macrosForGrams(entry, entry.grams);
}

export type Totals = { kcal: number; protein: number; carbs: number; fat: number };

const ZERO: Totals = { kcal: 0, protein: 0, carbs: 0, fat: 0 };

/** Sum entries' macros. Accepts anything with per-100g + grams. */
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

/**
 * Format a Date as `YYYY-MM-DD` in **local** time. Used to derive the
 * "today" key for a meal log from `new Date()`, where the user's local
 * day matters. Do NOT pass a `meal.date` field through this — those are
 * stored as UTC midnight of the user's day, and reading them with local
 * getters silently rolls back to the previous day for any user west of
 * UTC. Query meal rows by `meal.date` directly instead.
 */
export function isoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
