'use client';

import { useState, useTransition } from 'react';
import { Sparkles, Search, Package, ChefHat } from 'lucide-react';
import { type LibraryItem } from './IngredientPicker';
import { estimateMealAction } from '@/app/(app)/today/actions';
import type { EstimationEntry } from '@/lib/freeTextEstimation';
import { cn } from '@/lib/utils';

type RecipeWithDefaultGrams = LibraryItem & { kind: 'recipe'; defaultGrams: number };

export function IngredientSearch({
  items,
  onAddItem,
  onAddEstimate,
  onError,
}: {
  items: LibraryItem[];
  onAddItem: (item: LibraryItem, grams: number) => void;
  onAddEstimate: (entries: EstimationEntry[]) => void;
  onError: (message: string) => void;
}) {
  const [value, setValue] = useState('');
  const [estimating, startEstimate] = useTransition();

  const trimmed = value.trim();
  const filtered = trimmed
    ? items.filter((i) => i.name.toLowerCase().includes(trimmed.toLowerCase())).slice(0, 6)
    : [];

  function pickItem(item: LibraryItem) {
    let grams = 100;
    if (item.kind === 'recipe') {
      const r = item as RecipeWithDefaultGrams;
      if (r.defaultGrams) grams = Math.round(r.defaultGrams);
    }
    onAddItem(item, grams);
    setValue('');
  }

  function askKlara() {
    if (trimmed.length < 3 || estimating) return;
    startEstimate(async () => {
      const result = await estimateMealAction(trimmed);
      if (!result.ok) {
        onError(result.error);
        return;
      }
      onAddEstimate(result.data.entries);
      setValue('');
    });
  }

  const showKlaraOption = trimmed.length >= 3;
  const showDropdown = filtered.length > 0 || showKlaraOption;

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search
          size={14}
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-neutral-500"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Add ingredient or describe…"
          className="block w-full rounded-2xl border border-white/10 bg-white/[0.04] py-2.5 pr-3 pl-9 text-sm text-white placeholder:text-neutral-500 focus:bg-white/[0.08] focus:ring-2 focus:ring-[var(--accent)]/60 focus:outline-none"
        />
      </div>

      {showDropdown ? (
        <ul className="space-y-1 rounded-2xl border border-white/10 bg-white/[0.04] p-1">
          {filtered.map((item) => (
            <li key={`${item.kind}-${item.id}`}>
              <button
                type="button"
                onClick={() => pickItem(item)}
                className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm text-white transition hover:bg-white/5"
              >
                <span className="flex min-w-0 items-center gap-2">
                  {item.kind === 'recipe' ? (
                    <ChefHat size={12} className="shrink-0 text-neutral-500" />
                  ) : (
                    <Package size={12} className="shrink-0 text-neutral-500" />
                  )}
                  <span className="truncate">{item.name}</span>
                </span>
                <span className="shrink-0 text-[10px] tracking-wider text-neutral-500 uppercase">
                  {item.kind}
                </span>
              </button>
            </li>
          ))}
          {showKlaraOption ? (
            <li>
              <button
                type="button"
                onClick={askKlara}
                disabled={estimating}
                className={cn(
                  'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-[var(--accent)] transition hover:bg-[var(--accent)]/10 disabled:cursor-not-allowed disabled:opacity-50',
                )}
              >
                <Sparkles size={12} className={cn(estimating && 'animate-pulse')} />
                {estimating ? 'Klara is thinking…' : 'Ask Klara to add these'}
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
