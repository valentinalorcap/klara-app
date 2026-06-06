'use client';

import Link from 'next/link';
import { GlassCard } from './GlassCard';
import { type CalendarDay } from '@/lib/history';
import { cn } from '@/lib/utils';

const HEADERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function HistoryCalendar({
  cells,
  weekQS,
}: {
  cells: Array<CalendarDay | null>;
  /** Builder for the href that sets the displayed week to one containing the picked day. */
  weekQS: (date: string) => string;
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
          const noGoal = cell.status === 'no-goal';
          const cellInner = (
            <div className="relative mx-auto flex h-9 w-9 items-center justify-center">
              <div
                className={cn(
                  'absolute inset-0 rounded-full',
                  cell.status === 'on-target' && 'bg-[var(--accent)]',
                  cell.status === 'near' && 'bg-[var(--accent)]/55',
                  cell.status === 'under' && 'bg-[var(--accent)]/25',
                  cell.status === 'over' && 'bg-[var(--macro-protein)]',
                  noGoal && cell.totals.kcal > 0 && 'bg-white/10',
                  empty && !cell.isFuture && 'border border-dashed border-white/15',
                  cell.isFuture && 'border border-white/[0.06]',
                )}
              />
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
                      : cell.status === 'on-target' || cell.status === 'over'
                        ? 'font-bold text-white'
                        : 'font-medium text-white',
                )}
              >
                {day}
              </span>
            </div>
          );

          if (cell.isFuture || cell.totals.kcal === 0) {
            // Future days and empty past days aren't tappable.
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

      {/* Legend */}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[10px] tracking-wide text-neutral-500">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-[var(--accent)]/25" aria-hidden /> Under
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-[var(--accent)]/55" aria-hidden /> Near
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-[var(--accent)]" aria-hidden /> On target
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-[var(--macro-protein)]" aria-hidden /> Over
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full border border-dashed border-white/30" aria-hidden />{' '}
          No data
        </span>
      </div>
      {/* The weekQS callback is here for future "tap a day to also jump the
          chart to that week" — wired but not exposed in the cell click yet. */}
      <span className="hidden" aria-hidden>
        {weekQS('placeholder')}
      </span>
    </GlassCard>
  );
}
