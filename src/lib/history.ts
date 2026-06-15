import type { MacroSum } from './evaluations';

/** Which metric the history view is colouring/charting against. `score` is
 *  the composite day-quality score (see lib/dayScore.ts). */
export type Metric = 'kcal' | 'protein' | 'carbs' | 'fat' | 'score';

export const METRICS: Metric[] = ['score', 'kcal', 'protein', 'carbs', 'fat'];

/** Short label for a metric (kcal · P · C · F style). */
export function metricShortLabel(metric: Metric): string {
  switch (metric) {
    case 'kcal':
      return 'kcal';
    case 'protein':
      return 'P';
    case 'carbs':
      return 'C';
    case 'fat':
      return 'F';
    case 'score':
      return 'Score';
  }
}

/** Full lower-case unit suffix (" kcal" or "g"). */
export function metricUnit(metric: Metric): string {
  if (metric === 'kcal') return ' kcal';
  if (metric === 'score') return '';
  return 'g';
}

/** Read the value for `metric` out of a meal/day totals object. */
export function valueFor(totals: MacroSum, metric: Metric): number {
  switch (metric) {
    case 'kcal':
      return totals.kcal;
    case 'protein':
      return totals.protein;
    case 'carbs':
      return totals.carbs;
    case 'fat':
      return totals.fat;
    case 'score':
      return 0; // score is computed via lib/dayScore, not read from totals here
  }
}

/** Read the user's target for `metric` from a UserGoals-like object. */
export function targetFor(
  goals: {
    dailyKcalGoal: number | null;
    dailyProteinGoal: number | null;
    dailyCarbsGoal: number | null;
    dailyFatGoal: number | null;
  },
  metric: Metric,
): number | null {
  switch (metric) {
    case 'kcal':
      return goals.dailyKcalGoal;
    case 'protein':
      return goals.dailyProteinGoal;
    case 'carbs':
      return goals.dailyCarbsGoal;
    case 'fat':
      return goals.dailyFatGoal;
    case 'score':
      return null; // score has no single goal field
  }
}

/** Status of a day relative to the user's target for a single macro. */
export type DayStatus = 'no-data' | 'no-goal' | 'under' | 'near' | 'on-target' | 'over';

/**
 * Classify a day's value vs target. Thresholds map to the calendar
 * coloring in the History tab:
 * - on-target: 90–110% of goal (the "good" zone)
 * - near: 70–90% (close, but short)
 * - under: <70%
 * - over: >110%
 */
export function categorizeStatus(actual: number, target: number | null | undefined): DayStatus {
  if (target == null || target <= 0) return 'no-goal';
  if (actual <= 0) return 'no-data';
  const pct = actual / target;
  if (pct < 0.7) return 'under';
  if (pct < 0.9) return 'near';
  if (pct <= 1.1) return 'on-target';
  return 'over';
}

/** A summary row used by both the calendar grid and the streak math. */
export type DaySummary = {
  /** `YYYY-MM-DD` in the user's local day. */
  date: string;
  totals: MacroSum;
  mealCount: number;
};

/** What the calendar grid renders per cell. */
export type CalendarDay = DaySummary & {
  status: DayStatus;
  /** True for days in the future from the user's perspective. */
  isFuture: boolean;
  /** True for today's cell — drives the ring highlight. */
  isToday: boolean;
  /** Actual / target for the currently selected metric. 0 if no data or no goal. */
  pct: number;
  /** The selected metric's value for the day (the score in score mode); 0 if none. */
  value: number;
  /** Per-day ring colour (score mode). Falls back to the metric colour otherwise. */
  color?: string;
};

/** Pad a number as 2 digits. */
function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Format a Date in UTC as YYYY-MM-DD. Use only for date-only values. */
export function utcDateKey(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/** Number of days in the month containing the given (UTC) date. */
export function daysInMonth(year: number, month0: number): number {
  // month0 is 0-indexed. Day 0 of the next month is the last day of this one.
  return new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
}

/**
 * Build the cells of a 7-column calendar grid for a given month. The
 * grid starts on **Monday** (col 0). Cells before the 1st and after
 * the last day come back as `null` so the caller can render blank
 * slots.
 */
export function buildMonthGrid(year: number, month0: number): Array<{ date: string } | null> {
  const lastDay = daysInMonth(year, month0);
  const first = new Date(Date.UTC(year, month0, 1));
  // getUTCDay: 0 = Sunday. Shift so Monday = 0.
  const startDow = (first.getUTCDay() + 6) % 7;
  const cells: Array<{ date: string } | null> = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= lastDay; d++) {
    cells.push({ date: `${year}-${pad(month0 + 1)}-${pad(d)}` });
  }
  // Pad to a multiple of 7 so the grid stays rectangular.
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/**
 * Return the Monday of the week containing the given (UTC) date as
 * `YYYY-MM-DD`. Weeks are Mon→Sun.
 */
export function weekStartFor(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  // getUTCDay: 0 = Sunday. Shift so Monday = 0.
  const dow = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dow);
  return utcDateKey(date);
}

/** Move a Monday week start by `weeks` weeks (negative = back). */
export function shiftWeek(weekStartKey: string, weeks: number): string {
  const [y, m, d] = weekStartKey.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + weeks * 7);
  return utcDateKey(date);
}

/** Days Mon→Sun for the week starting at `weekStartKey`. */
export function weekDays(weekStartKey: string): string[] {
  const [y, m, d] = weekStartKey.split('-').map(Number);
  const out: string[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(Date.UTC(y, m - 1, d + i));
    out.push(utcDateKey(date));
  }
  return out;
}

/**
 * "Oct 19 — 25, 2026" style label for a Monday→Sunday range.
 * Same month: "Oct 19 — 25, 2026". Cross-month: "Oct 27 — Nov 2, 2026".
 * Cross-year: "Dec 28, 2026 — Jan 3, 2027".
 */
export function weekRangeLabel(weekStartKey: string): string {
  const [y1, m1, d1] = weekStartKey.split('-').map(Number);
  const [y2, m2, d2] = weekDays(weekStartKey)[6].split('-').map(Number);
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  if (y1 !== y2) return `${months[m1 - 1]} ${d1}, ${y1} — ${months[m2 - 1]} ${d2}, ${y2}`;
  if (m1 !== m2) return `${months[m1 - 1]} ${d1} — ${months[m2 - 1]} ${d2}, ${y1}`;
  return `${months[m1 - 1]} ${d1} — ${d2}, ${y1}`;
}

/**
 * Count consecutive on-target days walking back from today. `dailyTotals`
 * is a map from date key → totals, and `target` is the user's kcal goal.
 * Days with no data or no goal break the streak.
 */
export function computeStreak(
  todayKey: string,
  dailyTotals: Map<string, MacroSum>,
  target: number | null | undefined,
  metric: Metric = 'kcal',
): number {
  if (target == null || target <= 0) return 0;
  let streak = 0;
  const [y, m, d] = todayKey.split('-').map(Number);
  const cursor = new Date(Date.UTC(y, m - 1, d));
  // Walk back at most 365 days — beyond that we'd be reading nothing anyway.
  for (let i = 0; i < 365; i++) {
    const key = utcDateKey(cursor);
    const totals = dailyTotals.get(key);
    if (!totals) break;
    if (categorizeStatus(valueFor(totals, metric), target) !== 'on-target') break;
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}
