'use client';

import { useState } from 'react';
import { DescribeMeal } from './DescribeMeal';
import { ProductPicker } from './ProductPicker';
import { SegmentedControl } from './SegmentedControl';
import { type LibraryItem } from './IngredientPicker';
import type { EstimationEntry } from '@/lib/freeTextEstimation';

/**
 * One card, two tabs: "Describe" (free-text + Ask Klara) and "Add product"
 * (search the saved library). The tab switcher is the shared SegmentedControl.
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
      <SegmentedControl
        value={tab}
        onChange={setTab}
        options={[
          { value: 'describe', label: 'Describe' },
          { value: 'products', label: 'Add product' },
        ]}
      />

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
