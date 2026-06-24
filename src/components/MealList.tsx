'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { MealCard, type MealCardMeal } from './MealCard';

/**
 * The day's meal list. Animated so a meal fades/scales out (popLayout) while
 * the rest slide up when one is deleted, and new meals lift in — instead of an
 * abrupt jump.
 */
export function MealList({ meals, returnTo }: { meals: MealCardMeal[]; returnTo: string }) {
  return (
    <ul className="flex flex-col gap-3">
      <AnimatePresence initial={false}>
        {meals.map((meal) => (
          <motion.li
            key={meal.id}
            layout
            // Deleted card just fades out in place; the rest slide up (layout).
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          >
            <MealCard meal={meal} returnTo={returnTo} />
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}
