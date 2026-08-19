'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Zap } from 'lucide-react';

import { GoldButton } from '@/components/brand/GoldButton';
import { MoneyText } from '@/components/brand/MoneyText';
import { Swatch } from '@/components/storefront/Swatch';
import type { Product, ProductImage } from '@/types';

/**
 * Live promotions.
 *
 * Every figure here is seeded: the discount is the gap between a PROMOTIONAL
 * band and the standing retail band, and the clock counts to that band's real
 * `effective_to`. Nothing is a percentage invented at render time, which also
 * means a deal that expires stops showing rather than counting into negatives.
 */

function useCountdown(target: string | undefined) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!target) return;

    const tick = () => setRemaining(Math.max(0, new Date(target).getTime() - Date.now()));
    tick();

    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  return remaining;
}

function Segment({ value, label }: { value: number; label: string }) {
  return (
    <span className="flex flex-col items-center">
      <span className="flex h-7 min-w-[28px] items-center justify-center rounded bg-ink px-1.5 font-mono text-[13px] font-semibold tabular-nums text-gold-light">
        {String(value).padStart(2, '0')}
      </span>
      <span className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
        {label}
      </span>
    </span>
  );
}

export function FlashDealsRail({
  products,
  images,
}: {
  products: Product[];
  images: ProductImage[];
}) {
  // The soonest expiry drives the headline clock.
  const soonest = products
    .map((product) => product.promotion?.ends_at)
    .filter((value): value is string => Boolean(value))
    .sort()[0];

  const remaining = useCountdown(soonest);

  if (products.length === 0) return null;

  const hours = remaining === null ? 0 : Math.floor(remaining / 3_600_000);
  const minutes = remaining === null ? 0 : Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = remaining === null ? 0 : Math.floor((remaining % 60_000) / 1000);

  return (
    <section className="rounded-lg border border-gold/25 bg-gold-50/50 p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold text-ink">
            <Zap size={17} strokeWidth={2} />
          </span>
          <div>
            <h2 className="font-display text-headline-md font-semibold text-ink">Live deals</h2>
            <p className="text-[12.5px] text-body">Ends when the clock does, not before</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Rendered only after mount, so server and client agree on first paint. */}
          {remaining !== null && (
            <div className="flex items-start gap-1.5">
              <Segment value={hours} label="hrs" />
              <span className="pt-1 font-mono text-[13px] text-muted">:</span>
              <Segment value={minutes} label="min" />
              <span className="pt-1 font-mono text-[13px] text-muted">:</span>
              <Segment value={seconds} label="sec" />
            </div>
          )}

          <Link href="/browse">
            <GoldButton variant="ink" size="sm">
              See all
            </GoldButton>
          </Link>
        </div>
      </div>

      <div className="no-scrollbar flex gap-4 overflow-x-auto pb-1">
        {products.map((product) => {
          const primary = images.find(
            (image) => image.product_id === product.id && image.sort_order === 0,
          );

          const allocated = product.promotion?.stock_allocated ?? 0;
          const sold = product.promotion?.stock_sold ?? 0;
          const soldPct = allocated === 0 ? 0 : Math.min(100, (sold / allocated) * 100);

          return (
            <Link
              key={product.id}
              href={`/products/${product.id}`}
              className="group w-[220px] shrink-0 overflow-hidden rounded-md border border-hairline bg-surface-raised shadow-card transition-shadow duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-lift"
            >
              <div className="relative">
                <Swatch
                  image={primary}
                  fallback={product.swatch}
                  emoji={product.emoji}
                  className="aspect-[5/4]"
                  label={product.name}
                />
                <span className="absolute left-2.5 top-2.5 rounded-full bg-danger px-2 py-0.5 font-mono text-[10px] font-semibold text-white">
                  −{product.promotion?.discount_pct}%
                </span>
              </div>

              <div className="p-3.5">
                <h3 className="line-clamp-2 min-h-[2.4em] text-[13px] font-medium leading-5 text-ink">
                  {product.name}
                </h3>

                <p className="mt-2">
                  <MoneyText amount={product.price} size="sm" tone="gold" />
                  {product.compare_at_price && (
                    <span className="ml-1.5 font-mono text-[11px] tabular-nums text-muted line-through">
                      {product.compare_at_price.toFixed(2)}
                    </span>
                  )}
                </p>

                <div className="mt-3">
                  <span className="block h-1.5 overflow-hidden rounded-full bg-ink/[0.08]">
                    <span
                      className="block h-full rounded-full bg-gradient-to-r from-gold to-gold-light"
                      style={{ width: `${soldPct}%` }}
                    />
                  </span>
                  <p className="mt-1.5 font-mono text-[10.5px] tabular-nums text-muted">
                    {sold} sold of {allocated}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
