'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
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

      <motion.div layout transition={{ type: 'spring', stiffness: 380, damping: 34 }}>
        <AnimatePresence mode="wait" initial={false}>
          {tab === 'describe' ? (
            <motion.div
              key="describe"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <DescribeMeal
                hideLabel
                placeholder={describePlaceholder}
                onAddEstimate={onAddEstimate}
                onError={onError}
              />
            </motion.div>
          ) : (
            <motion.div
              key="products"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <ProductPicker hideLabel alwaysShowList items={items} onAddItem={onAddItem} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
