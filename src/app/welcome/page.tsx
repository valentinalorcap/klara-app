import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { GoalsForm } from '@/components/GoalsForm';
import { completeOnboarding, skipOnboarding } from './actions';

/**
 * First-run onboarding. A new user lands here (the app layout redirects when
 * `onboardedAt` is null) to set their daily goals — the one thing Klara needs
 * to start tracking. Saving or skipping stamps `onboardedAt`, so it shows once.
 */
export default async function WelcomePage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      onboardedAt: true,
      dailyKcalGoal: true,
      dailyProteinGoal: true,
      dailyCarbsGoal: true,
      dailyFatGoal: true,
    },
  });
  if (!user) redirect('/login');
  if (user.onboardedAt) redirect('/today');

  const firstName = user.name?.split(' ')[0];

  return (
    <main className="mx-auto min-h-screen max-w-md px-6 py-12 pt-[max(3rem,env(safe-area-inset-top))]">
      <h1 className="text-2xl font-bold tracking-tight text-white">
        {firstName ? `Hi, ${firstName} 👋` : 'Welcome to Klara 👋'}
      </h1>
      <p className="mt-2 text-sm text-neutral-400">
        Set your daily goals so Klara can track your progress against them. You can change these
        anytime in Settings.
      </p>

      <div className="mt-6">
        <GoalsForm
          initial={{
            dailyKcalGoal: user.dailyKcalGoal,
            dailyProteinGoal: user.dailyProteinGoal,
            dailyCarbsGoal: user.dailyCarbsGoal,
            dailyFatGoal: user.dailyFatGoal,
          }}
          action={completeOnboarding}
          submitLabel="Start tracking"
        />
      </div>

      <form action={skipOnboarding} className="mt-3">
        <button
          type="submit"
          className="block w-full px-4 py-2 text-center text-sm font-medium text-neutral-500 transition hover:text-neutral-300"
        >
          I&apos;ll set this later
        </button>
      </form>
    </main>
  );
}
