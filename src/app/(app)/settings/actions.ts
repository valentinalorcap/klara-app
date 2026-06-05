'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { goalsInputSchema } from '@/lib/goals';

export type GoalsFormState = {
  fieldErrors?: Partial<
    Record<'dailyKcalGoal' | 'dailyProteinGoal' | 'dailyCarbsGoal' | 'dailyFatGoal', string>
  >;
  formError?: string;
};

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');
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

export async function updateGoals(
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
    },
  });
  revalidatePath('/today');
  revalidatePath('/settings');
  redirect('/today');
}
