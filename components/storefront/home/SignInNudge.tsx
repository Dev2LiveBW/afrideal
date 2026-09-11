'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Gift, X } from 'lucide-react';

/**
 * The sign-in nudge. Benchmark §3a: a 48px banner fixed above the tab bar
 * for a signed-out reader - `Sign in for better sourcing experience` on a
 * peach-to-pink gradient (89°, #FFEAD1 → #FFD5D1), an 11px bold title in
 * #4B1D1F beside a 28px mark, and an orange pill on the right whose press
 * state is the benchmark's own (`:active { opacity: .8 }`, 200ms).
 *
 * One departure: a close. The benchmark's banner has none and comes back on
 * every visit. A permanent 48px of persuasion on a 390px screen costs more
 * than it earns, so this one can be dismissed and stays dismissed for the
 * session. Phones only - from `md` the header carries the sign-in link and
 * there is no tab bar to sit above.
 */
const KEY = 'afrideal:nudge-dismissed';

export function SignInNudge() {
  const { data: session, status } = useSession();
  const [dismissed, setDismissed] = useState(true);

  // Read after hydration; the server rendered it hidden.
  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(KEY) === '1');
    } catch {
      setDismissed(false);
    }
  }, []);

  if (status === 'loading' || session?.user || dismissed) return null;

  function dismiss() {
    setDismissed(true);
    try {
      sessionStorage.setItem(KEY, '1');
    } catch {
      /* private mode - it just comes back next time */
    }
  }

  return (
    <div
      role="complementary"
      aria-label="Sign in"
      className="fixed inset-x-0 z-30 h-12 bg-[linear-gradient(89deg,#FFEAD1_-1.66%,#FFD5D1_101.88%)] md:hidden"
      style={{ bottom: 'calc(56px + env(safe-area-inset-bottom))' }}
    >
      <div className="flex h-full items-center gap-2 px-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/70 text-[#E67E22]">
          <Gift size={16} strokeWidth={2.25} aria-hidden="true" />
        </span>
        <p className="min-w-0 flex-1 truncate text-[11px] font-bold text-[#4B1D1F]">
          Sign in for better prices and order tracking
        </p>
        <Link
          href="/login"
          className="press flex h-8 shrink-0 items-center rounded-full bg-[#E67E22] px-4 text-[12px] font-bold text-white transition-opacity duration-200"
        >
          Sign in
        </Link>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="press -mr-1 flex h-8 w-7 shrink-0 items-center justify-center text-[#4B1D1F]/60"
        >
          <X size={14} strokeWidth={2.25} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
