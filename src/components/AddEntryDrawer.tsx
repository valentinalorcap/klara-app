'use client';

import { useState, useTransition } from 'react';
import { Drawer } from 'vaul';
import { IngredientPicker, type LibraryItem } from './IngredientPicker';
import { logEntry } from '@/app/(app)/today/actions';
import { MEAL_TYPE_LABELS, type MealType } from '@/lib/meals';
import { isoDate } from '@/lib/meals';

type Row = {
  name: string;
  grams: string;
  resolved: boolean;
  productId?: string;
  recipeId?: string;
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
};

function emptyRow(): Row {
  return {
    name: '',
    grams: '',
    resolved: false,
    kcalPer100g: 0,
    proteinPer100g: 0,
    carbsPer100g: 0,
    fatPer100g: 0,
  };
}

export function AddEntryDrawer({
  type,
  items,
  open,
  onOpenChange,
}: {
  type: MealType;
  items: LibraryItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [row, setRow] = useState<Row>(emptyRow());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setRow(emptyRow());
    setError(null);
  }

  function save() {
    if (!row.resolved) {
      setError('Pick a food or ask Klara first.');
      return;
    }
    const grams = Number(row.grams);
    if (!Number.isFinite(grams) || grams <= 0) {
      setError('Enter grams greater than 0.');
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await logEntry({
        date: isoDate(new Date()),
        type,
        entry: {
          name: row.name.trim(),
          grams,
          productId: row.productId,
          recipeId: row.recipeId,
          kcalPer100g: row.kcalPer100g,
          proteinPer100g: row.proteinPer100g,
          carbsPer100g: row.carbsPer100g,
          fatPer100g: row.fatPer100g,
        },
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      reset();
      onOpenChange(false);
    });
  }

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-w-md flex-col rounded-t-3xl border border-white/10 bg-[#1a1633] pb-[env(safe-area-inset-bottom)] outline-none">
          <Drawer.Title className="sr-only">Add to {MEAL_TYPE_LABELS[type]}</Drawer.Title>
          <Drawer.Description className="sr-only">
            Pick a food or ask Klara, then enter how many grams.
          </Drawer.Description>

          <div className="mx-auto mt-3 h-1 w-12 rounded-full bg-white/15" />

          <div className="space-y-4 px-6 py-6">
            <div>
              <p className="text-xs tracking-wider text-neutral-400 uppercase">
                Add to {MEAL_TYPE_LABELS[type]}
              </p>
              <h2 className="mt-1 text-xl font-semibold text-white">What did you have?</h2>
            </div>

            <IngredientPicker
              value={row.name}
              items={items}
              onNameChange={(name) =>
                setRow((r) => ({
                  ...r,
                  name,
                  resolved: r.resolved && r.name === name,
                }))
              }
              onSelectItem={(item) =>
                setRow((r) => ({
                  ...r,
                  name: item.name,
                  productId: item.kind === 'product' ? item.id : undefined,
                  recipeId: item.kind === 'recipe' ? item.id : undefined,
                  resolved: true,
                  kcalPer100g: item.kcalPer100g,
                  proteinPer100g: item.proteinPer100g,
                  carbsPer100g: item.carbsPer100g,
                  fatPer100g: item.fatPer100g,
                }))
              }
              onAiResolved={(data) =>
                setRow((r) => ({
                  ...r,
                  name: data.canonicalName,
                  productId: undefined,
                  recipeId: undefined,
                  resolved: true,
                  kcalPer100g: data.kcalPer100g,
                  proteinPer100g: data.proteinPer100g,
                  carbsPer100g: data.carbsPer100g,
                  fatPer100g: data.fatPer100g,
                  grams:
                    data.estimatedGrams && r.grams.trim() === ''
                      ? String(data.estimatedGrams)
                      : r.grams,
                }))
              }
              onError={(msg) => setError(msg)}
            />

            <label className="block">
              <span className="text-xs text-neutral-400">Grams</span>
              <input
                type="number"
                inputMode="decimal"
                value={row.grams}
                onChange={(e) => setRow((r) => ({ ...r, grams: e.target.value }))}
                placeholder="100"
                className="mt-1 block w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-neutral-500 focus:bg-white/[0.08] focus:ring-2 focus:ring-[var(--accent)]/60 focus:outline-none"
              />
            </label>

            {row.resolved ? (
              <p className="text-[11px] text-neutral-500 tabular-nums">
                {Math.round(row.kcalPer100g)} kcal · P {row.proteinPer100g.toFixed(1)}g · C{' '}
                {row.carbsPer100g.toFixed(1)}g · F {row.fatPer100g.toFixed(1)}g · per 100g
              </p>
            ) : null}

            {error ? (
              <p className="text-xs text-[var(--danger)]" role="alert">
                {error}
              </p>
            ) : null}

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={save}
                disabled={pending}
                className="w-full rounded-2xl bg-[var(--accent)] px-4 py-3.5 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_var(--accent-glow)] transition hover:bg-[var(--accent-hover)] active:scale-[0.98] disabled:opacity-50"
              >
                {pending ? 'Saving…' : 'Log it'}
              </button>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="block w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-sm font-medium text-neutral-300 transition hover:bg-white/[0.08]"
              >
                Cancel
              </button>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
