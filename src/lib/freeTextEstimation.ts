import type Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { MealType } from '@prisma/client';

/** Shape Claude returns when asked to estimate a free-text meal. */
export const estimationEntrySchema = z.object({
  name: z.string().trim().min(1).max(120),
  grams: z.number().positive().max(10_000),
  kcalPer100g: z.number().min(0).max(2000),
  proteinPer100g: z.number().min(0).max(200),
  carbsPer100g: z.number().min(0).max(200),
  fatPer100g: z.number().min(0).max(200),
});

export const estimationResponseSchema = z.object({
  entries: z.array(estimationEntrySchema).min(1).max(20),
  suggestedType: z.nativeEnum(MealType).optional(),
  suggestedName: z.string().trim().max(80).optional(),
});

export type EstimationEntry = z.infer<typeof estimationEntrySchema>;
export type EstimationResponse = z.infer<typeof estimationResponseSchema>;

/** Tool the model must call with its structured estimate. */
export const estimateMealTool: Anthropic.Tool = {
  name: 'save_meal_estimate',
  description:
    'Save a structured estimate of the foods, portions, and per-100g macros parsed from a free-text meal description.',
  input_schema: {
    type: 'object',
    properties: {
      entries: {
        type: 'array',
        description:
          'One entry per identifiable food item. Combine condiments into their main dish if they share a portion (e.g. "nachos con guacamole" → one nachos entry includes the guacamole grams).',
        items: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description:
                'A clean, short name for the food (e.g. "Nachos with guacamole", "Trufa cheese slice", "Kinder Huevito"). Match the language of the user input when possible.',
            },
            grams: {
              type: 'number',
              description:
                'Estimated total grams for this entry. Use widely accepted reference weights and multiply by the count or fraction the user implied. Be conservative.',
            },
            kcalPer100g: { type: 'number' },
            proteinPer100g: { type: 'number' },
            carbsPer100g: { type: 'number' },
            fatPer100g: { type: 'number' },
          },
          required: [
            'name',
            'grams',
            'kcalPer100g',
            'proteinPer100g',
            'carbsPer100g',
            'fatPer100g',
          ],
        },
      },
      suggestedType: {
        type: 'string',
        enum: Object.values(MealType),
        description:
          'Best guess for the meal slot — BREAKFAST, LUNCH, DINNER, SNACK, PREWORKOUT, or OTHER. Use OTHER for ambiguous cases like a social event or dessert.',
      },
      suggestedName: {
        type: 'string',
        description:
          'A short label the user could keep (e.g. "Cumpleaños de Mariana", "Cena fuera"). Skip if there is no clear hint.',
      },
    },
    required: ['entries'],
  },
};

/**
 * System prompt for the estimator. Stable per call so it can be cached
 * on the Anthropic side.
 */
export const FREE_TEXT_ESTIMATION_SYSTEM = `You are Klara's free-text meal estimator. The user describes a meal in
prose — sometimes a single dish, sometimes a list of items at a social
event ("3 tacos al pastor, 1 cerveza y dos trozos de pastel"). Your job
is to convert that prose into a structured list of entries with grams
and per-100g macros so the app can store the meal.

Rules:

1. **One entry per identifiable food**, not per ingredient. "Nachos con
   guacamole" is ONE entry whose grams cover the chips + the dip.
2. **Estimate grams conservatively** using standard reference weights:
   - Taco (medium): ~120g per piece
   - Slice of pizza: ~120g
   - Cookie / galleta: ~25g
   - Beer (lager, 355ml can): ~355g
   - Glass of wine: ~150g
   - Slice of cake / trozo de tarta: ~120g
   - Kinder Huevo / individual chocolate: ~20g
   - Tortilla chip handful / puñado de nachos: ~30g
   - Cheese slice: ~20g
   - Half avocado: ~100g
   When the user says "20 nachos" or "3 tacos", multiply the unit weight
   by the count.
3. **Per-100g macros** come from standard databases (USDA-equivalent).
   Round to one decimal place.
4. **Same input → same output.** Be deterministic.
5. If the user mentions a meal context ("desayuno", "cena", "after the
   gym"), set suggestedType accordingly. Otherwise OTHER.
6. Skip suggestedName unless the user clearly named the meal ("cena en
   casa de Mario", "snack del trabajo").
7. **Call the save_meal_estimate tool**. Do not write any prose.
8. If the input is not a recognizable food description, omit the tool
   call.`;

/** What the action returns to the UI. */
export type EstimationResult =
  | { ok: true; data: EstimationResponse }
  | { ok: false; error: string };
