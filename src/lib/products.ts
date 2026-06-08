import { z } from 'zod';

/** Zod schema for the create/update product form. */
export const productInputSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  brand: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
  kcalPer100g: z.coerce.number().min(0, 'Cannot be negative').max(2000),
  proteinPer100g: z.coerce.number().min(0).max(200),
  carbsPer100g: z.coerce.number().min(0).max(200),
  fatPer100g: z.coerce.number().min(0).max(200),
  suggestedPortionGrams: z
    .union([z.literal(''), z.coerce.number().min(1).max(2000)])
    .optional()
    .transform((v) => (v === '' || v === undefined ? undefined : v)),
  // Carried through from the scan flow (Claude's pick). Not user-edited; the
  // render-time resolver re-validates against the palette, so accept any string.
  icon: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined)),
});

export type ProductInput = z.infer<typeof productInputSchema>;

/**
 * Compute macros for an arbitrary portion size in grams from a product's
 * per-100g values. Used everywhere a user logs `n` grams of something.
 */
export function macrosForGrams(
  per100g: {
    kcalPer100g: number;
    proteinPer100g: number;
    carbsPer100g: number;
    fatPer100g: number;
  },
  grams: number,
) {
  const factor = grams / 100;
  return {
    kcal: per100g.kcalPer100g * factor,
    protein: per100g.proteinPer100g * factor,
    carbs: per100g.carbsPer100g * factor,
    fat: per100g.fatPer100g * factor,
  };
}
