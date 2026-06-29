'use client';

import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, CalendarCheck } from 'lucide-react';
import { shiftDay, formatDayParts } from '@/lib/meals';

/**
 * Day navigator for the Today tab (option C): edge arrows, a big tappable
 * date that opens the native date picker, and a "Today" chip shown when
 * viewing any other day. Navigation is just `/today?date=YYYY-MM-DD`
 * (or `/today` for today, to keep that URL clean).
 */
export function DayNav({ dateKey, todayKey }: { dateKey: string; todayKey: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const isToday = dateKey === todayKey;
  const { weekday, monthDay } = formatDayParts(dateKey);

  function go(key: string) {
    router.push(key === todayKey ? '/today' : `/today?date=${key}`);
  }

  function openPicker() {
    const el = inputRef.current;
    if (!el) return;
    if (typeof el.showPicker === 'function') el.showPicker();
    else el.click();
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          aria-label="Previous day"
          onClick={() => go(shiftDay(dateKey, -1))}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-neutral-200 transition hover:bg-white/10 active:scale-95"
        >
          <ChevronLeft size={20} />
        </button>

        <button
          type="button"
          onClick={openPicker}
          className="flex flex-1 items-center justify-center text-center"
        >
          <span className="text-base font-bold tracking-tight whitespace-nowrap text-white">
            {weekday} - {monthDay}
          </span>
          <input
            ref={inputRef}
            type="date"
            value={dateKey}
            onChange={(e) => {
              if (e.target.value) go(e.target.value);
            }}
            className="sr-only"
            aria-hidden
            tabIndex={-1}
          />
        </button>

        <button
          type="button"
          aria-label="Next day"
          onClick={() => go(shiftDay(dateKey, 1))}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-neutral-200 transition hover:bg-white/10 active:scale-95"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {!isToday ? (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => go(todayKey)}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--accent)]/25 bg-[var(--accent)]/10 px-3 py-1 text-xs font-medium text-[var(--accent-text)] transition hover:bg-[var(--accent)]/20"
          >
            <CalendarCheck size={12} />
            Today
          </button>
        </div>
      ) : null}
    </div>
  );
}
