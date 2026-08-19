import Link from 'next/link';

import { AfriDealLogo } from '@/components/brand/AfriDealLogo';
import { GoldButton } from '@/components/brand/GoldButton';

export default function NotFound() {
  return (
    <main className="grain relative flex min-h-[100dvh] flex-col items-center justify-center bg-ink px-6 text-center">
      <AfriDealLogo variant="dark" size="md" />

      <p className="eyebrow mt-12 text-white/40">Error 404</p>
      <h1 className="mt-3 font-display text-[38px] font-bold leading-[1.1] tracking-[-0.03em] text-white sm:text-[52px]">
        This page is not on the map.
      </h1>
      <p className="measure mt-4 text-[15px] leading-7 text-white/55">
        The link may be out of date, or the record it pointed at has been removed. Everything else is
        still where you left it.
      </p>

      <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
        <Link href="/">
          <GoldButton variant="gold" size="md" withArrow>
            Back to the marketplace
          </GoldButton>
        </Link>
        <Link href="/browse">
          <GoldButton variant="ghost" size="md" className="text-white ring-white/20 hover:bg-white/10">
            Browse products
          </GoldButton>
        </Link>
      </div>
    </main>
  );
}
