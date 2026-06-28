import Link from 'next/link';
import { Plus, Settings } from 'lucide-react';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { GlassCard } from '@/components/GlassCard';
import { MealList } from '@/components/MealList';
import { MacroRing, MACRO_COLORS } from '@/components/MacroRing';
import { EvalPoller } from '@/components/EvalPoller';
import { KlaraTakeCard } from '@/components/KlaraTakeCard';
import { DayNav } from '@/components/DayNav';
import { CopyDayButton } from '@/components/CopyDayButton';
import { FinishDayCard } from '@/components/FinishDayCard';
import { FinishDayButton } from '@/components/FinishDayButton';
import { EvalStatus } from '@prisma/client';
import { isoDate, isDateKey, formatDayLabel, sumEntries, mealMatchesTemplate } from '@/lib/meals';
import { hasAnyGoal } from '@/lib/goals';

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const session = await auth();
  const userId = session!.user.id;
  const firstName = session?.user?.name?.split(' ')[0] ?? 'friend';

  const { date } = await searchParams;
  const todayKey = isoDate(new Date());
  const dateKey = isDateKey(date) ? date : todayKey;
  const isToday = dateKey === todayKey;
  const isPast = dateKey < todayKey;
  const dayDate = new Date(dateKey + 'T00:00:00Z');
  const returnTo = isToday ? '/today' : `/today?date=${dateKey}`;
  const newMealHref = isToday ? '/today/new' : `/today/new?date=${dateKey}`;

  const [user, meals, dayEval] = await Promise.all([
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
      include: {
        entries: { orderBy: { createdAt: 'asc' } },
        evaluation: true,
        template: { include: { entries: true } },
      },
    }),
    prisma.dayEvaluation.findUnique({
      where: { userId_date: { userId, date: dayDate } },
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
  const dayEvalPending = dayEval?.status === EvalStatus.PENDING;
  const hasPendingEvals =
    meals.some((m) => m.evaluation?.status === EvalStatus.PENDING) || dayEvalPending;
  // The day review is stale if a meal changed after it was generated.
  const lastMealChange = meals.reduce((max, m) => Math.max(max, m.updatedAt.getTime()), 0);
  const dayEvalStale =
    dayEval?.status === EvalStatus.DONE && lastMealChange > dayEval.updatedAt.getTime();
  const latestEval =
    meals
      .map((m) => m.evaluation)
      .filter((e): e is NonNullable<typeof e> => e !== null)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0] ?? null;

  return (
    <main className="space-y-5 px-4 py-10">
      <header className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-white">Hi {firstName} 👋</h1>
          <div className="flex items-center gap-2">
            {isPast ? <CopyDayButton dateKey={dateKey} /> : null}
            <Link
              href="/settings"
              aria-label="Settings"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-neutral-300 backdrop-blur-xl transition hover:bg-white/10"
            >
              <Settings size={16} />
            </Link>
          </div>
        </div>
        <DayNav dateKey={dateKey} todayKey={todayKey} />
      </header>

      <GlassCard className="p-6">
        <p className="text-xs font-medium tracking-wider text-neutral-400 uppercase">
          {isToday ? 'Today so far' : formatDayLabel(dateKey)}
        </p>

        <div className="mt-2 flex justify-center">
          <div className="w-36">
            <MacroRing
              size="lg"
              current={dayTotals.kcal}
              target={goals.dailyKcalGoal}
              color={MACRO_COLORS.kcal}
              label="kcal"
              valueText={Math.round(dayTotals.kcal).toString()}
            />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <MacroRing
            size="sm"
            current={dayTotals.protein}
            target={goals.dailyProteinGoal}
            color={MACRO_COLORS.protein}
            label="g protein"
            valueText={dayTotals.protein.toFixed(0)}
            className="mx-auto max-w-[6.5rem]"
          />
          <MacroRing
            size="sm"
            current={dayTotals.carbs}
            target={goals.dailyCarbsGoal}
            color={MACRO_COLORS.carbs}
            label="g carbs"
            valueText={dayTotals.carbs.toFixed(0)}
            className="mx-auto max-w-[6.5rem]"
          />
          <MacroRing
            size="sm"
            current={dayTotals.fat}
            target={goals.dailyFatGoal}
            color={MACRO_COLORS.fat}
            label="g fat"
            valueText={dayTotals.fat.toFixed(0)}
            className="mx-auto max-w-[6.5rem]"
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

      <div className="flex gap-3">
        {meals.length > 0 ? <FinishDayButton dateKey={dateKey} closed={!!dayEval} /> : null}
        <Link
          href={newMealHref}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_var(--accent-glow)] transition hover:bg-[var(--accent-hover)] active:scale-[0.98]"
        >
          <Plus size={18} />
          Add meal
        </Link>
      </div>

      <EvalPoller hasPending={hasPendingEvals} />

      {dayEval ? (
        <FinishDayCard
          dateKey={dateKey}
          stale={dayEvalStale}
          take={{
            status: dayEval.status,
            tone: dayEval.tone,
            markdown: dayEval.markdown,
            errorMessage: dayEval.errorMessage,
          }}
        />
      ) : latestEval ? (
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
          <p className="text-sm text-neutral-300">
            {isToday ? 'No meals logged yet.' : 'No meals logged for this day.'}
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            Tap &quot;Add meal&quot; above to log one.
          </p>
        </GlassCard>
      ) : (
        <MealList
          returnTo={returnTo}
          meals={meals.map((m) => ({
            id: m.id,
            type: m.type,
            name: m.name,
            icon: m.icon,
            isFavorite: m.template ? mealMatchesTemplate(m.entries, m.template.entries) : false,
            entries: m.entries.map((e) => ({
              id: e.id,
              name: e.name,
              grams: e.grams,
              kcalPer100g: e.kcalPer100g,
              proteinPer100g: e.proteinPer100g,
              carbsPer100g: e.carbsPer100g,
              fatPer100g: e.fatPer100g,
            })),
          }))}
        />
      )}
    </main>
  );
}
