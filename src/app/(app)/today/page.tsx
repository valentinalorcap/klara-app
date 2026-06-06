import Link from 'next/link';
import { Plus, Settings } from 'lucide-react';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { GlassCard } from '@/components/GlassCard';
import { MealCard } from '@/components/MealCard';
import { MacroRing, MACRO_COLORS } from '@/components/MacroRing';
import { EvalPoller } from '@/components/EvalPoller';
import { KlaraTakeCard } from '@/components/KlaraTakeCard';
import { EvalStatus } from '@prisma/client';
import { isoDate, sumEntries } from '@/lib/meals';
import { hasAnyGoal } from '@/lib/goals';

export default async function TodayPage() {
  const session = await auth();
  const userId = session!.user.id;
  const firstName = session?.user?.name?.split(' ')[0] ?? 'friend';

  const dayKey = isoDate(new Date());
  const dayDate = new Date(dayKey + 'T00:00:00Z');

  const [user, meals] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        dailyKcalGoal: true,
        dailyProteinGoal: true,
        dailyCarbsGoal: true,
        dailyFatGoal: true,
      },
    }),
    prisma.meal.findMany({
      where: { userId, date: dayDate },
      // Tiebreaker by id so meals saved in the same transaction (batch)
      // always render in a stable order across refreshes.
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: { entries: { orderBy: { createdAt: 'asc' } }, evaluation: true },
    }),
  ]);

  const goals = {
    dailyKcalGoal: user?.dailyKcalGoal ?? null,
    dailyProteinGoal: user?.dailyProteinGoal ?? null,
    dailyCarbsGoal: user?.dailyCarbsGoal ?? null,
    dailyFatGoal: user?.dailyFatGoal ?? null,
  };
  const goalsSet = hasAnyGoal(goals);

  const allEntries = meals.flatMap((m) => m.entries);
  const dayTotals = sumEntries(allEntries);
  const hasPendingEvals = meals.some((m) => m.evaluation?.status === EvalStatus.PENDING);
  // In a batch, all meals share the same createdAt; only the last one
  // carries the evaluation. Find the first meal with an eval row instead
  // of assuming meals[0] is the one.
  const latestEval = meals.find((m) => m.evaluation)?.evaluation ?? null;

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
          <Link
            href="/settings"
            aria-label="Settings"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-neutral-300 backdrop-blur-xl transition hover:bg-white/10"
          >
            <Settings size={16} />
          </Link>
        </div>
      </header>

      <GlassCard className="p-6">
        <p className="text-xs font-medium tracking-wider text-neutral-400 uppercase">
          Today so far
        </p>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <MacroRing
            size="lg"
            current={dayTotals.protein}
            target={goals.dailyProteinGoal}
            color={MACRO_COLORS.protein}
            label="g protein"
            valueText={dayTotals.protein.toFixed(1)}
          />
          <MacroRing
            size="lg"
            current={dayTotals.kcal}
            target={goals.dailyKcalGoal}
            color={MACRO_COLORS.kcal}
            label="kcal"
            valueText={Math.round(dayTotals.kcal).toString()}
          />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-4">
          <MacroRing
            size="sm"
            current={dayTotals.carbs}
            target={goals.dailyCarbsGoal}
            color={MACRO_COLORS.carbs}
            label="g carbs"
            valueText={dayTotals.carbs.toFixed(0)}
            className="mx-auto max-w-[7rem]"
          />
          <MacroRing
            size="sm"
            current={dayTotals.fat}
            target={goals.dailyFatGoal}
            color={MACRO_COLORS.fat}
            label="g fat"
            valueText={dayTotals.fat.toFixed(0)}
            className="mx-auto max-w-[7rem]"
          />
        </div>

        {!goalsSet ? (
          <Link
            href="/settings"
            className="mt-4 block rounded-2xl border border-dashed border-white/15 px-4 py-3 text-center text-xs text-[var(--accent)] transition hover:border-[var(--accent)]/60 hover:bg-[var(--accent)]/5"
          >
            Set your daily goals to see progress →
          </Link>
        ) : null}
      </GlassCard>

      <EvalPoller hasPending={hasPendingEvals} />

      {latestEval ? (
        <KlaraTakeCard
          take={{
            mealId: latestEval.mealId,
            status: latestEval.status,
            tone: latestEval.tone,
            markdown: latestEval.markdown,
            errorMessage: latestEval.errorMessage,
          }}
        />
      ) : null}

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
                isFavorite: m.templateId !== null,
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
