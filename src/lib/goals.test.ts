import { describe, it, expect } from 'vitest';
import { goalsInputSchema, progressPct, hasAnyGoal } from './goals';

describe('progressPct', () => {
  it('returns the fraction current/target', () => {
    expect(progressPct(50, 100)).toBe(0.5);
  });

  it('caps at 1 when current exceeds target', () => {
    expect(progressPct(150, 100)).toBe(1);
  });

  it('clamps negative current to 0', () => {
    expect(progressPct(-10, 100)).toBe(0);
  });

  it('returns null when target is null', () => {
    expect(progressPct(50, null)).toBeNull();
  });

  it('returns null when target is zero', () => {
    expect(progressPct(50, 0)).toBeNull();
  });
});

describe('hasAnyGoal', () => {
  it('is false when all goals are null', () => {
    expect(
      hasAnyGoal({
        dailyKcalGoal: null,
        dailyProteinGoal: null,
        dailyCarbsGoal: null,
        dailyFatGoal: null,
      }),
    ).toBe(false);
  });

  it('is true when at least one goal is set', () => {
    expect(
      hasAnyGoal({
        dailyKcalGoal: null,
        dailyProteinGoal: 120,
        dailyCarbsGoal: null,
        dailyFatGoal: null,
      }),
    ).toBe(true);
  });
});

describe('goalsInputSchema', () => {
  it('coerces strings into numbers', () => {
    const result = goalsInputSchema.safeParse({
      dailyKcalGoal: '1800',
      dailyProteinGoal: '120',
      dailyCarbsGoal: '180',
      dailyFatGoal: '60',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dailyKcalGoal).toBe(1800);
      expect(result.data.dailyProteinGoal).toBe(120);
    }
  });

  it('treats empty strings as undefined (= "no goal")', () => {
    const result = goalsInputSchema.safeParse({
      dailyKcalGoal: '',
      dailyProteinGoal: '120',
      dailyCarbsGoal: '',
      dailyFatGoal: '',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dailyKcalGoal).toBeUndefined();
      expect(result.data.dailyProteinGoal).toBe(120);
    }
  });

  it('rejects negative values', () => {
    const result = goalsInputSchema.safeParse({ dailyKcalGoal: '-100' });
    expect(result.success).toBe(false);
  });

  it('rejects implausibly high values', () => {
    const result = goalsInputSchema.safeParse({ dailyKcalGoal: '500000' });
    expect(result.success).toBe(false);
  });
});
