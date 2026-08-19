'use client';

import { motion } from 'framer-motion';

/**
 * Scroll entrance for marketplace-mode sections.
 *
 * Transform and opacity only, so it stays on the compositor. Fires once, then
 * leaves the element alone. globals.css collapses the duration to nothing under
 * prefers-reduced-motion, and `once` means nothing re-animates on the way back
 * up the page.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ delay, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
