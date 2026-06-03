import { describe, it, expect } from 'vitest';
import {
  entryMacros,
  sumEntries,
  recipePer100g,
  isoDate,
  mealInputSchema,
  MealType,
} from './meals';

const banana = {
  kcalPer100g: 90,
  proteinPer100g: 1,
  carbsPer100g: 23,
  fatPer100g: 0.3,
};

describe('entryMacros', () => {
  it('multiplies per-100g by grams/100', () => {
    const m = entryMacros({ ...banana, grams: 150 });
    expect(m.kcal).toBe(135);
    expect(m.protein).toBe(1.5);
    expect(m.carbs).toBe(34.5);
    expect(m.fat).toBeCloseTo(0.45, 2);
  });

  it('returns zeros for 0 grams', () => {
    const m = entryMacros({ ...banana, grams: 0 });
    expect(m).toEqual({ kcal: 0, protein: 0, carbs: 0, fat: 0 });
  });
});

describe('sumEntries', () => {
  it('sums macros across entries', () => {
    const totals = sumEntries([
      { ...banana, grams: 100 }, // 90 kcal
      { ...banana, grams: 50 }, // 45 kcal
    ]);
    expect(totals.kcal).toBe(135);
    expect(totals.protein).toBe(1.5);
  });

  it('returns zeros for an empty array', () => {
    expect(sumEntries([])).toEqual({ kcal: 0, protein: 0, carbs: 0, fat: 0 });
  });
});

describe('recipePer100g', () => {
  it('rescales a recipe totals back to per-100g', () => {
    const per = recipePer100g(
      { totalKcal: 800, totalProtein: 40, totalCarbs: 100, totalFat: 20 },
      400, // total grams
    );
    expect(per.kcalPer100g).toBe(200);
    expect(per.proteinPer100g).toBe(10);
    expect(per.carbsPer100g).toBe(25);
    expect(per.fatPer100g).toBe(5);
  });

  it('returns zeros when totalGrams is 0', () => {
    const per = recipePer100g(
      { totalKcal: 800, totalProtein: 40, totalCarbs: 100, totalFat: 20 },
      0,
    );
    expect(per).toEqual({
      kcalPer100g: 0,
      proteinPer100g: 0,
      carbsPer100g: 0,
      fatPer100g: 0,
    });
  });
});

describe('isoDate', () => {
  it('formats as YYYY-MM-DD in local time', () => {
    const d = new Date(2026, 5, 3); // June 3, 2026 (month 5 because 0-indexed)
    expect(isoDate(d)).toBe('2026-06-03');
  });

  it('zero-pads month and day', () => {
    expect(isoDate(new Date(2026, 0, 9))).toBe('2026-01-09');
  });
});

describe('mealInputSchema', () => {
  const baseEntry = {
    name: 'Banana',
    grams: 150,
    kcalPer100g: 90,
    proteinPer100g: 1,
    carbsPer100g: 23,
    fatPer100g: 0.3,
  };

  it('accepts a well-formed input', () => {
    const result = mealInputSchema.safeParse({
      date: '2026-06-03',
      type: MealType.BREAKFAST,
      entry: baseEntry,
    });
    expect(result.success).toBe(true);
  });

  it('rejects a bad date string', () => {
    const result = mealInputSchema.safeParse({
      date: '06/03/2026',
      type: MealType.BREAKFAST,
      entry: baseEntry,
    });
    expect(result.success).toBe(false);
  });

  it('rejects zero grams', () => {
    const result = mealInputSchema.safeParse({
      date: '2026-06-03',
      type: MealType.BREAKFAST,
      entry: { ...baseEntry, grams: 0 },
    });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown meal type', () => {
    const result = mealInputSchema.safeParse({
      date: '2026-06-03',
      type: 'BRUNCH',
      entry: baseEntry,
    });
    expect(result.success).toBe(false);
  });
});
