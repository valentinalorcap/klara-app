import type Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

/** Shape Claude returns when asked about a generic food. */
export const ingredientLookupSchema = z.object({
  canonicalName: z.string().trim().optional(),
  kcalPer100g: z.number().min(0).max(2000),
  proteinPer100g: z.number().min(0).max(200),
  carbsPer100g: z.number().min(0).max(200),
  fatPer100g: z.number().min(0).max(200),
  /**
   * Only set when the user implied a count or quantity (e.g. "2 bananas",
   * "1 egg", "3 slices of bread", "half an avocado"). Lets the form
   * auto-fill the grams field.
   */
  estimatedGrams: z.number().min(1).max(5000).optional(),
});

export type IngredientLookup = z.infer<typeof ingredientLookupSchema>;

export const ingredientLookupTool: Anthropic.Tool = {
  name: 'save_ingredient_macros',
  description: 'Save typical per-100g/100ml macros for a generic food name.',
  input_schema: {
    type: 'object',
    properties: {
      canonicalName: {
        type: 'string',
        description: 'A cleaner version of the food name (e.g. "Avena" → "Oats").',
      },
      kcalPer100g: { type: 'number', description: 'Calories per 100g/ml.' },
      proteinPer100g: { type: 'number', description: 'Protein in grams per 100g/ml.' },
      carbsPer100g: { type: 'number', description: 'Total carbohydrates in grams per 100g/ml.' },
      fatPer100g: { type: 'number', description: 'Total fat in grams per 100g/ml.' },
      estimatedGrams: {
        type: 'number',
        description:
          'Estimated total grams when the user implied a count or quantity (e.g. "2 medium bananas" → ~240, "1 egg" → ~50, "3 slices of bread" → ~90, "half an avocado" → ~100). Skip this field if the user just named the food without a quantity.',
      },
    },
    required: ['kcalPer100g', 'proteinPer100g', 'carbsPer100g', 'fatPer100g'],
  },
};

export const INGREDIENT_LOOKUP_SYSTEM = `You are a nutrition assistant. The user will name a food, sometimes with a
count or quantity (e.g. "avena", "1 egg", "2 medium bananas", "3 slices of
whole wheat bread", "half an avocado").

Extract three things:

1. **canonicalName** — the base food in clean form (e.g. "Banana", "Egg",
   "Whole wheat bread"). Don't include the count or size in the name.
2. **Per-100g macros** (or per-100ml for liquids). Use widely accepted
   averages from standard nutrition databases (USDA, etc.). Round to
   one decimal place.
3. **estimatedGrams** — ONLY when the user implied a count or quantity.
   Use these standard reference weights and multiply by the count:

   Bananas:    small ~100g    medium ~120g    large ~140g    (default: medium)
   Eggs:       small ~45g     medium ~50g     large ~55g     (default: large = 55g)
   Bread:      thin slice ~25g  regular slice ~30g  thick ~40g
   Avocado:    half ~100g    whole ~200g
   Apple:      small ~150g    medium ~180g    large ~220g
   Orange:     small ~130g    medium ~160g    large ~200g
   Tomato:     cherry ~10g    regular ~120g    large ~180g
   Potato:     small ~100g    medium ~170g    large ~300g
   Egg whites: ~30g each

   For other foods or units not listed (cups, tablespoons, etc.), use
   standard USDA reference values.

   If the user just named the food without a count or unit, OMIT this
   field — don't guess a default amount.

Be consistent: the same input string should always give the same numeric
output. Use the save_ingredient_macros tool to return the result. If the
input is not a recognizable food, omit the tool call.`;
