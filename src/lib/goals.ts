import { z } from 'zod';

/** Optional number input that turns empty strings into undefined. */
const optionalGoal = z
  .union([z.literal(''), z.coerce.number().min(0, 'Cannot be negative').max(20_000)])
  .optional()
  .transform((v) => (v === '' || v === undefined ? undefined : v));

/** Zod schema for the Settings form input. All four fields are optional. */
export const goalsInputSchema = z.object({
  dailyKcalGoal: optionalGoal,
  dailyProteinGoal: optionalGoal,
  dailyCarbsGoal: optionalGoal,
  dailyFatGoal: optionalGoal,
});

export type GoalsInput = z.infer<typeof goalsInputSchema>;

export type Goals = {
  dailyKcalGoal: number | null;
  dailyProteinGoal: number | null;
  dailyCarbsGoal: number | null;
  dailyFatGoal: number | null;
};

/**
 * Progress as a 0–1 value. Returns null when there is no target — the UI
 * uses that to render a goal-less ring (just the value, no arc).
 */
export function progressPct(current: number, target: number | null): number | null {
  if (target == null || target <= 0) return null;
  return Math.max(0, Math.min(current / target, 1));
}

/** Whether the user has set at least one goal. */
export function hasAnyGoal(goals: Goals): boolean {
  return (
    goals.dailyKcalGoal != null ||
    goals.dailyProteinGoal != null ||
    goals.dailyCarbsGoal != null ||
    goals.dailyFatGoal != null
  );
}
