import { describe, expect, it } from 'vitest';
import { dayScore, bandFor } from './dayScore';
import type { Goals } from './goals';

const GOALS: Goals = {
  dailyKcalGoal: 1700,
  dailyProteinGoal: 130,
  dailyCarbsGoal: 160,
  dailyFatGoal: 60,
};

describe('dayScore', () => {
  it('a near-perfect day with only fat a bit high scores ~90 (Excellent)', () => {
    const s = dayScore({ kcal: 1750, protein: 145, carbs: 150, fat: 78 }, GOALS)!;
    expect(s.score).toBe(90);
    expect(s.band).toBe('excellent');
  });

  it('a big overeat / low protein day scores low (Rough)', () => {
    const s = dayScore({ kcal: 2200, protein: 100, carbs: 230, fat: 95 }, GOALS)!;
    expect(s.score).toBeLessThan(40);
    expect(s.band).toBe('rough');
  });

  it('over on protein and under on fat is NOT penalized (protein=floor, fat=ceiling)', () => {
    // kcal + carbs on goal, protein well over, fat well under → all sub-scores 100.
    const s = dayScore({ kcal: 1700, protein: 200, carbs: 160, fat: 20 }, GOALS)!;
    expect(s.score).toBe(100);
  });

  it('going over kcal lowers the score (kcal is a target band, over penalized)', () => {
    const onTarget = dayScore({ kcal: 1700, protein: 130, carbs: 160, fat: 60 }, GOALS)!;
    const overKcal = dayScore({ kcal: 2100, protein: 130, carbs: 160, fat: 60 }, GOALS)!;
    expect(onTarget.score).toBe(100);
    expect(overKcal.score).toBeLessThan(100);
  });

  it('being under protein lowers the score (protein is a floor)', () => {
    const s = dayScore({ kcal: 1700, protein: 70, carbs: 160, fat: 60 }, GOALS)!;
    expect(s.score).toBeLessThan(100);
  });

  it('returns null when no goals are set', () => {
    const s = dayScore(
      { kcal: 1700, protein: 130, carbs: 160, fat: 60 },
      { dailyKcalGoal: null, dailyProteinGoal: null, dailyCarbsGoal: null, dailyFatGoal: null },
    );
    expect(s).toBeNull();
  });

  it('renormalizes weights when only some goals are set', () => {
    // Only a kcal goal, hit exactly → 100 regardless of the other macros.
    const s = dayScore(
      { kcal: 1700, protein: 999, carbs: 999, fat: 999 },
      { dailyKcalGoal: 1700, dailyProteinGoal: null, dailyCarbsGoal: null, dailyFatGoal: null },
    )!;
    expect(s.score).toBe(100);
  });
});

describe('bandFor', () => {
  it.each([
    [95, 'excellent'],
    [80, 'great'],
    [65, 'good'],
    [50, 'off'],
    [20, 'rough'],
  ] as const)('%i → %s', (score, band) => {
    expect(bandFor(score).band).toBe(band);
  });
});
