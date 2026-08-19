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
 *
 * The reduced branch changes durations, never the markup. It used to return a
 * bare `<div>` while the animated branch rendered two nested ones, and because
 * the server cannot know the preference it always rendered the pair — so every
 * visitor with reduced motion turned on hydrated against the wrong shape and
 * React discarded the server HTML and re-rendered the page client-side.
 *
 * For the same reason `initial` is unconditional: it is what framer writes into
 * the inline style on the first render, so varying it by preference reproduces
 * the mismatch one level down as a style diff. The entrance instead resolves
 * instantly when reduced — same start, same end, no perceptible movement — and
 * the drift loop is the one thing dropped outright, since a continuous loop is
 * exactly what the preference exists to silence.
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

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reduced ? { duration: 0 } : { delay, duration: 0.7, ease: [0.16, 1, 0.3, 1] }
      }
    >
      <motion.div
        animate={reduced ? { y: 0 } : { y: [0, -distance, 0] }}
        transition={
          reduced
            ? { duration: 0 }
            : {
                duration: 9,
                ease: 'easeInOut',
                repeat: Number.POSITIVE_INFINITY,
                delay: delay + 0.8,
              }
        }
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
