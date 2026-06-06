import { describe, expect, it } from 'vitest';
import {
  buildMonthGrid,
  categorizeKcal,
  computeStreak,
  daysInMonth,
  shiftWeek,
  weekDays,
  weekRangeLabel,
  weekStartFor,
} from './history';

describe('categorizeKcal', () => {
  it('returns no-goal when target is null/0/undefined', () => {
    expect(categorizeKcal(1800, null)).toBe('no-goal');
    expect(categorizeKcal(1800, 0)).toBe('no-goal');
    expect(categorizeKcal(1800, undefined)).toBe('no-goal');
  });

  it('returns no-data when actual is 0', () => {
    expect(categorizeKcal(0, 1700)).toBe('no-data');
  });

  it('maps each band correctly', () => {
    expect(categorizeKcal(1000, 1700)).toBe('under'); // 59%
    expect(categorizeKcal(1300, 1700)).toBe('near'); // 76%
    expect(categorizeKcal(1700, 1700)).toBe('on-target'); // 100%
    expect(categorizeKcal(1870, 1700)).toBe('on-target'); // 110%
    expect(categorizeKcal(1900, 1700)).toBe('over'); // 112%
  });
});

describe('daysInMonth', () => {
  it('handles 30, 31, and February correctly', () => {
    expect(daysInMonth(2026, 0)).toBe(31); // Jan
    expect(daysInMonth(2026, 1)).toBe(28); // Feb 2026
    expect(daysInMonth(2024, 1)).toBe(29); // Feb 2024 leap
    expect(daysInMonth(2026, 3)).toBe(30); // Apr
  });
});

describe('buildMonthGrid', () => {
  it('pads with nulls before the 1st of the month (Sunday-start grid)', () => {
    // October 2026 — Oct 1 is a Thursday → 4 nulls then day 1
    const grid = buildMonthGrid(2026, 9);
    expect(grid.slice(0, 4)).toEqual([null, null, null, null]);
    expect(grid[4]).toEqual({ date: '2026-10-01' });
  });

  it('lands the last day in the right column', () => {
    const grid = buildMonthGrid(2026, 9); // Oct has 31 days
    const last = grid.find((c) => c?.date === '2026-10-31');
    expect(last).toBeDefined();
  });

  it('returns a length divisible by 7', () => {
    expect(buildMonthGrid(2026, 9).length % 7).toBe(0);
    expect(buildMonthGrid(2024, 1).length % 7).toBe(0);
  });
});

describe('weekStartFor', () => {
  it('moves Sunday back to the previous Monday', () => {
    // 2026-10-25 was a Sunday → Monday is 2026-10-19
    expect(weekStartFor('2026-10-25')).toBe('2026-10-19');
  });

  it('returns the same date when given a Monday', () => {
    expect(weekStartFor('2026-10-19')).toBe('2026-10-19');
  });

  it('handles a Wednesday', () => {
    expect(weekStartFor('2026-10-21')).toBe('2026-10-19');
  });
});

describe('weekDays', () => {
  it('produces seven sequential days Mon→Sun', () => {
    expect(weekDays('2026-10-19')).toEqual([
      '2026-10-19',
      '2026-10-20',
      '2026-10-21',
      '2026-10-22',
      '2026-10-23',
      '2026-10-24',
      '2026-10-25',
    ]);
  });
});

describe('shiftWeek', () => {
  it('moves backwards and forwards by whole weeks', () => {
    expect(shiftWeek('2026-10-19', -1)).toBe('2026-10-12');
    expect(shiftWeek('2026-10-19', 1)).toBe('2026-10-26');
    expect(shiftWeek('2026-10-19', 0)).toBe('2026-10-19');
  });
});

describe('weekRangeLabel', () => {
  it('renders a same-month range as "Oct 19 — 25, 2026"', () => {
    expect(weekRangeLabel('2026-10-19')).toBe('Oct 19 — 25, 2026');
  });

  it('crosses months', () => {
    expect(weekRangeLabel('2026-10-26')).toBe('Oct 26 — Nov 1, 2026');
  });

  it('crosses years', () => {
    expect(weekRangeLabel('2026-12-28')).toBe('Dec 28, 2026 — Jan 3, 2027');
  });
});

describe('computeStreak', () => {
  const totals = new Map([
    ['2026-10-23', { kcal: 1700, protein: 140, carbs: 200, fat: 60 }],
    ['2026-10-22', { kcal: 1750, protein: 138, carbs: 195, fat: 58 }],
    ['2026-10-21', { kcal: 1690, protein: 142, carbs: 205, fat: 62 }],
    ['2026-10-20', { kcal: 900, protein: 80, carbs: 100, fat: 30 }], // under
    ['2026-10-19', { kcal: 1700, protein: 140, carbs: 200, fat: 60 }], // on-target but breaks
  ]);

  it('counts consecutive on-target days back from today', () => {
    expect(computeStreak('2026-10-23', totals, 1700)).toBe(3);
  });

  it('returns 0 when target is unset', () => {
    expect(computeStreak('2026-10-23', totals, null)).toBe(0);
  });

  it('breaks the streak on a missing day', () => {
    const sparse = new Map([
      ['2026-10-23', { kcal: 1700, protein: 0, carbs: 0, fat: 0 }],
      // 2026-10-22 missing
      ['2026-10-21', { kcal: 1700, protein: 0, carbs: 0, fat: 0 }],
    ]);
    expect(computeStreak('2026-10-23', sparse, 1700)).toBe(1);
  });
});
