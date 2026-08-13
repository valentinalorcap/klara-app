'use client';

import { useState, useTransition, useCallback } from 'react';
import Link from 'next/link';
import { MealForm, type MealInitialValues, type MealFormPayload } from '@/components/MealForm';
import { updateMealTemplate } from '@/app/(app)/today/actions';
import type { LibraryItem } from '@/components/IngredientPicker';
import type { FavoriteMeal } from '@/components/MealForm';

export function EditFavoriteForm({
  templateId,
  initial,
  items,
  favorites,
}: {
  templateId: string;
  initial: MealInitialValues;
  items: LibraryItem[];
  favorites: FavoriteMeal[];
}) {
  const [payload, setPayload] = useState<MealFormPayload | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleValidChange = useCallback((p: MealFormPayload | null) => {
    setPayload(p);
  }, []);

  function handleSave() {
    if (!payload) return;
    setError(null);
    startTransition(async () => {
      const result = await updateMealTemplate(templateId, payload, '/library');
      if (result && !result.ok) setError(result.error);
    });
  }

  return (
    <div className="space-y-5">
      <MealForm
        items={items}
        favorites={favorites}
        initial={initial}
        hideActions
        hideFavoritesButton
        onValidChange={handleValidChange}
      />
      {error ? (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}
      <div className="space-y-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={!payload || pending}
          className="w-full rounded-2xl bg-[var(--accent)] px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] active:scale-[0.98] disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Save changes'}
        </button>
        <Link
          href="/library"
          className="block w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-sm font-medium text-neutral-300 transition hover:bg-white/[0.08]"
        >
          Cancel
        </Link>
      </div>
    </div>
  );
}
