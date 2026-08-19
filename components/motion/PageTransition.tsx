'use client';

import { motion } from 'framer-motion';

/**
 * Page transitions.
 *
 * Two modes, because DESIGN.md draws a hard line between them.
 *
 * Marketplace gets a short fade and rise: the storefront is allowed to feel
 * staged, and the movement gives navigation a sense of place.
 *
 * Console gets opacity only, at half the duration. An operator moving between
 * dispute and escrow twenty times an hour does not want the page to travel;
 * motion there is confirmation that something changed, nothing more.
 *
 * Both settle on an exponential ease-out, so they decelerate like something with
 * mass rather than sliding to a stop. Under prefers-reduced-motion, globals.css
 * collapses the durations and this becomes an instant swap.
 */
export function PageTransition({
  children,
  mode = 'marketplace',
}: {
  children: React.ReactNode;
  mode?: 'marketplace' | 'console';
}) {
  const marketplace = mode === 'marketplace';

  return (
    <motion.div
      initial={{ opacity: 0, y: marketplace ? 12 : 0 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: marketplace ? 0.34 : 0.16,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </motion.div>
  );
}
