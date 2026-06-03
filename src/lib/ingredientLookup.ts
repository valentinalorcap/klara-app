import type Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

/** Shape Claude returns when asked about a generic food. */
export const ingredientLookupSchema = z.object({
  canonicalName: z.string().trim().optional(),
  kcalPer100g: z.number().min(0).max(2000),
  proteinPer100g: z.number().min(0).max(200),
  carbsPer100g: z.number().min(0).max(200),
  fatPer100g: z.number().min(0).max(200),
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
    },
    required: ['kcalPer100g', 'proteinPer100g', 'carbsPer100g', 'fatPer100g'],
  },
};

export const INGREDIENT_LOOKUP_SYSTEM = `You are a nutrition assistant. The user will name a generic food
(e.g. "avena", "oats", "banana", "egg white"). Return your best estimate of typical
macros per 100g (or per 100ml for liquids). Use widely accepted averages — these
values will be used in a personal recipe, not for medical decisions.

Round to one decimal place. Use the save_ingredient_macros tool to return the result.
If the input is not a recognizable food, omit the tool call.`;
