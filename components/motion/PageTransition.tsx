'use client';

import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * Page transitions.
 *
 * Marketplace mode follows the benchmark (docs/design/alibaba-benchmark.md
 * §4b, from the product owner's recording of the Alibaba buyer app):
 *
 *   - Going *into* something - a card, a tile, a category - the new screen
 *     pushes in from the right over about 200ms and settles on an ease-out.
 *   - Going *back*, it leaves the way it came and the previous screen is
 *     simply there again.
 *   - Switching tabs on the bottom bar is an instant swap. Nothing moves.
 *
 * On a wide screen there is no motion at all: the benchmark's web site does
 * a plain page load, and a desktop page sliding in from the right reads as
 * a slideshow. Which kind of navigation this is comes from the bottom bar
 * (it marks its own taps) and from the browser (popstate marks a back).
 * The first page of a session never animates - there is nothing to arrive
 * from.
 *
 * Console mode is opacity only, at half the duration. An operator moving
 * between dispute and payables queue twenty times an hour does not want the
 * page to travel; motion there is confirmation that something changed,
 * nothing more. Under prefers-reduced-motion everything is an instant swap.
 */

type Kind = 'none' | 'push' | 'back' | 'tab';

let mounts = 0;
let nextKind: Kind = 'push';

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    nextKind = 'back';
  });
}

/** The bottom tab bar calls this before it navigates. */
export function markTabNavigation() {
  nextKind = 'tab';
}

const PHONE = '(max-width: 767px)';

export function PageTransition({
  children,
  mode = 'marketplace',
}: {
  children: React.ReactNode;
  mode?: 'marketplace' | 'console';
}) {
  const reduce = useReducedMotion();

  // Decided once per mount - a template remounts on every navigation.
  const [kind] = useState<Kind>(() => {
    const isFirst = mounts === 0;
    mounts += 1;
    const kind = nextKind;
    nextKind = 'push';
    if (isFirst) return 'none';
    if (typeof window !== 'undefined' && !window.matchMedia(PHONE).matches) return 'none';
    return kind;
  });

  if (mode === 'console') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    );
  }

  if (reduce || kind === 'none' || kind === 'tab') {
    return <>{children}</>;
  }

  return (
    // `clip`, not `hidden`: hidden would make <main> a scroll container and
    // unstick every sticky header inside a page.
    <div style={{ overflowX: 'clip' }}>
      <motion.div
        initial={kind === 'push' ? { x: '100%' } : { x: '-24%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={
          kind === 'push'
            ? { duration: 0.22, ease: [0.22, 0.61, 0.36, 1] }
            : { duration: 0.2, ease: [0, 0, 0.2, 1] }
        }
        style={{ willChange: 'transform' }}
      >
        {children}
      </motion.div>
    </div>
  );
}
