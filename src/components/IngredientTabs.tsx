'use client';

import { useState } from 'react';
import { DescribeMeal } from './DescribeMeal';
import { ProductPicker } from './ProductPicker';
import { type LibraryItem } from './IngredientPicker';
import type { EstimationEntry } from '@/lib/freeTextEstimation';
import { cn } from '@/lib/utils';

/**
 * One card, two tabs: "Describe" (free-text + Ask Klara) and "Add product"
 * (search the saved library). Same controls as before, unified with a toggle.
 */
export function IngredientTabs({
  items,
  onAddItem,
  onAddEstimate,
  onError,
  describePlaceholder = 'e.g. yogurt with berries and granola',
}: {
  items: LibraryItem[];
  onAddItem: (item: LibraryItem, grams: number) => void;
  onAddEstimate: (entries: EstimationEntry[]) => void;
  onError: (message: string) => void;
  describePlaceholder?: string;
}) {
  const [tab, setTab] = useState<'describe' | 'products'>('describe');

  return (
    <div className="space-y-3">
      <div className="flex rounded-2xl bg-white/[0.04] p-1">
        <TabButton active={tab === 'describe'} onClick={() => setTab('describe')}>
          Describe
        </TabButton>
        <TabButton active={tab === 'products'} onClick={() => setTab('products')}>
          Add product
        </TabButton>
      </div>

      {tab === 'describe' ? (
        <DescribeMeal
          hideLabel
          placeholder={describePlaceholder}
          onAddEstimate={onAddEstimate}
          onError={onError}
        />
      ) : (
        <ProductPicker hideLabel alwaysShowList items={items} onAddItem={onAddItem} />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition',
        active
          ? 'bg-[var(--accent)]/15 text-[var(--accent)]'
          : 'text-neutral-400 hover:text-neutral-200',
      )}
    >
      {children}
    </button>
  );
}
