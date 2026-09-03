import Link from 'next/link';
import { ArrowRight, Building2, Package, ShoppingCart } from 'lucide-react';

import { LADDER_RUNGS, rungFor } from '@/lib/price-ladder';
import { cn } from '@/lib/utils';

/**
 * "Choose how you want to buy" — the ladder in three cards.
 *
 * The full breakdown lives on /pricing; this is the shelf-level version, and
 * its quantity ranges are read off the same ladder config rather than typed in,
 * so the two can never quote different bands at a shopper. The third card
 * covers wholesale and wholesale+ together — at shelf level "20 or more" is the
 * decision, and the exact rung is on the pricing page.
 */
export function BuyingModes() {
  const retail = rungFor('RETAIL');
  const bulk = rungFor('BULK');
  const wholesale = rungFor('WHOLESALE');
  const top = LADDER_RUNGS[LADDER_RUNGS.length - 1];

  if (!retail || !bulk || !wholesale) return null;

  const modes = [
    {
      icon: ShoppingCart,
      title: 'Retail',
      range: `Buy ${retail.min_quantity} – ${retail.max_quantity} items`,
      body: 'Great prices for everyday needs',
      cta: 'Shop retail',
      href: '/browse',
      accent: 'gold',
    },
    {
      icon: Package,
      title: 'Bulk',
      range: `Buy ${bulk.min_quantity} – ${bulk.max_quantity} items`,
      body: `Lower prices — from ${bulk.discount_pct}% off retail`,
      cta: 'Buy in bulk',
      href: '/pricing',
      accent: 'forest',
    },
    {
      icon: Building2,
      title: 'Wholesale',
      range: `Buy ${wholesale.min_quantity}+ items`,
      body: `Best prices for business and resale, up to ${top.discount_pct}% off`,
      cta: 'Shop wholesale',
      href: '/pricing',
      accent: 'plum',
    },
  ] as const;

  const ACCENTS = {
    gold: { card: 'bg-gold-50/70', icon: 'text-gold-dark', button: 'bg-gold text-ink hover:bg-gold-dark hover:text-white' },
    forest: { card: 'bg-forest-wash/60', icon: 'text-forest', button: 'bg-forest text-white hover:bg-forest-light' },
    plum: { card: 'bg-plum-wash/60', icon: 'text-plum', button: 'bg-plum text-white hover:bg-plum-ink' },
  };

  return (
    <section>
      <div className="flex items-end justify-between gap-3">
        <h2 className="font-display text-[19px] font-bold tracking-[-0.02em] text-ink sm:text-[24px]">
          Choose how you want to buy
        </h2>
        <Link
          href="/pricing"
          className="inline-flex shrink-0 items-center gap-1.5 text-[12.5px] font-medium text-gold-dark transition-colors hover:text-ink"
        >
          Full breakdown
          <ArrowRight size={13} strokeWidth={1.75} />
        </Link>
      </div>

      <ul className="mt-3 grid gap-2.5 sm:grid-cols-3">
        {modes.map((mode) => {
          const accent = ACCENTS[mode.accent];

          return (
            <li key={mode.title} className={cn('flex flex-col rounded-md p-4', accent.card)}>
              <mode.icon size={22} strokeWidth={1.5} className={accent.icon} />
              <h3 className="mt-2.5 font-display text-[17px] font-semibold text-ink">{mode.title}</h3>
              <p className="mt-0.5 text-[12.5px] font-medium text-body">{mode.range}</p>
              <p className="mt-1.5 flex-1 text-[12.5px] leading-5 text-muted">{mode.body}</p>

              <Link
                href={mode.href}
                className={cn(
                  'mt-3.5 flex h-10 items-center justify-center rounded-full text-[13px] font-medium transition-colors',
                  accent.button,
                )}
              >
                {mode.cta}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
