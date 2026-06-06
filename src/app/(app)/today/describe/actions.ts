'use server';

import { z } from 'zod';
import { auth } from '@/auth';
import { estimateMealFromText } from '@/lib/freeTextEstimation.server';
import type { EstimationResult } from '@/lib/freeTextEstimation';

const descriptionSchema = z
  .string()
  .trim()
  .min(3, 'Describe what you ate in a bit more detail.')
  .max(800, 'Keep the description under 800 characters.');

/**
 * Ask Klara to turn a free-text meal description into structured
 * entries. Returns the parsed estimate, or an error message the UI
 * can show next to the textarea.
 */
export async function estimateMealAction(description: unknown): Promise<EstimationResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: 'Unauthorized' };

  const parsed = descriptionSchema.safeParse(description);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  try {
    const data = await estimateMealFromText(parsed.data);
    return { ok: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Klara could not estimate this meal.';
    return { ok: false, error: message };
  }
}
