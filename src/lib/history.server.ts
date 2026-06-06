import 'server-only';
import { prisma } from './prisma';
import { sumEntries } from './meals';
import type { MacroSum } from './evaluations';
import { utcDateKey } from './history';

export type DailyTotal = MacroSum & { mealCount: number };

/**
 * Roll up the user's meals between `fromKey` and `toKey` (inclusive) into
 * per-day totals keyed by `YYYY-MM-DD`. Days with no meals just don't
 * appear in the map — callers default to empty totals.
 */
export async function loadDailyTotalsRange(
  userId: string,
  fromKey: string,
  toKey: string,
): Promise<Map<string, DailyTotal>> {
  const fromDate = new Date(`${fromKey}T00:00:00Z`);
  const toDate = new Date(`${toKey}T00:00:00Z`);

  const meals = await prisma.meal.findMany({
    where: { userId, date: { gte: fromDate, lte: toDate } },
    include: { entries: true },
  });

  const out = new Map<string, DailyTotal>();
  for (const m of meals) {
    const key = m.date.toISOString().slice(0, 10);
    const t = sumEntries(m.entries);
    const prev = out.get(key);
    if (prev) {
      prev.kcal += t.kcal;
      prev.protein += t.protein;
      prev.carbs += t.carbs;
      prev.fat += t.fat;
      prev.mealCount += 1;
    } else {
      out.set(key, { ...t, mealCount: 1 });
    }
  }
  return out;
}

/**
 * Pick the day within the given keys whose kcal is closest to the user's
 * target. Returns null when no day in the range has data or no target is
 * set.
 */
export function pickBestDay(
  totals: Map<string, DailyTotal>,
  keys: string[],
  target: number | null,
): { date: string; totals: DailyTotal } | null {
  if (!target || target <= 0) return null;
  let best: { date: string; totals: DailyTotal; distance: number } | null = null;
  for (const k of keys) {
    const t = totals.get(k);
    if (!t || t.kcal <= 0) continue;
    const distance = Math.abs(t.kcal - target);
    if (!best || distance < best.distance) {
      best = { date: k, totals: t, distance };
    }
  }
  if (!best) return null;
  return { date: best.date, totals: best.totals };
}

/**
 * Compute the bounding date window we need to fetch for the History
 * main page: covers the displayed month, the displayed week, and the
 * last 60 days back from today (for the streak walk).
 */
export function computeFetchRange(opts: {
  monthFirstKey: string;
  monthLastKey: string;
  weekStartKey: string;
  todayKey: string;
}): { fromKey: string; toKey: string } {
  const keys = [opts.monthFirstKey, opts.monthLastKey, opts.weekStartKey, opts.todayKey];
  // Week end is week start + 6.
  const [wy, wm, wd] = opts.weekStartKey.split('-').map(Number);
  const weekEnd = new Date(Date.UTC(wy, wm - 1, wd + 6));
  keys.push(utcDateKey(weekEnd));

  // Streak walk needs up to 60 days behind today.
  const [ty, tm, td] = opts.todayKey.split('-').map(Number);
  const streakBack = new Date(Date.UTC(ty, tm - 1, td - 60));
  keys.push(utcDateKey(streakBack));

  return {
    fromKey: keys.reduce((min, k) => (k < min ? k : min), keys[0]),
    toKey: keys.reduce((max, k) => (k > max ? k : max), keys[0]),
  };
}
