import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { GlassCard } from '@/components/GlassCard';
import { MealCard } from '@/components/MealCard';
import { MacroRing, MACRO_COLORS } from '@/components/MacroRing';
import { KlaraTakeCard } from '@/components/KlaraTakeCard';
import { sumEntries } from '@/lib/meals';
import { dayScore } from '@/lib/dayScore';

type Params = { date: string };

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

function formatPrettyDate(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const weekday = WEEKDAY_NAMES[date.getUTCDay()];
  return `${weekday}, ${MONTH_NAMES[m - 1]} ${d}`;
}

export default async function HistoryDayPage({ params }: { params: Promise<Params> }) {
  const { date: dateKey } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) notFound();

  const session = await auth();
  const userId = session!.user.id;

  const dayDate = new Date(`${dateKey}T00:00:00Z`);

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
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: { entries: { orderBy: { createdAt: 'asc' } }, evaluation: true },
    }),
  ]);

  const totals = sumEntries(meals.flatMap((m) => m.entries));
  const score = meals.length
    ? dayScore(totals, {
        dailyKcalGoal: user?.dailyKcalGoal ?? null,
        dailyProteinGoal: user?.dailyProteinGoal ?? null,
        dailyCarbsGoal: user?.dailyCarbsGoal ?? null,
        dailyFatGoal: user?.dailyFatGoal ?? null,
      })
    : null;
  const latestEval =
    meals
      .map((m) => m.evaluation)
      .filter((e): e is NonNullable<typeof e> => e !== null)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0] ?? null;

  const returnTo = `/history/${dateKey}`;

  return (
    <main className="space-y-5 px-6 py-10">
      <Link
        href="/history"
        className="-ml-2 inline-flex items-center gap-1 text-sm text-neutral-400 transition hover:text-neutral-200"
      >
        <ChevronLeft size={16} />
        History
      </Link>

      <header>
        <p className="text-sm text-neutral-400">{formatPrettyDate(dateKey)}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">Day breakdown</h1>
      </header>

      <GlassCard className="p-6">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium tracking-wider text-neutral-400 uppercase">Totals</p>
          {score ? (
            <span
              className="rounded-full px-2.5 py-1 text-xs font-semibold"
              style={{
                color: score.color,
                backgroundColor: `${score.color}22`,
                border: `1px solid ${score.color}55`,
              }}
            >
              Score {score.score} · {score.label}
            </span>
          ) : null}
        </div>
        <div className="mt-2 flex justify-center">
          <div className="w-36">
            <MacroRing
              size="lg"
              current={totals.kcal}
              target={user?.dailyKcalGoal ?? null}
              color={MACRO_COLORS.kcal}
              label="kcal"
              valueText={Math.round(totals.kcal).toString()}
            />
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3">
          <MacroRing
            size="sm"
            current={totals.protein}
            target={user?.dailyProteinGoal ?? null}
            color={MACRO_COLORS.protein}
            label="g protein"
            valueText={totals.protein.toFixed(0)}
            className="mx-auto max-w-[6.5rem]"
          />
          <MacroRing
            size="sm"
            current={totals.carbs}
            target={user?.dailyCarbsGoal ?? null}
            color={MACRO_COLORS.carbs}
            label="g carbs"
            valueText={totals.carbs.toFixed(0)}
            className="mx-auto max-w-[6.5rem]"
          />
          <MacroRing
            size="sm"
            current={totals.fat}
            target={user?.dailyFatGoal ?? null}
            color={MACRO_COLORS.fat}
            label="g fat"
            valueText={totals.fat.toFixed(0)}
            className="mx-auto max-w-[6.5rem]"
          />
        </div>
      </GlassCard>

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
          <p className="text-sm text-neutral-300">No meals logged this day.</p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {meals.map((m) => (
            <MealCard
              key={m.id}
              returnTo={returnTo}
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
