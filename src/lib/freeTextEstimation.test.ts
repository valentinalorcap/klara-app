import { describe, expect, it } from 'vitest';
import {
  FREE_TEXT_ESTIMATION_SYSTEM,
  estimateMealTool,
  estimationResponseSchema,
} from './freeTextEstimation';

describe('FREE_TEXT_ESTIMATION_SYSTEM', () => {
  it('is stable (snapshot)', () => {
    expect(FREE_TEXT_ESTIMATION_SYSTEM).toMatchSnapshot();
  });

  it('tells the model to call the tool, not write prose', () => {
    expect(FREE_TEXT_ESTIMATION_SYSTEM).toMatch(/Call the save_meal_estimate tool/);
  });

  it('embeds reference weights so estimates stay deterministic', () => {
    expect(FREE_TEXT_ESTIMATION_SYSTEM).toMatch(/Taco/);
    expect(FREE_TEXT_ESTIMATION_SYSTEM).toMatch(/Beer/);
    expect(FREE_TEXT_ESTIMATION_SYSTEM).toMatch(/Slice of cake/);
  });
});

describe('estimateMealTool', () => {
  it('requires the core fields per entry', () => {
    const properties = estimateMealTool.input_schema.properties as Record<
      string,
      { items?: { required?: string[] } }
    >;
    expect(properties.entries.items?.required).toEqual([
      'name',
      'grams',
      'kcalPer100g',
      'proteinPer100g',
      'carbsPer100g',
      'fatPer100g',
    ]);
  });

  it('accepts suggestedType from the MealType enum', () => {
    const properties = estimateMealTool.input_schema.properties as Record<
      string,
      { enum?: string[] }
    >;
    expect(properties.suggestedType.enum).toContain('BREAKFAST');
    expect(properties.suggestedType.enum).toContain('OTHER');
  });
});

describe('estimationResponseSchema', () => {
  it('accepts a well-formed tool input', () => {
    const parsed = estimationResponseSchema.safeParse({
      entries: [
        {
          name: 'Tacos al pastor',
          grams: 360,
          kcalPer100g: 180,
          proteinPer100g: 12,
          carbsPer100g: 18,
          fatPer100g: 8,
        },
      ],
      suggestedType: 'DINNER',
      suggestedName: 'Cena en la taquería',
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects empty entries', () => {
    const parsed = estimationResponseSchema.safeParse({ entries: [] });
    expect(parsed.success).toBe(false);
  });

  it('rejects negative grams', () => {
    const parsed = estimationResponseSchema.safeParse({
      entries: [
        {
          name: 'Imaginary cake',
          grams: -10,
          kcalPer100g: 400,
          proteinPer100g: 4,
          carbsPer100g: 50,
          fatPer100g: 20,
        },
      ],
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects suggestedType outside the enum', () => {
    const parsed = estimationResponseSchema.safeParse({
      entries: [
        {
          name: 'Egg',
          grams: 50,
          kcalPer100g: 143,
          proteinPer100g: 12,
          carbsPer100g: 1,
          fatPer100g: 10,
        },
      ],
      suggestedType: 'BRUNCH',
    });
    expect(parsed.success).toBe(false);
  });
});
