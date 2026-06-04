import Link from 'next/link';
import { LogOut, Plus } from 'lucide-react';
import { auth, signOut } from '@/auth';
import { prisma } from '@/lib/prisma';
import { GlassCard } from '@/components/GlassCard';
import { MealCard } from '@/components/MealCard';
import { isoDate, sumEntries } from '@/lib/meals';

export default async function TodayPage() {
  const session = await auth();
  const userId = session!.user.id;
  const firstName = session?.user?.name?.split(' ')[0] ?? 'friend';

  const dayKey = isoDate(new Date());
  const dayDate = new Date(dayKey + 'T00:00:00Z');

  const meals = await prisma.meal.findMany({
    where: { userId, date: dayDate },
    orderBy: { createdAt: 'asc' },
    include: { entries: { orderBy: { createdAt: 'asc' } } },
  });

  const allEntries = meals.flatMap((m) => m.entries);
  const dayTotals = sumEntries(allEntries);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <main className="space-y-5 px-6 py-10">
      <header className="flex items-start justify-between">
        <div>
          <p className="text-sm text-neutral-400">{today}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">Hi {firstName} 👋</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/today/new"
            aria-label="Log a meal"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-[0_8px_24px_-8px_var(--accent-glow)] transition hover:bg-[var(--accent-hover)] active:scale-95"
          >
            <Plus size={20} />
          </Link>
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
        </div>
      </header>

      <GlassCard className="p-6">
        <p className="text-xs font-medium tracking-wider text-neutral-400 uppercase">
          Today so far
        </p>
        <p className="mt-2 text-4xl font-bold text-white tabular-nums">
          {Math.round(dayTotals.kcal)}{' '}
          <span className="text-base font-medium text-neutral-400">kcal</span>
        </p>
        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <Stat label="Protein" value={dayTotals.protein.toFixed(1) + 'g'} />
          <Stat label="Carbs" value={dayTotals.carbs.toFixed(1) + 'g'} />
          <Stat label="Fat" value={dayTotals.fat.toFixed(1) + 'g'} />
        </div>
      </GlassCard>

      {meals.length === 0 ? (
        <GlassCard className="p-8 text-center">
          <p className="text-sm text-neutral-300">No meals logged yet.</p>
          <p className="mt-1 text-xs text-neutral-500">Tap the + above to log your first one.</p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {meals.map((m) => (
            <MealCard
              key={m.id}
              meal={{
                id: m.id,
                type: m.type,
                name: m.name,
                isFavorite: m.isFavorite,
                entries: m.entries.map((e) => ({
                  id: e.id,
                  name: e.name,
                  grams: e.grams,
                  kcalPer100g: e.kcalPer100g,
                  proteinPer100g: e.proteinPer100g,
                  carbsPer100g: e.carbsPer100g,
                  fatPer100g: e.fatPer100g,
                })),
              }}
            />
          ))}
        </div>
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-base font-semibold text-white tabular-nums">{value}</p>
      <p className="mt-0.5 text-[10px] tracking-wider text-neutral-500 uppercase">{label}</p>
    </div>
  );
}
