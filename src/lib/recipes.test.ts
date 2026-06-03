import { describe, it, expect } from 'vitest';
import { computeRecipeTotals, perPortion, recipeInputSchema } from './recipes';

const oats = { kcalPer100g: 380, proteinPer100g: 13, carbsPer100g: 60, fatPer100g: 7 };
const cottage = { kcalPer100g: 70, proteinPer100g: 11, carbsPer100g: 3, fatPer100g: 1 };
const banana = { kcalPer100g: 90, proteinPer100g: 1, carbsPer100g: 23, fatPer100g: 0.3 };

const products = {
  oats,
  cottage,
  banana,
};

describe('computeRecipeTotals', () => {
  it('returns zeros for an empty ingredient list', () => {
    const totals = computeRecipeTotals([], products);
    expect(totals).toEqual({ totalKcal: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 });
  });

  it('scales a single ingredient by grams', () => {
    const totals = computeRecipeTotals([{ productId: 'oats', grams: 50 }], products);
    expect(totals.totalKcal).toBe(190);
    expect(totals.totalProtein).toBe(6.5);
    expect(totals.totalCarbs).toBe(30);
    expect(totals.totalFat).toBe(3.5);
  });

  it('sums multiple ingredients', () => {
    const totals = computeRecipeTotals(
      [
        { productId: 'oats', grams: 120 }, // 456 kcal
        { productId: 'cottage', grams: 300 }, // 210 kcal
        { productId: 'banana', grams: 200 }, // 180 kcal
      ],
      products,
    );
    expect(totals.totalKcal).toBeCloseTo(846, 1);
    expect(totals.totalProtein).toBeCloseTo(50.6, 1);
  });

  it('treats missing products as a zero contribution', () => {
    const totals = computeRecipeTotals(
      [
        { productId: 'oats', grams: 100 },
        { productId: 'deleted', grams: 999 },
      ],
      products,
    );
    expect(totals.totalKcal).toBe(380);
  });
});

describe('perPortion', () => {
  it('divides each total by the portion count', () => {
    const result = perPortion(
      { totalKcal: 800, totalProtein: 40, totalCarbs: 100, totalFat: 20 },
      8,
    );
    expect(result.kcal).toBe(100);
    expect(result.protein).toBe(5);
    expect(result.carbs).toBe(12.5);
    expect(result.fat).toBe(2.5);
  });

  it('falls back to 1 when portions is zero or negative', () => {
    const result = perPortion(
      { totalKcal: 800, totalProtein: 40, totalCarbs: 100, totalFat: 20 },
      0,
    );
    expect(result.kcal).toBe(800);
  });
});

describe('recipeInputSchema', () => {
  const validInput = {
    name: 'Banana bread',
    portions: '8',
    ingredients: [
      { productId: 'oats', grams: '120' },
      { productId: 'cottage', grams: '300' },
    ],
  };

  it('coerces portions and grams from strings', () => {
    const result = recipeInputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.portions).toBe(8);
      expect(result.data.ingredients[0].grams).toBe(120);
    }
  });

  it('rejects an empty ingredients list', () => {
    const result = recipeInputSchema.safeParse({ ...validInput, ingredients: [] });
    expect(result.success).toBe(false);
  });

  it('rejects an ingredient with zero grams', () => {
    const result = recipeInputSchema.safeParse({
      ...validInput,
      ingredients: [{ productId: 'oats', grams: '0' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects portions of zero', () => {
    const result = recipeInputSchema.safeParse({ ...validInput, portions: '0' });
    expect(result.success).toBe(false);
  });
});
