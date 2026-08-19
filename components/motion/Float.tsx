'use client';

import { motion, useReducedMotion } from 'framer-motion';

/**
 * A slow vertical drift for a single hero element.
 *
 * Deliberately one element, not several: a page where everything breathes reads
 * as unstable. The receipt card is the only object in the hero that represents
 * something live, so it is the only one that moves.
 *
 * Amplitude is 6px over nine seconds — below the threshold where the eye tracks
 * it as animation, above the threshold where the hero feels like a flat image.
 * `useReducedMotion` stops it outright rather than shortening it, since a
 * continuous loop is exactly what that preference exists to silence.
 */
export function Float({
  children,
  className,
  delay = 0,
  distance = 6,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  distance?: number;
}) {
  const reduced = useReducedMotion();

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div
        animate={{ y: [0, -distance, 0] }}
        transition={{
          duration: 9,
          ease: 'easeInOut',
          repeat: Number.POSITIVE_INFINITY,
          delay: delay + 0.8,
        }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
