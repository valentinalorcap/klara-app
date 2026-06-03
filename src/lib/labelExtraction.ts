import type Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

/** Shape the AI returns after reading a nutrition label. */
export const extractedLabelSchema = z.object({
  name: z.string().trim().optional(),
  brand: z.string().trim().optional(),
  kcalPer100g: z.number().min(0).max(2000),
  proteinPer100g: z.number().min(0).max(200),
  carbsPer100g: z.number().min(0).max(200),
  fatPer100g: z.number().min(0).max(200),
  suggestedPortionGrams: z.number().min(1).max(2000).optional(),
});

export type ExtractedLabel = z.infer<typeof extractedLabelSchema>;

/**
 * Tool definition forced on the model so we get back well-shaped JSON.
 * Mirrors `extractedLabelSchema` — keep them in sync.
 */
export const labelExtractionTool: Anthropic.Tool = {
  name: 'save_extracted_label',
  description: 'Save the nutrition facts and identifying info extracted from a food product label.',
  input_schema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Product name as shown on the label, if visible.',
      },
      brand: {
        type: 'string',
        description: 'Brand name if visible on the label.',
      },
      kcalPer100g: {
        type: 'number',
        description:
          'Calories (kcal) per 100g or 100ml. If the label only shows per-portion, convert.',
      },
      proteinPer100g: {
        type: 'number',
        description: 'Protein in grams per 100g or 100ml.',
      },
      carbsPer100g: {
        type: 'number',
        description: 'Total carbohydrates in grams per 100g or 100ml.',
      },
      fatPer100g: {
        type: 'number',
        description: 'Total fat in grams per 100g or 100ml.',
      },
      suggestedPortionGrams: {
        type: 'number',
        description:
          'Suggested serving size in grams or millilitres if shown on the label (e.g. "porción 150g" → 150).',
      },
    },
    required: ['kcalPer100g', 'proteinPer100g', 'carbsPer100g', 'fatPer100g'],
  },
};

export const LABEL_EXTRACTION_PROMPT = `You are reading a nutrition facts label from a food product.

Extract the macros **per 100g or per 100ml** (not per portion). If the label only shows
per-portion values, convert them using the portion size. If both are shown, prefer the
per-100g column.

Also extract:
- The product name and brand, if clearly visible.
- The suggested portion size in grams or millilitres, if shown.

Round to one decimal place. If a value is not visible or you are uncertain, omit it
rather than guessing.

Use the save_extracted_label tool to return your result.`;
