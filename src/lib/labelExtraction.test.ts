import { describe, it, expect } from 'vitest';
import { extractedLabelSchema, labelExtractionTool } from './labelExtraction';

describe('extractedLabelSchema', () => {
  const validAi = {
    name: 'Skyr',
    brand: 'Sancor',
    kcalPer100g: 60,
    proteinPer100g: 10,
    carbsPer100g: 4,
    fatPer100g: 0.2,
    suggestedPortionGrams: 150,
  };

  it('parses a well-formed AI response', () => {
    const result = extractedLabelSchema.safeParse(validAi);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.kcalPer100g).toBe(60);
  });

  it('accepts a response without the optional fields', () => {
    const result = extractedLabelSchema.safeParse({
      kcalPer100g: 60,
      proteinPer100g: 10,
      carbsPer100g: 4,
      fatPer100g: 0.2,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBeUndefined();
      expect(result.data.brand).toBeUndefined();
      expect(result.data.suggestedPortionGrams).toBeUndefined();
    }
  });

  it('rejects when a required macro is missing', () => {
    const { proteinPer100g: _drop, ...rest } = validAi;
    const result = extractedLabelSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects implausibly high macros (likely a hallucination)', () => {
    const result = extractedLabelSchema.safeParse({ ...validAi, kcalPer100g: 5000 });
    expect(result.success).toBe(false);
  });

  it('rejects negative macros', () => {
    const result = extractedLabelSchema.safeParse({ ...validAi, fatPer100g: -1 });
    expect(result.success).toBe(false);
  });
});

describe('labelExtractionTool', () => {
  it('declares the four required macro fields', () => {
    expect(labelExtractionTool.input_schema.required).toEqual(
      expect.arrayContaining(['kcalPer100g', 'proteinPer100g', 'carbsPer100g', 'fatPer100g']),
    );
  });

  it('uses a stable name the server action references', () => {
    expect(labelExtractionTool.name).toBe('save_extracted_label');
  });
});
