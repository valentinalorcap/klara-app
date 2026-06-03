'use client';

import { useState, useEffect, useRef, useTransition } from 'react';
import { Sparkles, Package, ChefHat, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { suggestIngredientMacros } from '@/app/(app)/recipes/lookup-actions';

export type ProductOption = {
  id: string;
  name: string;
  brand: string | null;
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
};

export type RecipeOption = {
  id: string;
  name: string;
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
};

export type LibraryItem =
  | ({ kind: 'product' } & ProductOption)
  | ({ kind: 'recipe' } & RecipeOption);

type IngredientPickerProps = {
  value: string;
  /** Library items shown in the dropdown. Pass an empty array if nothing
   *  applies (e.g. inside the recipe form, recipes shouldn't be selectable). */
  items: LibraryItem[];
  onNameChange: (name: string) => void;
  onSelectItem: (item: LibraryItem) => void;
  onAiResolved: (data: {
    canonicalName: string;
    kcalPer100g: number;
    proteinPer100g: number;
    carbsPer100g: number;
    fatPer100g: number;
    estimatedGrams?: number;
  }) => void;
  onError?: (msg: string) => void;
};

function matchKey(item: LibraryItem): string {
  return item.kind === 'product' ? `${item.name} ${item.brand ?? ''}` : item.name;
}

export function IngredientPicker({
  value,
  items,
  onNameChange,
  onSelectItem,
  onAiResolved,
  onError,
}: IngredientPickerProps) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const query = value.trim().toLowerCase();
  const matches = query ? items.filter((i) => matchKey(i).toLowerCase().includes(query)) : items;
  const showAiOption = query.length >= 2;

  function pickItem(item: LibraryItem) {
    onSelectItem(item);
    setOpen(false);
  }

  function askKlara() {
    if (!showAiOption || pending) return;
    startTransition(async () => {
      const result = await suggestIngredientMacros(value);
      if (!result.ok) {
        onError?.(result.error);
        return;
      }
      onAiResolved({
        canonicalName: result.data.canonicalName ?? value.trim(),
        kcalPer100g: result.data.kcalPer100g,
        proteinPer100g: result.data.proteinPer100g,
        carbsPer100g: result.data.carbsPer100g,
        fatPer100g: result.data.fatPer100g,
        estimatedGrams: result.data.estimatedGrams,
      });
      setOpen(false);
    });
  }

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block">
        <span className="text-xs text-neutral-400">Ingredient</span>
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onNameChange(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Oats, banana, your yogurt..."
          className="mt-1 block w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white transition placeholder:text-neutral-500 focus:bg-white/[0.08] focus:ring-2 focus:ring-[var(--accent)]/60 focus:outline-none"
        />
      </label>

      {open ? (
        <div className="absolute top-full left-0 z-20 mt-1 max-h-72 w-[min(25.5rem,calc(100vw-5.5rem))] overflow-y-auto rounded-2xl border border-white/10 bg-[#1a1633]/95 p-2 shadow-2xl backdrop-blur-xl">
          {matches.slice(0, 6).map((item) => {
            const Icon = item.kind === 'product' ? Package : ChefHat;
            const subtitle =
              item.kind === 'product' && item.brand
                ? ` · ${item.brand}`
                : item.kind === 'recipe'
                  ? ' · recipe'
                  : null;
            return (
              <button
                key={`${item.kind}-${item.id}`}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault(); // keep focus on input
                  pickItem(item);
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition hover:bg-white/5"
              >
                <Icon size={14} className="shrink-0 text-neutral-400" />
                <p className="min-w-0 flex-1 truncate text-sm text-white">
                  {item.name}
                  {subtitle ? <span className="text-neutral-500">{subtitle}</span> : null}
                </p>
              </button>
            );
          })}

          {matches.length > 0 && showAiOption ? <Divider /> : null}

          {showAiOption ? (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                askKlara();
              }}
              disabled={pending}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition',
                pending ? 'opacity-60' : 'hover:bg-[var(--accent)]/10',
              )}
            >
              {pending ? (
                <Loader2 size={14} className="shrink-0 animate-spin text-[var(--accent)]" />
              ) : (
                <Sparkles size={14} className="shrink-0 text-[var(--accent)]" />
              )}
              <p className="min-w-0 flex-1 truncate text-sm text-[var(--accent)]">
                {pending ? 'Asking Klara…' : `Ask Klara about "${value.trim()}"`}
              </p>
            </button>
          ) : null}

          {matches.length === 0 && !showAiOption ? (
            <p className="px-3 py-3 text-xs text-neutral-500">
              Type at least 2 characters to search or ask Klara.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Divider() {
  return <div className="my-1 h-px bg-white/10" />;
}
