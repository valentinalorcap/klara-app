import { describe, it, expect } from 'vitest';
import { macrosForGrams, productInputSchema } from './products';

const yogur = {
  kcalPer100g: 60,
  proteinPer100g: 10,
  carbsPer100g: 4,
  fatPer100g: 0.2,
};

describe('macrosForGrams', () => {
  it('returns the per-100g values unchanged when grams = 100', () => {
    const result = macrosForGrams(yogur, 100);
    expect(result).toEqual({ kcal: 60, protein: 10, carbs: 4, fat: 0.2 });
  });

  it('scales linearly for smaller portions', () => {
    const result = macrosForGrams(yogur, 50);
    expect(result.kcal).toBe(30);
    expect(result.protein).toBe(5);
    expect(result.carbs).toBe(2);
    expect(result.fat).toBeCloseTo(0.1);
  });

  it('scales linearly for larger portions', () => {
    const result = macrosForGrams(yogur, 250);
    expect(result.kcal).toBe(150);
    expect(result.protein).toBe(25);
  });

  it('returns zeroes when grams = 0', () => {
    const result = macrosForGrams(yogur, 0);
    expect(result).toEqual({ kcal: 0, protein: 0, carbs: 0, fat: 0 });
  });
});

describe('productInputSchema', () => {
  const validInput = {
    name: 'Skyr Sancor',
    brand: 'Sancor',
    kcalPer100g: '60',
    proteinPer100g: '10',
    carbsPer100g: '4',
    fatPer100g: '0.2',
  };

  it('coerces numeric strings (FormData values) into numbers', () => {
    const result = productInputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.kcalPer100g).toBe(60);
      expect(typeof result.data.proteinPer100g).toBe('number');
    }
  });

  it('treats an empty brand string as undefined', () => {
    const result = productInputSchema.safeParse({ ...validInput, brand: '' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.brand).toBeUndefined();
  });

  it('rejects a missing name', () => {
    const result = productInputSchema.safeParse({ ...validInput, name: '   ' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const nameIssue = result.error.issues.find((i) => i.path[0] === 'name');
      expect(nameIssue?.message).toMatch(/required/i);
    }
  });

  it('rejects negative macros', () => {
    const result = productInputSchema.safeParse({ ...validInput, kcalPer100g: '-5' });
    expect(result.success).toBe(false);
  });

  it('rejects implausibly high macros', () => {
    const result = productInputSchema.safeParse({ ...validInput, proteinPer100g: '300' });
    expect(result.success).toBe(false);
  });

  it('accepts an empty suggestedPortionGrams as undefined', () => {
    const result = productInputSchema.safeParse({ ...validInput, suggestedPortionGrams: '' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.suggestedPortionGrams).toBeUndefined();
  });

  it('parses suggestedPortionGrams from a numeric string', () => {
    const result = productInputSchema.safeParse({ ...validInput, suggestedPortionGrams: '150' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.suggestedPortionGrams).toBe(150);
  });

  it('rejects a zero or negative suggested portion', () => {
    const result = productInputSchema.safeParse({ ...validInput, suggestedPortionGrams: '0' });
    expect(result.success).toBe(false);
  });
});
