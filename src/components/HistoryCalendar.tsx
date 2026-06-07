'use client';

import Link from 'next/link';
import { GlassCard } from './GlassCard';
import { type CalendarDay } from '@/lib/history';
import { cn } from '@/lib/utils';

const HEADERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const OVER_COLOR = 'var(--danger)';

export function HistoryCalendar({
  cells,
  accentColor,
}: {
  cells: Array<CalendarDay | null>;
  /** CSS variable string for the macro the user picked, e.g. "var(--macro-protein)". */
  accentColor: string;
}) {
  return (
    <GlassCard noAnimate className="p-5">
      <div className="mb-3 grid grid-cols-7 gap-0 text-center">
        {HEADERS.map((h, i) => (
          <p
            key={i}
            className="text-[10px] font-semibold tracking-[0.15em] text-neutral-500 uppercase"
          >
            {h}
          </p>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-2">
        {cells.map((cell, i) => {
          if (!cell) return <div key={`pad-${i}`} aria-hidden />;
          const day = Number(cell.date.slice(8, 10));
          const empty = cell.totals.kcal === 0 || cell.status === 'no-data' || cell.isFuture;
          const noGoal = cell.status === 'no-goal' && cell.totals.kcal > 0;
          const showRing = !empty && !noGoal;

          const cellInner = (
            <div className="relative mx-auto flex h-9 w-9 items-center justify-center">
              {showRing ? (
                <DayRing pct={cell.pct} isOver={cell.status === 'over'} accentColor={accentColor} />
              ) : (
                <div
                  className={cn(
                    'absolute inset-0 rounded-full',
                    noGoal && 'bg-white/10',
                    empty && !cell.isFuture && 'border border-dashed border-white/15',
                    cell.isFuture && 'border border-white/[0.06]',
                  )}
                />
              )}
              {cell.isToday ? (
                <span
                  className="pointer-events-none absolute -inset-1 rounded-full border-2 border-white/70"
                  aria-hidden
                />
              ) : null}
              <span
                className={cn(
                  'relative text-xs tabular-nums',
                  cell.isFuture
                    ? 'text-neutral-600'
                    : empty
                      ? 'text-neutral-500'
                      : 'font-semibold text-white',
                )}
              >
                {day}
              </span>
            </div>
          );

          if (empty) {
            return <div key={cell.date}>{cellInner}</div>;
          }
          return (
            <Link
              key={cell.date}
              href={`/history/${cell.date}`}
              aria-label={`Open ${cell.date}`}
              onMouseDown={(e) => e.preventDefault()}
              className="block transition active:scale-95"
            >
              {cellInner}
            </Link>
          );
        })}
      </div>
    </GlassCard>
  );
}

const RADIUS = 16;
const CIRC = 2 * Math.PI * RADIUS;
const STROKE_WIDTH = 4;

function DayRing({
  pct,
  isOver,
  accentColor,
}: {
  pct: number;
  isOver: boolean;
  accentColor: string;
}) {
  // Match MacroRing's overflow look: red track + a full red arc, capped.
  const fillPct = isOver ? 1 : Math.min(Math.max(pct, 0), 1);
  const trackColor = isOver ? 'rgba(248, 113, 113, 0.25)' : 'rgba(255,255,255,0.10)';
  const strokeColor = isOver ? OVER_COLOR : accentColor;
  const dash = fillPct * CIRC;

  return (
    <svg viewBox="0 0 40 40" className="absolute inset-0 size-full -rotate-90" aria-hidden>
      <circle
        cx={20}
        cy={20}
        r={RADIUS}
        fill="none"
        stroke={trackColor}
        strokeWidth={STROKE_WIDTH}
      />
      {fillPct > 0 ? (
        <circle
          cx={20}
          cy={20}
          r={RADIUS}
          fill="none"
          stroke={strokeColor}
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${CIRC}`}
        />
      ) : null}
    </svg>
  );
}
