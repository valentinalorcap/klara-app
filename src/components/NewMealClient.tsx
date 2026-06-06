'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Star, Layers } from 'lucide-react';
import { MealForm, type FavoriteMeal } from './MealForm';
import { type LibraryItem } from './IngredientPicker';

export function NewMealClient({
  items,
  favorites,
}: {
  items: LibraryItem[];
  favorites: FavoriteMeal[];
}) {
  const [favoritesOpen, setFavoritesOpen] = useState(false);

  return (
    <>
      <div className="mt-4 flex flex-wrap gap-2">
        {favorites.length > 0 ? (
          <button
            type="button"
            onClick={() => setFavoritesOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-[var(--accent)] transition hover:border-[var(--accent)]/40 hover:bg-[var(--accent)]/5"
          >
            <Star size={12} className="text-yellow-400" fill="currentColor" />
            Favorites
          </button>
        ) : null}
        <Link
          href="/today/batch"
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-[var(--accent)] transition hover:border-[var(--accent)]/40 hover:bg-[var(--accent)]/5"
        >
          <Layers size={12} />
          Batch multiple meals →
        </Link>
      </div>

      <div className="mt-8">
        <MealForm
          items={items}
          favorites={favorites}
          hideFavoritesButton
          controlledFavoritesOpen={favoritesOpen}
          onCloseFavorites={() => setFavoritesOpen(false)}
        />
      </div>
    </>
  );
}
