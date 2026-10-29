'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

/**
 * A buyer back from the card page, before Stripe's webhook has landed (spec 0010).
 *
 * The return URL never marks anything paid: only the signed webhook does, and it
 * usually arrives within seconds. Until then the page re-reads the order every
 * few seconds so the buyer sees "Payment confirmed" without reloading. It gives
 * up after about a minute and says so, rather than spinning forever on a payment
 * that did not go through.
 */
const EVERY_MS = 3_000;
const TRIES = 20;

export function ConfirmingPayment() {
  const router = useRouter();
  const [tries, setTries] = useState(0);

  useEffect(() => {
    if (tries >= TRIES) return;
    const timer = setTimeout(() => {
      router.refresh();
      setTries((count) => count + 1);
    }, EVERY_MS);
    return () => clearTimeout(timer);
  }, [router, tries]);

  return tries >= TRIES ? (
    <p className="mt-2 text-[12.5px] leading-5 text-ink/80">
      This is taking longer than usual. If your card was charged, the order updates here on
      its own; if not, try paying again below.
    </p>
  ) : (
    <p className="mt-2 text-[12.5px] leading-5 text-ink/80" aria-live="polite">
      Confirming with the card network. This page updates on its own.
    </p>
  );
}
