'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, ChefHat, Star, Pencil } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { FavoriteTemplateCard, type FavoriteTemplateEntry } from './FavoriteTemplateCard';
import { SegmentedControl, type Segment } from './SegmentedControl';
import type { MealType } from '@/lib/meals';

type RecipeListItem = {
  id: string;
  name: string;
  portions: number;
  pp: { kcal: number; protein: number; carbs: number; fat: number };
};

type FavoriteTemplate = {
  id: string;
  type: MealType;
  name: string | null;
  icon: string | null;
  entries: FavoriteTemplateEntry[];
};

type Tab = 'favorites' | 'recipes';

const TABS: Segment<Tab>[] = [
  { value: 'favorites', label: 'Favorites' },
  { value: 'recipes', label: 'Recipes' },
];

/**
 * Library content with a segmented control to switch between saved favorite
 * meals (default) and recipes. The "+" add button only shows on the Recipes
 * tab, since favorites are created by starring a logged meal, not here.
 */
export function LibraryTabs({
  recipes,
  favorites,
}: {
  recipes: RecipeListItem[];
  favorites: FavoriteTemplate[];
}) {
  const [tab, setTab] = useState<Tab>('favorites');

  return (
    <div className="space-y-6">
      <header className="flex min-h-11 items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-white">Library</h1>
        {tab === 'recipes' && (
          <Link
            href="/library/recipes/new"
            aria-label="Add recipe"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-[0_8px_24px_-8px_var(--accent-glow)] transition hover:bg-[var(--accent-hover)] active:scale-95"
          >
            <Plus size={20} />
          </Link>
        )}
      </header>

      <SegmentedControl options={TABS} value={tab} onChange={setTab} />

      {tab === 'favorites' ? (
        favorites.length === 0 ? (
          <GlassCard className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-yellow-400">
              <Star size={16} />
            </div>
            <p className="text-xs text-neutral-400">
              Tap the star on a meal you logged to save it here for one-tap reuse.
            </p>
          </GlassCard>
        ) : (
          <div className="space-y-3">
            {favorites.map((t) => (
              <FavoriteTemplateCard key={t.id} template={t} />
            ))}
          </div>
        )
      ) : (
        <div className="space-y-3">
          {recipes.length === 0 ? (
            <GlassCard className="flex items-center gap-3 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-neutral-400">
                <ChefHat size={16} />
              </div>
              <p className="text-xs text-neutral-400">
                No recipes yet. Tap + to add your banana bread, granola, or whatever you cook on
                repeat.
              </p>
            </GlassCard>
          ) : (
            <ul className="space-y-2">
              {recipes.map((r) => (
                <li key={r.id}>
                  <GlassCard noAnimate className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">{r.name}</p>
                        <p className="truncate text-xs text-neutral-400">
                          {r.portions} portion{r.portions === 1 ? '' : 's'}
                        </p>
                      </div>
                      <Link
                        href={`/library/recipes/${r.id}/edit`}
                        aria-label={`Edit ${r.name}`}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-neutral-400 transition hover:bg-white/5 hover:text-white"
                      >
                        <Pencil size={14} />
                      </Link>
                    </div>
                    <p className="mt-3 flex items-baseline justify-between gap-3 text-xs tabular-nums">
                      <span className="text-neutral-400">
                        P {r.pp.protein.toFixed(1)}g · C {r.pp.carbs.toFixed(1)}g · F{' '}
                        {r.pp.fat.toFixed(1)}g
                      </span>
                      <span className="shrink-0 text-neutral-500">
                        {Math.round(r.pp.kcal)} kcal / portion
                      </span>
                    </p>
                  </GlassCard>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
