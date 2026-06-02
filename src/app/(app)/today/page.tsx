import { LogOut } from 'lucide-react';
import { auth, signOut } from '@/auth';
import { GlassCard } from '@/components/GlassCard';

export default async function TodayPage() {
  const session = await auth();
  const firstName = session?.user?.name?.split(' ')[0] ?? 'friend';

  return (
    <main className="px-6 py-10">
      <header className="flex items-start justify-between">
        <div>
          <p className="text-sm text-neutral-400">Good morning</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">Hi {firstName} 👋</h1>
        </div>
        <form
          action={async () => {
            'use server';
            await signOut({ redirectTo: '/login' });
          }}
        >
          <button
            type="submit"
            aria-label="Sign out"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-neutral-300 backdrop-blur-xl transition hover:bg-white/10"
          >
            <LogOut size={16} />
          </button>
        </form>
      </header>

      <GlassCard className="mt-8 p-6 text-center">
        <p className="text-sm leading-relaxed text-neutral-400">
          Your day will live here: calories, protein, logged meals and smart suggestions.
        </p>
        <p className="mt-4 text-xs tracking-wider text-[var(--accent)] uppercase">Coming soon</p>
      </GlassCard>
    </main>
  );
}
