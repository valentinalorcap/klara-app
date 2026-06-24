'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ProductCard, type ProductCardData } from './ProductCard';

/**
 * The product library list. Animated so deleting a product fades/scales it out
 * (popLayout) while the rows below slide up to fill the gap, instead of an
 * instant jump. New rows fade/lift in.
 */
export function ProductList({ products }: { products: ProductCardData[] }) {
  return (
    <ul className="mt-8 flex flex-col gap-3">
      <AnimatePresence mode="popLayout" initial={false}>
        {products.map((p) => (
          <motion.li
            key={p.id}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          >
            <ProductCard product={p} />
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}
