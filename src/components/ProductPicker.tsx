'use client';

import { useState } from 'react';
import { Search, Package, ChefHat } from 'lucide-react';
import { type LibraryItem } from './IngredientPicker';

type RecipeWithDefaultGrams = LibraryItem & { kind: 'recipe'; defaultGrams: number };

/**
 * Add a saved product or recipe to the meal, one at a time. Picking a
 * product prefills grams with its suggested portion (else 100g); a recipe
 * prefills with its default portion.
 */
export function ProductPicker({
  items,
  onAddItem,
}: {
  items: LibraryItem[];
  onAddItem: (item: LibraryItem, grams: number) => void;
}) {
  const [value, setValue] = useState('');
  const trimmed = value.trim();
  const filtered = trimmed
    ? items.filter((i) => i.name.toLowerCase().includes(trimmed.toLowerCase())).slice(0, 8)
    : items.slice(0, 6);

  function pick(item: LibraryItem) {
    let grams = 100;
    if (item.kind === 'recipe') {
      const r = item as RecipeWithDefaultGrams;
      if (r.defaultGrams) grams = Math.round(r.defaultGrams);
    } else if (item.suggestedPortionGrams) {
      grams = Math.round(item.suggestedPortionGrams);
    }
    onAddItem(item, grams);
    setValue('');
  }

  return (
    <div className="space-y-2.5">
      <p className="text-xs font-medium tracking-wider text-neutral-400 uppercase">
        Add a saved product
      </p>
      <div className="relative">
        <Search
          size={14}
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-neutral-500"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search your products & recipes"
          className="block w-full rounded-2xl border border-white/10 bg-white/[0.04] py-2.5 pr-3 pl-9 text-sm text-white placeholder:text-neutral-500 focus:bg-white/[0.08] focus:ring-2 focus:ring-[var(--accent)]/60 focus:outline-none"
        />
      </div>

      {items.length === 0 ? (
        <p className="px-1 py-1 text-xs text-neutral-500">
          No saved products yet — add one from the Products tab.
        </p>
      ) : filtered.length === 0 ? (
        <p className="px-1 py-1 text-xs text-neutral-500">No matches.</p>
      ) : (
        <ul className="max-h-56 space-y-1 overflow-y-auto">
          {filtered.map((item) => (
            <li key={`${item.kind}-${item.id}`}>
              <button
                type="button"
                onClick={() => pick(item)}
                className="flex w-full items-center justify-between gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-left text-sm text-white transition hover:bg-white/[0.06]"
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
        </ul>
      )}
    </div>
  );
}
