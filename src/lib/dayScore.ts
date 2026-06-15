import type { Goals } from './goals';
import type { MacroSum } from './evaluations';

/**
 * Day quality score (0–100) — a single "how good was this day" number for
 * Results. Each macro is scored by how close the day was to its goal, but
 * the *direction* that's "bad" differs per macro:
 *
 * - **protein = floor:** under penalizes; at/over is fine (you want to hit it).
 * - **fat = ceiling:** over penalizes; under is fine (always trying to lower it).
 * - **kcal = target band:** both penalize, over harder than under.
 * - **carbs = target band:** both penalize, symmetric-ish.
 *
 * Within ±10% of the goal counts as on-target (100). The overall score is a
 * weighted average; macros with no goal are dropped and the rest renormalized.
 */

const TOL_LOW = 0.9;
const TOL_HIGH = 1.1;

type Kind = 'floor' | 'ceiling' | 'target';

type MacroConfig = {
  key: keyof MacroSum;
  goalKey: keyof Goals;
  kind: Kind;
  weight: number;
  /** Ratio at which the under-side hits 0 (floor/target only). */
  underZero?: number;
  /** Ratio at which the over-side hits 0 (ceiling/target only). */
  overZero?: number;
};

const MACROS: MacroConfig[] = [
  { key: 'protein', goalKey: 'dailyProteinGoal', kind: 'floor', weight: 0.3, underZero: 0.5 },
  {
    key: 'kcal',
    goalKey: 'dailyKcalGoal',
    kind: 'target',
    weight: 0.3,
    underZero: 0.5,
    overZero: 1.4,
  },
  { key: 'fat', goalKey: 'dailyFatGoal', kind: 'ceiling', weight: 0.2, overZero: 1.5 },
  {
    key: 'carbs',
    goalKey: 'dailyCarbsGoal',
    kind: 'target',
    weight: 0.2,
    underZero: 0.5,
    overZero: 1.5,
  },
];

const clamp01 = (n: number) => Math.min(Math.max(n, 0), 1);

/** Sub-score (0–100) for one macro given its consumed/goal ratio. */
function subScore(r: number, c: MacroConfig): number {
  const underSlope = (r: number) =>
    clamp01((r - (c.underZero as number)) / (TOL_LOW - (c.underZero as number))) * 100;
  const overSlope = (r: number) =>
    clamp01(((c.overZero as number) - r) / ((c.overZero as number) - TOL_HIGH)) * 100;

  if (c.kind === 'floor') {
    return r >= TOL_LOW ? 100 : underSlope(r);
  }
  if (c.kind === 'ceiling') {
    return r <= TOL_HIGH ? 100 : overSlope(r);
  }
  // target band
  if (r >= TOL_LOW && r <= TOL_HIGH) return 100;
  return r < TOL_LOW ? underSlope(r) : overSlope(r);
}

export type ScoreBand = 'excellent' | 'great' | 'good' | 'off' | 'rough';

export type DayScore = {
  score: number;
  band: ScoreBand;
  label: string;
  color: string;
};

const BANDS: { min: number; band: ScoreBand; label: string; color: string }[] = [
  { min: 90, band: 'excellent', label: 'Excellent', color: '#34d399' },
  { min: 75, band: 'great', label: 'Great', color: '#84cc16' },
  { min: 60, band: 'good', label: 'Good', color: '#facc15' },
  { min: 40, band: 'off', label: 'Off', color: '#fb923c' },
  { min: 0, band: 'rough', label: 'Rough', color: '#f87171' },
];

export function bandFor(score: number): Omit<DayScore, 'score'> {
  const b = BANDS.find((x) => score >= x.min) ?? BANDS[BANDS.length - 1];
  return { band: b.band, label: b.label, color: b.color };
}

/**
 * Score a completed day against the user's goals. Returns null when no goal
 * is set at all (nothing to score against). Callers should skip days with no
 * meals — an empty day has no score.
 */
export function dayScore(totals: MacroSum, goals: Goals): DayScore | null {
  let weighted = 0;
  let weightSum = 0;
  for (const c of MACROS) {
    const goal = goals[c.goalKey];
    if (goal == null || goal <= 0) continue;
    const r = totals[c.key] / goal;
    weighted += subScore(r, c) * c.weight;
    weightSum += c.weight;
  }
  if (weightSum === 0) return null;
  const score = Math.round(weighted / weightSum);
  return { score, ...bandFor(score) };
}
