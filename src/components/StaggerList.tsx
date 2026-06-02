'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

/** Wrap a list (ul/ol) so each child fades and lifts in with a small delay. */
export function StaggerList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.ul
      className={className}
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
      }}
    >
      {children}
    </motion.ul>
  );
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 200, damping: 24 },
  },
};

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.li className={className} variants={itemVariants}>
      {children}
    </motion.li>
  );
}
