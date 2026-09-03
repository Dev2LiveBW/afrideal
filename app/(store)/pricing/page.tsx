import type { Metadata } from 'next';
import Link from 'next/link';
import { BadgeCheck, ShieldCheck, Truck } from 'lucide-react';

import { PriceLadderCards } from '@/components/pricing/PriceLadderCards';
import { GoldButton } from '@/components/brand/GoldButton';
import { auth } from '@/lib/auth';
import { readAll } from '@/lib/db';
import { ladderFor } from '@/lib/price-ladder';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'How pricing works',
  description:
    'Retail, bulk, wholesale and quoted pricing on AfriDeal — what each quantity band costs and how the discounts are calculated.',
};

/**
 * The pricing breakdown (§14/§20).
 *
 * The worked examples come from a real listing rather than a made-up product.
 * The one chosen is whichever listing sits closest to the published ladder:
 * thin-margin categories have rungs clamped up onto their margin floor (§19),
 * and explaining the ladder with an example that visibly does not follow it
 * teaches the shopper the wrong thing.
 */
export default async function PricingPage() {
  const [products, bands, session] = await Promise.all([
    readAll('products'),
    readAll('customer-prices'),
    auth(),
  ]);

  const customerType = session?.user?.customer_type ?? null;

  const listed = products.filter((product) => product.status === 'ACTIVE' && !product.promotion);

  const example =
    listed
      .map((product) => {
        const target = ladderFor(product.price);
        const drift = target.reduce((total, step) => {
          const stored = bands.find(
            (band) =>
              band.product_id === product.id &&
              band.customer_type === 'RETAIL' &&
              band.pricing_tier === step.rung.tier,
          );
          return total + (stored ? Math.abs(stored.unit_price - step.unit_price) / product.price : 1);
        }, 0);

        return { product, drift };
      })
      .sort((a, b) => a.drift - b.drift || Number(b.product.featured) - Number(a.product.featured))[0]
      ?.product ?? products[0];

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-6 sm:px-6 sm:pb-24 sm:pt-10">
      <div className="rounded-lg border border-hairline bg-surface-raised p-4 shadow-card sm:p-8">
        <PriceLadderCards
          retailPrice={example.price}
          customerType={customerType}
          exampleName={example.name}
        />

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
          <Link href="/browse" className="sm:flex-1">
            <GoldButton variant="forest" size="lg" className="w-full" withArrow>
              Browse products
            </GoldButton>
          </Link>
          <Link href="/how-it-works" className="sm:flex-1">
            <GoldButton variant="ghost" size="lg" className="w-full">
              How AfriDeal works
            </GoldButton>
          </Link>
        </div>
      </div>

      {/* ── Reassurance strip ──────────────────────────────────────────── */}
      <ul className="mt-3 grid grid-cols-1 gap-2 rounded-lg border border-hairline bg-surface-raised p-4 sm:grid-cols-3 sm:gap-4">
        {[
          {
            icon: ShieldCheck,
            title: 'Secure escrow',
            body: 'Your money is safe',
          },
          {
            icon: Truck,
            title: 'Fast delivery',
            body: 'Across Botswana',
          },
          {
            icon: BadgeCheck,
            title: 'Verified suppliers',
            body: 'Trusted and reliable',
          },
        ].map((item) => (
          <li key={item.title} className="flex items-center gap-2.5">
            <item.icon size={18} strokeWidth={1.5} className="shrink-0 text-forest" />
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-medium text-ink">{item.title}</span>
              <span className="block truncate text-[12px] text-muted">{item.body}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
