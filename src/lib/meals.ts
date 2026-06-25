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

/** True for a well-formed `YYYY-MM-DD` day key. */
export function isDateKey(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/**
 * Shift a `YYYY-MM-DD` key by `days`, in UTC so it never drifts across DST.
 * Day keys are calendar dates, so all math is done at UTC midnight.
 */
export function shiftDay(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

type EntryForMatch = { productId: string | null; recipeId: string | null; name: string; grams: number };

/**
 * Returns true only when the meal's entries are an exact match for the
 * template's entries — same ingredients (by productId/recipeId, or name for
 * custom entries) and same grams (to 1 decimal). Used to decide whether to
 * show the star on a meal card.
 */
export function mealMatchesTemplate(
  mealEntries: EntryForMatch[],
  templateEntries: EntryForMatch[],
): boolean {
  if (mealEntries.length !== templateEntries.length) return false;
  const round = (g: number) => Math.round(g * 10) / 10;
  for (const me of mealEntries) {
    const found = templateEntries.some((te) => {
      if (me.productId && te.productId) return me.productId === te.productId && round(me.grams) === round(te.grams);
      if (me.recipeId && te.recipeId) return me.recipeId === te.recipeId && round(me.grams) === round(te.grams);
      return me.name === te.name && round(me.grams) === round(te.grams);
    });
    if (!found) return false;
  }
  return true;
}

/** Human label for a day key, e.g. "Friday, June 12" (parsed in UTC). */
export function formatDayLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const weekday = WEEKDAY_NAMES[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${weekday}, ${MONTH_NAMES[m - 1]} ${d}`;
}

/** Split day-key parts for a two-line header: weekday + "Month D". */
export function formatDayParts(dateKey: string): { weekday: string; monthDay: string } {
  const [y, m, d] = dateKey.split('-').map(Number);
  const weekday = WEEKDAY_NAMES[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return { weekday, monthDay: `${MONTH_NAMES[m - 1]} ${d}` };
}
