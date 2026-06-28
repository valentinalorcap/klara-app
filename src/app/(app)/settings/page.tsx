import Link from 'next/link';
import { ChevronLeft, LogOut } from 'lucide-react';
import { auth, signOut } from '@/auth';
import { prisma } from '@/lib/prisma';
import { GlassCard } from '@/components/GlassCard';
import { GoalsForm } from '@/components/GoalsForm';
import { ToneSelector } from '@/components/ToneSelector';

export default async function SettingsPage() {
  const session = await auth();
  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: {
      name: true,
      email: true,
      dailyKcalGoal: true,
      dailyProteinGoal: true,
      dailyCarbsGoal: true,
      dailyFatGoal: true,
      defaultEvalTone: true,
    },
  });

  return (
    <main className="space-y-6 px-4 py-10">
      <Link
        href="/today"
        className="-ml-2 inline-flex items-center gap-1 text-sm text-neutral-400 transition hover:text-neutral-200"
      >
        <ChevronLeft size={16} />
        Today
      </Link>

      <h1 className="text-2xl font-bold tracking-tight text-white">Settings</h1>

      {user ? <ToneSelector initial={user.defaultEvalTone} /> : null}

      <GoalsForm
        initial={{
          dailyKcalGoal: user?.dailyKcalGoal ?? null,
          dailyProteinGoal: user?.dailyProteinGoal ?? null,
          dailyCarbsGoal: user?.dailyCarbsGoal ?? null,
          dailyFatGoal: user?.dailyFatGoal ?? null,
        }}
      />

      <GlassCard className="space-y-3 p-4">
        <p className="text-xs font-medium tracking-wider text-neutral-400 uppercase">Account</p>
        <p className="text-sm text-white">{user?.name ?? 'You'}</p>
        <p className="text-xs text-neutral-500">{user?.email}</p>
        <form
          action={async () => {
            'use server';
            await signOut({ redirectTo: '/login' });
          }}
          className="pt-2"
        >
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-neutral-300 transition hover:bg-white/[0.08]"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </form>
      </GlassCard>
    </main>
  );
}
