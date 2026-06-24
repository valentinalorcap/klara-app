'use client';

import { useState } from 'react';
import { Search, Package, ChefHat } from 'lucide-react';
import { type LibraryItem } from './IngredientPicker';

type RecipeWithDefaultGrams = LibraryItem & { kind: 'recipe'; defaultGrams: number };

/** Lowercase + strip accents so "platano" matches "plátano". */
function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Add a saved product or recipe, one at a time. The results open on focus; at
 * rest only products marked "in use" show, the rest appear once you type.
 * Picking a product prefills grams from its suggested portion (else 100g).
 */
export function ProductPicker({
  items,
  onAddItem,
  hideLabel = false,
  alwaysShowList = false,
}: {
  items: LibraryItem[];
  onAddItem: (item: LibraryItem, grams: number) => void;
  /** Hide the label (e.g. when a tab already names the section). */
  hideLabel?: boolean;
  /** Always render the list (default in-use); else it only opens on focus. */
  alwaysShowList?: boolean;
}) {
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const trimmed = value.trim();
  const showList = alwaysShowList || focused;
  // At rest, show the products marked "in use"; if none are marked, fall back
  // to the first few so the list isn't empty. Typing searches everything.
  const inUse = items.filter((i) => i.kind === 'product' && i.inUse);
  // Each typed word must be the START of some word in the (accent-stripped)
  // name, in any order — so "yogurt p" matches "yogurt de plátano" and "yogurt
  // proteico", but not "Coconut Yogurt Alpro" (no word starts with "p").
  const tokens = norm(trimmed).split(/\s+/).filter(Boolean);
  const filtered = tokens.length
    ? items
        .filter((i) => {
          const words = norm(i.name).split(/\s+/);
          return tokens.every((t) => words.some((w) => w.startsWith(t)));
        })
        .slice(0, 8)
    : inUse.length > 0
      ? inUse
      : items.slice(0, 8);

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
      {hideLabel ? null : (
        <p className="text-xs font-medium tracking-wider text-neutral-400 uppercase">
          Add saved products or recipes
        </p>
      )}
      <div className="relative">
        <Search
          size={14}
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-neutral-500"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          // Delay so a tap on a result lands before the list collapses.
          onBlur={() => window.setTimeout(() => setFocused(false), 150)}
          placeholder="Search your products & recipes"
          className="block w-full rounded-2xl border border-white/10 bg-white/[0.04] py-2.5 pr-3 pl-9 text-sm text-white placeholder:text-neutral-500 focus:bg-white/[0.08] focus:ring-2 focus:ring-[var(--accent)]/60 focus:outline-none"
        />
      </div>

      {!showList ? null : items.length === 0 ? (
        <p className="px-1 py-1 text-xs text-neutral-500">
          No saved products yet — add one from the Products tab.
        </p>
      ) : filtered.length === 0 ? (
        <p className="px-1 py-1 text-xs text-neutral-500">
          {trimmed ? 'No matches.' : 'Type to search your products & recipes.'}
        </p>
      ) : (
        <ul className="max-h-56 space-y-1 overflow-y-auto">
          {filtered.map((item) => (
            <li key={`${item.kind}-${item.id}`}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
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
                <span className="max-w-[40%] shrink-0 truncate text-[10px] tracking-wider text-neutral-500 uppercase">
                  {item.kind === 'recipe' ? 'recipe' : item.brand || 'product'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
