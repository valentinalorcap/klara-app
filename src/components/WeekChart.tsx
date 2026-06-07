import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { weekDays } from '@/lib/history';
import { cn } from '@/lib/utils';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function WeekChart({
  weekStartKey,
  rangeLabel,
  dailyValues,
  avgValue,
  target,
  unitLabel,
  targetLabel,
  prevHref,
  nextHref,
  todayKey,
}: {
  weekStartKey: string;
  rangeLabel: string;
  /** Mon → Sun. 0 = no data for that day. */
  dailyValues: number[];
  avgValue: number;
  target: number | null;
  /** "kcal/day", "g/day", etc. */
  unitLabel: string;
  /** Text rendered next to the dashed target line, or null to hide it. */
  targetLabel: string | null;
  prevHref: string;
  nextHref: string;
  todayKey: string;
}) {
  const keys = weekDays(weekStartKey);
  const hasAnyData = dailyValues.some((v) => v > 0);

  // y-axis range — symmetric around the target when set, else 0..max.
  const max = Math.max(target ?? 0, ...dailyValues);
  const min = 0;
  const yMin = Math.max(0, min);
  const yMax = max > 0 ? max * 1.1 : 2000;

  const CHART_W = 360;
  const CHART_H = 100;
  const PAD_X = 12;

  function xFor(i: number) {
    return PAD_X + (i * (CHART_W - PAD_X * 2)) / 6;
  }
  function yFor(v: number) {
    if (yMax === yMin) return CHART_H / 2;
    return CHART_H - ((v - yMin) / (yMax - yMin)) * CHART_H;
  }

  const polylinePoints = dailyValues
    .map((v, i) => (v > 0 ? `${xFor(i).toFixed(1)},${yFor(v).toFixed(1)}` : null))
    .filter((p): p is string => p !== null)
    .join(' ');

  return (
    <GlassCard noAnimate className="space-y-3 p-5">
      <div>
        <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">Average</p>
        <p className="mt-1 text-3xl font-bold text-white tabular-nums">
          {avgValue ? avgValue.toLocaleString() : '—'}
          <span className="ml-1 text-sm font-medium text-neutral-400">{unitLabel}</span>
        </p>
      </div>

      <div className="flex items-center justify-between">
        <Link
          href={prevHref}
          aria-label="Previous week"
          className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition hover:bg-white/5 hover:text-white"
        >
          <ChevronLeft size={16} />
        </Link>
        <p className="text-sm text-neutral-300">{rangeLabel}</p>
        <Link
          href={nextHref}
          aria-label="Next week"
          className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition hover:bg-white/5 hover:text-white"
        >
          <ChevronRight size={16} />
        </Link>
      </div>

      <div className="pt-3">
        <svg viewBox={`0 0 ${CHART_W} ${CHART_H + 22}`} className="w-full" role="img" aria-hidden>
          {target ? (
            <>
              <line
                x1={PAD_X}
                x2={CHART_W - PAD_X}
                y1={yFor(target)}
                y2={yFor(target)}
                stroke="rgba(255,255,255,0.15)"
                strokeDasharray="3 4"
              />
              {targetLabel ? (
                <text
                  x={CHART_W - PAD_X}
                  y={yFor(target) - 4}
                  textAnchor="end"
                  className="fill-neutral-600"
                  fontSize="9"
                  fontStyle="italic"
                >
                  {targetLabel}
                </text>
              ) : null}
            </>
          ) : null}

          {hasAnyData ? (
            <>
              <polyline
                fill="none"
                stroke="var(--accent)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={polylinePoints}
              />
              {dailyValues.map((v, i) => {
                if (v <= 0) return null;
                const isToday = keys[i] === todayKey;
                return (
                  <g key={i}>
                    {isToday ? (
                      <circle
                        cx={xFor(i)}
                        cy={yFor(v)}
                        r={7}
                        fill="var(--accent)"
                        fillOpacity={0.3}
                      />
                    ) : null}
                    <circle cx={xFor(i)} cy={yFor(v)} r={3.5} fill="var(--accent)" />
                  </g>
                );
              })}
            </>
          ) : null}

          {DAY_LABELS.map((d, i) => (
            <text
              key={d}
              x={xFor(i)}
              y={CHART_H + 16}
              textAnchor="middle"
              className={cn('fill-neutral-500', keys[i] === todayKey && 'fill-white font-semibold')}
              fontSize="10"
            >
              {d}
            </text>
          ))}
        </svg>

        {!hasAnyData ? (
          <p className="-mt-12 text-center text-xs text-neutral-500">No data this week yet.</p>
        ) : null}
      </div>
    </GlassCard>
  );
}
