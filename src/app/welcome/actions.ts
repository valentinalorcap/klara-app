'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { goalsInputSchema } from '@/lib/goals';
import { seedNewUser } from '@/lib/seedNewUser.server';
import type { GoalsFormState } from '@/app/(app)/settings/actions';

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  return session.user.id;
}

function flattenErrors(error: z.ZodError): GoalsFormState['fieldErrors'] {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === 'string' && !(key in out)) out[key] = issue.message;
  }
  return out as GoalsFormState['fieldErrors'];
}

/**
 * Finish first-run onboarding: save whatever goals were entered (all
 * optional) and stamp `onboardedAt` so the welcome screen never shows again,
 * then drop the user into the app.
 */
export async function completeOnboarding(
  _prev: GoalsFormState,
  formData: FormData,
): Promise<GoalsFormState> {
  const userId = await requireUserId();
  const parsed = goalsInputSchema.safeParse({
    dailyKcalGoal: formData.get('dailyKcalGoal'),
    dailyProteinGoal: formData.get('dailyProteinGoal'),
    dailyCarbsGoal: formData.get('dailyCarbsGoal'),
    dailyFatGoal: formData.get('dailyFatGoal'),
  });
  if (!parsed.success) return { fieldErrors: flattenErrors(parsed.error) };

  await prisma.user.update({
    where: { id: userId },
    data: {
      dailyKcalGoal: parsed.data.dailyKcalGoal ?? null,
      dailyProteinGoal: parsed.data.dailyProteinGoal ?? null,
      dailyCarbsGoal: parsed.data.dailyCarbsGoal ?? null,
      dailyFatGoal: parsed.data.dailyFatGoal ?? null,
      onboardedAt: new Date(),
    },
  });
  await seedNewUser(userId);
  revalidatePath('/today');
  redirect('/today');
}

/** Skip onboarding for now — mark it done so it doesn't reappear. */
export async function skipOnboarding(): Promise<void> {
  const userId = await requireUserId();
  await prisma.user.update({
    where: { id: userId },
    data: { onboardedAt: new Date() },
  });
  await seedNewUser(userId);
  redirect('/today');
}
