'use client';

import { useState, useTransition } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { AddEntryDrawer } from './AddEntryDrawer';
import { deleteEntry } from '@/app/(app)/today/actions';
import { MEAL_TYPE_LABELS, type MealType, sumEntries, entryMacros } from '@/lib/meals';
import type { LibraryItem } from './IngredientPicker';

export type EntryRow = {
  id: string;
  name: string;
  grams: number;
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
};

export function MealSection({
  type,
  entries,
  items,
}: {
  type: MealType;
  entries: EntryRow[];
  items: LibraryItem[];
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const sectionTotals = sumEntries(entries);

  return (
    <>
      <GlassCard className="p-5">
        <div className="flex items-baseline justify-between">
          <p className="text-xs font-medium tracking-wider text-neutral-400 uppercase">
            {MEAL_TYPE_LABELS[type]}
          </p>
          {entries.length > 0 ? (
            <p className="text-xs text-neutral-300 tabular-nums">
              {Math.round(sectionTotals.kcal)} kcal
            </p>
          ) : null}
        </div>

        {entries.length === 0 ? (
          <p className="mt-2 text-xs text-neutral-500">No entries yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-white/5">
            {entries.map((entry) => (
              <EntryListRow key={entry.id} entry={entry} />
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-white/15 px-4 py-2.5 text-xs font-medium text-[var(--accent)] transition hover:border-[var(--accent)]/60 hover:bg-[var(--accent)]/5"
        >
          <Plus size={14} /> Add to {MEAL_TYPE_LABELS[type].toLowerCase()}
        </button>
      </GlassCard>

      <AddEntryDrawer type={type} items={items} open={drawerOpen} onOpenChange={setDrawerOpen} />
    </>
  );
}

function EntryListRow({ entry }: { entry: EntryRow }) {
  const macros = entryMacros(entry);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`Remove ${entry.name}?`)) return;
    startTransition(async () => {
      await deleteEntry(entry.id);
    });
  }

  return (
    <li className="flex items-center gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-white">{entry.name}</p>
        <p className="truncate text-[11px] text-neutral-500 tabular-nums">
          {entry.grams.toFixed(0)}g · {Math.round(macros.kcal)} kcal · P {macros.protein.toFixed(1)}
          g · C {macros.carbs.toFixed(1)}g · F {macros.fat.toFixed(1)}g
        </p>
      </div>
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        aria-label="Remove entry"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-neutral-400 transition hover:text-[var(--danger)] disabled:opacity-30"
      >
        <Trash2 size={14} />
      </button>
    </li>
  );
}
