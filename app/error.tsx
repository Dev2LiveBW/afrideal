'use client';

import { useEffect } from 'react';
import { RotateCw } from 'lucide-react';

import { AfriDealLogo } from '@/components/brand/AfriDealLogo';
import { GoldButton } from '@/components/brand/GoldButton';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[afrideal]', error);
  }, [error]);

  return (
    <main className="grain relative flex min-h-[100dvh] flex-col items-center justify-center bg-ink px-6 text-center">
      <AfriDealLogo variant="dark" size="md" />

      <p className="eyebrow mt-12 text-white/40">Something broke</p>
      <h1 className="mt-3 font-display text-[34px] font-bold leading-[1.1] tracking-[-0.03em] text-white sm:text-[44px]">
        We could not finish loading this.
      </h1>
      <p className="measure mt-4 text-[15px] leading-7 text-white/55">
        No order, payment or escrow record was changed by whatever went wrong here. Try again, and if
        it keeps happening the message below is what to send us.
      </p>

      <code className="mt-5 max-w-full overflow-x-auto rounded border border-white/10 bg-white/[0.04] px-3.5 py-2.5 font-mono text-[12px] text-white/60">
        {error.digest ? `digest ${error.digest}` : error.message || 'Unknown error'}
      </code>

      <div className="mt-8">
        <GoldButton
          variant="gold"
          size="md"
          onClick={reset}
          icon={<RotateCw size={15} strokeWidth={1.5} />}
        >
          Try again
        </GoldButton>
      </div>
    </main>
  );
}
