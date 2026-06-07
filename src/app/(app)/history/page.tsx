import { ChevronLeft, ChevronRight, Sparkles, Star } from 'lucide-react';
import Link from 'next/link';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { GlassCard } from '@/components/GlassCard';
import { HistoryCalendar } from '@/components/HistoryCalendar';
import { WeekChart } from '@/components/WeekChart';
import {
  buildMonthGrid,
  categorizeStatus,
  daysInMonth,
  METRICS,
  metricShortLabel,
  metricUnit,
  targetFor,
  valueFor,
  weekDays,
  weekRangeLabel,
  weekStartFor,
  shiftWeek,
  type CalendarDay,
  type Metric,
} from '@/lib/history';
import { computeFetchRange, loadDailyTotalsRange, pickBestDay } from '@/lib/history.server';
import { isoDate } from '@/lib/meals';
import { cn } from '@/lib/utils';

type SearchParams = { month?: string; week?: string; metric?: string };

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

function parseMetric(input: string | undefined): Metric {
  if (input === 'kcal' || input === 'protein' || input === 'carbs' || input === 'fat') return input;
  return 'kcal';
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

const METRIC_LONG: Record<Metric, string> = {
  kcal: 'Calories',
  protein: 'Protein',
  carbs: 'Carbs',
  fat: 'Fat',
};

/**
 * Tailwind classes spelled out per metric so the JIT picks them up. Each
 * "active" string uses the macro's own colour token (matches MacroRing),
 * so the pills read as a key to the calendar / chart colouring.
 */
const METRIC_PILL_ACTIVE: Record<Metric, string> = {
  kcal: 'border-[var(--macro-kcal)] bg-[var(--macro-kcal)]/15 text-[var(--macro-kcal)]',
  protein: 'border-[var(--macro-protein)] bg-[var(--macro-protein)]/15 text-[var(--macro-protein)]',
  carbs: 'border-[var(--macro-carbs)] bg-[var(--macro-carbs)]/15 text-[var(--macro-carbs)]',
  fat: 'border-[var(--macro-fat)] bg-[var(--macro-fat)]/15 text-[var(--macro-fat)]',
};

/** CSS variable reference per metric, used as a stroke/fill in SVG. */
const METRIC_VAR: Record<Metric, string> = {
  kcal: 'var(--macro-kcal)',
  protein: 'var(--macro-protein)',
  carbs: 'var(--macro-carbs)',
  fat: 'var(--macro-fat)',
};

function formatValue(value: number, metric: Metric): string {
  if (metric === 'kcal') return Math.round(value).toLocaleString();
  return Math.round(value).toString();
}

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
  const metric = parseMetric(params.metric);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      dailyKcalGoal: true,
      dailyProteinGoal: true,
      dailyCarbsGoal: true,
      dailyFatGoal: true,
    },
  });
  const target = user ? targetFor(user, metric) : null;

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
    const value = valueFor(t, metric);
    return {
      date: cell.date,
      totals: { kcal: t.kcal, protein: t.protein, carbs: t.carbs, fat: t.fat },
      mealCount: t.mealCount,
      status: categorizeStatus(value, target),
      isFuture: cell.date > todayKey,
      isToday: cell.date === todayKey,
      pct: target && target > 0 ? value / target : 0,
    };
  });

  const monthCellsWithData = cells.filter(
    (c): c is CalendarDay => c !== null && valueFor(c.totals, metric) > 0 && !c.isFuture,
  );
  const sumMetric = monthCellsWithData.reduce((s, c) => s + valueFor(c.totals, metric), 0);
  const avgMetric = monthCellsWithData.length
    ? Math.round(sumMetric / monthCellsWithData.length)
    : 0;
  const inTargetCount = monthCellsWithData.filter((c) => c.status === 'on-target').length;
  const totalDaysInMonth = cells.filter((c): c is CalendarDay => c !== null).length;

  const weekKeys = weekDays(weekStartKey);
  const weekValues = weekKeys.map((k) => {
    const t = totals.get(k);
    return t ? valueFor(t, metric) : 0;
  });
  const weekWithData = weekValues.filter((v) => v > 0);
  const weekAvg = weekWithData.length
    ? Math.round(weekWithData.reduce((s, v) => s + v, 0) / weekWithData.length)
    : 0;

  const best = pickBestDay(totals, weekKeys, target, (t) => valueFor(t, metric));

  const prevMonth = month0 === 0 ? { y: year - 1, m: 11 } : { y: year, m: month0 - 1 };
  const nextMonth = month0 === 11 ? { y: year + 1, m: 0 } : { y: year, m: month0 + 1 };
  const baseParams = `metric=${metric}`;
  const monthQS = (y: number, m: number) =>
    `?month=${y}-${String(m + 1).padStart(2, '0')}&week=${weekStartKey}&${baseParams}`;
  const weekQS = (w: string) =>
    `?month=${year}-${String(month0 + 1).padStart(2, '0')}&week=${w}&${baseParams}`;
  const metricQS = (m: Metric) =>
    `?month=${year}-${String(month0 + 1).padStart(2, '0')}&week=${weekStartKey}&metric=${m}`;

  const avgPct = target && target > 0 ? avgMetric / target : 0;
  const avgIsOver = avgPct > 1.1;
  const avgUnitShort = metric === 'kcal' ? 'kcal/day' : 'g/day';
  const vsGoalText = (() => {
    if (!target || target <= 0 || !avgMetric) return '—';
    const diff = avgMetric - target;
    const unit = metric === 'kcal' ? ' kcal' : 'g';
    if (diff < 0) return `Remains ${Math.round(Math.abs(diff))}${unit}`;
    if (diff > 0) return `Over by ${Math.round(diff)}${unit}`;
    return 'On target';
  })();

  return (
    <main className="space-y-5 px-6 py-10">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-white">History</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Your month at a glance, plus a week-by-week trend.
        </p>
      </header>

      {/* Metric selector — each pill in its macro colour. */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1">
        {METRICS.map((m) => {
          const active = m === metric;
          return (
            <Link
              key={m}
              scroll={false}
              href={`/history${metricQS(m)}`}
              className={cn(
                'shrink-0 rounded-full border px-4 py-2 text-xs font-medium transition',
                active
                  ? METRIC_PILL_ACTIVE[m]
                  : 'border-white/10 bg-white/[0.04] text-neutral-300 hover:bg-white/[0.08]',
              )}
            >
              {METRIC_LONG[m]}
            </Link>
          );
        })}
      </div>

      {/* Month nav */}
      <div className="flex items-center justify-between">
        <Link
          scroll={false}
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
          scroll={false}
          href={`/history${monthQS(nextMonth.y, nextMonth.m)}`}
          className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-400 transition hover:bg-white/5 hover:text-white"
          aria-label="Next month"
        >
          <ChevronRight size={18} />
        </Link>
      </div>

      <HistoryCalendar cells={cells} accentColor={METRIC_VAR[metric]} />

      {/* Hero stats — below the calendar so the calendar is the first thing in view. */}
      <GlassCard className="grid grid-cols-3 items-center gap-3 p-5">
        <div className="flex justify-center">
          <AvgRing
            pct={avgPct}
            isOver={avgIsOver}
            accentColor={METRIC_VAR[metric]}
            valueText={avgMetric ? formatValue(avgMetric, metric) : '—'}
            label={avgUnitShort}
          />
        </div>
        <div className="border-x border-white/5 px-2 text-center">
          <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
            vs goal
          </p>
          <p className="mt-2 text-sm font-bold text-white tabular-nums">{vsGoalText}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
            Days in target
          </p>
          <p className="mt-2 text-2xl font-bold text-white tabular-nums">
            {inTargetCount}
            <span className="text-sm font-medium text-neutral-500">/{totalDaysInMonth}</span>
          </p>
        </div>
      </GlassCard>

      <WeekChart
        weekStartKey={weekStartKey}
        rangeLabel={weekRangeLabel(weekStartKey)}
        dailyValues={weekValues}
        avgValue={weekAvg}
        target={target}
        lineColor={METRIC_VAR[metric]}
        unitLabel={metric === 'kcal' ? 'kcal/day' : 'g/day'}
        targetLabel={target ? `target ${Math.round(target)}${metric === 'kcal' ? '' : 'g'}` : null}
        isCurrentWeek={weekStartKey === weekStartFor(todayKey)}
        todayHref={`/history${weekQS(weekStartFor(todayKey))}`}
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
                {formatValue(valueFor(best.totals, metric), metric)}
                {metricUnit(metric)} · closest to target
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

/** Hero-stats donut that shows the average value inside the ring. */
function AvgRing({
  pct,
  isOver,
  accentColor,
  valueText,
  label,
}: {
  pct: number;
  isOver: boolean;
  accentColor: string;
  valueText: string;
  label: string;
}) {
  const fillPct = isOver ? 1 : Math.min(Math.max(pct, 0), 1);
  const trackColor = isOver ? 'rgba(248, 113, 113, 0.25)' : 'rgba(255,255,255,0.10)';
  const strokeColor = isOver ? 'var(--danger)' : accentColor;
  const RADIUS = 16;
  const CIRC = 2 * Math.PI * RADIUS;
  const STROKE = 3.5;
  const dash = fillPct * CIRC;
  return (
    <div className="relative size-20 shrink-0">
      <svg viewBox="0 0 40 40" className="size-full -rotate-90" aria-hidden>
        <circle cx={20} cy={20} r={RADIUS} fill="none" stroke={trackColor} strokeWidth={STROKE} />
        {fillPct > 0 ? (
          <circle
            cx={20}
            cy={20}
            r={RADIUS}
            fill="none"
            stroke={strokeColor}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${CIRC}`}
          />
        ) : null}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="text-sm font-bold text-white tabular-nums leading-none">{valueText}</p>
        <p className="mt-0.5 text-[9px] tracking-wider text-neutral-400 uppercase">{label}</p>
      </div>
    </div>
  );
}
