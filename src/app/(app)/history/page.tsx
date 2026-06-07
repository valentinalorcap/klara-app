import { ChevronLeft, ChevronRight, Sparkles, Star } from 'lucide-react';
import Link from 'next/link';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { GlassCard } from '@/components/GlassCard';
import { HistoryCalendar } from '@/components/HistoryCalendar';
import { WeekChart } from '@/components/WeekChart';
import {
  buildMonthGrid,
  categorizeKcal,
  computeStreak,
  daysInMonth,
  weekDays,
  weekRangeLabel,
  weekStartFor,
  shiftWeek,
  type CalendarDay,
} from '@/lib/history';
import { computeFetchRange, loadDailyTotalsRange, pickBestDay } from '@/lib/history.server';
import { isoDate } from '@/lib/meals';

type SearchParams = { month?: string; week?: string };

function parseMonth(input: string | undefined, fallback: { year: number; month0: number }) {
  if (input && /^\d{4}-\d{2}$/.test(input)) {
    const [y, m] = input.split('-').map(Number);
    if (m >= 1 && m <= 12) return { year: y, month0: m - 1 };
  }
  return fallback;
}

function parseWeek(input: string | undefined, fallback: string): string {
  if (input && /^\d{4}-\d{2}-\d{2}$/.test(input)) return weekStartFor(input);
  return fallback;
}

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
] as const;

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  const userId = session!.user.id;
  const params = await searchParams;

  const todayKey = isoDate(new Date());
  const todayY = Number(todayKey.slice(0, 4));
  const todayM = Number(todayKey.slice(5, 7)) - 1;

  const { year, month0 } = parseMonth(params.month, { year: todayY, month0: todayM });
  const monthFirstKey = `${year}-${String(month0 + 1).padStart(2, '0')}-01`;
  const monthLastKey = `${year}-${String(month0 + 1).padStart(2, '0')}-${String(
    daysInMonth(year, month0),
  ).padStart(2, '0')}`;
  const weekStartKey = parseWeek(params.week, weekStartFor(todayKey));

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { dailyKcalGoal: true },
  });
  const target = user?.dailyKcalGoal ?? null;

  const range = computeFetchRange({
    monthFirstKey,
    monthLastKey,
    weekStartKey,
    todayKey,
  });
  const totals = await loadDailyTotalsRange(userId, range.fromKey, range.toKey);

  const grid = buildMonthGrid(year, month0);
  const cells: Array<CalendarDay | null> = grid.map((cell) => {
    if (!cell) return null;
    const t = totals.get(cell.date) ?? {
      kcal: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      mealCount: 0,
    };
    return {
      date: cell.date,
      totals: { kcal: t.kcal, protein: t.protein, carbs: t.carbs, fat: t.fat },
      mealCount: t.mealCount,
      status: categorizeKcal(t.kcal, target),
      isFuture: cell.date > todayKey,
      isToday: cell.date === todayKey,
    };
  });

  const monthCellsWithData = cells.filter(
    (c): c is CalendarDay => c !== null && c.totals.kcal > 0 && !c.isFuture,
  );
  const totalKcal = monthCellsWithData.reduce((s, c) => s + c.totals.kcal, 0);
  const avgKcal = monthCellsWithData.length ? Math.round(totalKcal / monthCellsWithData.length) : 0;
  const inTargetCount = monthCellsWithData.filter((c) => c.status === 'on-target').length;
  const totalDaysInMonth = cells.filter((c): c is CalendarDay => c !== null).length;
  const streak = computeStreak(
    todayKey,
    new Map(
      [...totals].map(([k, v]) => [
        k,
        { kcal: v.kcal, protein: v.protein, carbs: v.carbs, fat: v.fat },
      ]),
    ),
    target,
  );

  const weekKeys = weekDays(weekStartKey);
  const weekValues = weekKeys.map((k) => totals.get(k)?.kcal ?? 0);
  const weekWithData = weekValues.filter((v) => v > 0);
  const weekAvg = weekWithData.length
    ? Math.round(weekWithData.reduce((s, v) => s + v, 0) / weekWithData.length)
    : 0;

  const best = pickBestDay(totals, weekKeys, target);

  const prevMonth = month0 === 0 ? { y: year - 1, m: 11 } : { y: year, m: month0 - 1 };
  const nextMonth = month0 === 11 ? { y: year + 1, m: 0 } : { y: year, m: month0 + 1 };
  const monthQS = (y: number, m: number) =>
    `?month=${y}-${String(m + 1).padStart(2, '0')}&week=${weekStartKey}`;
  const weekQS = (w: string) => `?month=${year}-${String(month0 + 1).padStart(2, '0')}&week=${w}`;

  return (
    <main className="space-y-5 px-6 py-10">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-white">History</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Your month at a glance, plus a week-by-week trend.
        </p>
      </header>

      <div className="flex items-center justify-between">
        <Link
          href={`/history${monthQS(prevMonth.y, prevMonth.m)}`}
          className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-400 transition hover:bg-white/5 hover:text-white"
          aria-label="Previous month"
        >
          <ChevronLeft size={18} />
        </Link>
        <p className="text-sm font-semibold text-white">
          {MONTH_NAMES[month0]} {year}
        </p>
        <Link
          href={`/history${monthQS(nextMonth.y, nextMonth.m)}`}
          className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-400 transition hover:bg-white/5 hover:text-white"
          aria-label="Next month"
        >
          <ChevronRight size={18} />
        </Link>
      </div>

      <GlassCard className="grid grid-cols-3 gap-2 p-5 text-center">
        <Stat label="AVG KCAL/DAY" value={avgKcal ? avgKcal.toLocaleString() : '—'} />
        <div className="border-x border-white/5">
          <Stat label="DAYS IN TARGET" value={`${inTargetCount}`} suffix={`/${totalDaysInMonth}`} />
        </div>
        <Stat label="CURRENT STREAK" value={streak === 0 ? '—' : `${streak}`} accent />
      </GlassCard>

      <HistoryCalendar cells={cells} />

      <WeekChart
        weekStartKey={weekStartKey}
        rangeLabel={weekRangeLabel(weekStartKey)}
        dailyKcal={weekValues}
        avgKcal={weekAvg}
        target={target}
        prevHref={`/history${weekQS(shiftWeek(weekStartKey, -1))}`}
        nextHref={`/history${weekQS(shiftWeek(weekStartKey, 1))}`}
        todayKey={todayKey}
      />

      {best ? (
        <Link href={`/history/${best.date}`} className="block">
          <GlassCard
            noAnimate
            className="flex items-center gap-4 p-5 transition hover:border-white/20"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-yellow-400/15 text-yellow-400">
              <Star size={18} fill="currentColor" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                Best day this week
              </p>
              <p className="mt-0.5 text-sm font-semibold text-white">{best.date}</p>
              <p className="mt-0.5 text-xs text-neutral-400 tabular-nums">
                {Math.round(best.totals.kcal)} kcal · P {best.totals.protein.toFixed(0)}g · in
                target
              </p>
            </div>
            <ChevronRight size={16} className="text-neutral-500" />
          </GlassCard>
        </Link>
      ) : (
        <GlassCard noAnimate className="flex items-center gap-3 p-4">
          <Sparkles size={16} className="text-[var(--accent)]" />
          <p className="text-xs text-neutral-400">
            Log a few days this week and Klara will surface your best one here.
          </p>
        </GlassCard>
      )}
    </main>
  );
}

function Stat({
  label,
  value,
  suffix,
  accent,
}: {
  label: string;
  value: string;
  suffix?: string;
  accent?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">{label}</p>
      <p
        className={`mt-2 text-2xl font-bold tabular-nums ${
          accent ? 'text-[var(--accent)]' : 'text-white'
        }`}
      >
        {value}
        {suffix ? <span className="text-sm font-medium text-neutral-500">{suffix}</span> : null}
      </p>
    </div>
  );
}
