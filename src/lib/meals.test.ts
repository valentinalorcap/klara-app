import { describe, it, expect } from 'vitest';
import { entryMacros, sumEntries, isoDate, createMealInputSchema, MealType } from './meals';

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
      { ...banana, grams: 100 },
      { ...banana, grams: 50 },
    ]);
    expect(totals.kcal).toBe(135);
    expect(totals.protein).toBe(1.5);
  });

  it('returns zeros for an empty array', () => {
    expect(sumEntries([])).toEqual({ kcal: 0, protein: 0, carbs: 0, fat: 0 });
  });
});

describe('isoDate', () => {
  it('formats as YYYY-MM-DD in local time', () => {
    const d = new Date(2026, 5, 3);
    expect(isoDate(d)).toBe('2026-06-03');
  });

  it('zero-pads month and day', () => {
    expect(isoDate(new Date(2026, 0, 9))).toBe('2026-01-09');
  });
});

describe('createMealInputSchema', () => {
  const baseEntry = {
    name: 'Banana',
    grams: 150,
    kcalPer100g: 90,
    proteinPer100g: 1,
    carbsPer100g: 23,
    fatPer100g: 0.3,
  };

  it('accepts a well-formed input', () => {
    const result = createMealInputSchema.safeParse({
      date: '2026-06-03',
      type: MealType.BREAKFAST,
      entries: [baseEntry],
    });
    expect(result.success).toBe(true);
  });

  it('treats an empty name as undefined', () => {
    const result = createMealInputSchema.safeParse({
      date: '2026-06-03',
      type: MealType.BREAKFAST,
      name: '',
      entries: [baseEntry],
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBeUndefined();
  });

  it('rejects a bad date string', () => {
    const result = createMealInputSchema.safeParse({
      date: '06/03/2026',
      type: MealType.BREAKFAST,
      entries: [baseEntry],
    });
    expect(result.success).toBe(false);
  });

  it('rejects an empty entries array', () => {
    const result = createMealInputSchema.safeParse({
      date: '2026-06-03',
      type: MealType.BREAKFAST,
      entries: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown meal type', () => {
    const result = createMealInputSchema.safeParse({
      date: '2026-06-03',
      type: 'BRUNCH',
      entries: [baseEntry],
    });
    expect(result.success).toBe(false);
  });
});
