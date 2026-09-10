import Link from 'next/link';
import { ArrowRight, BadgeCheck } from 'lucide-react';

import { MoneyText } from '@/components/brand/MoneyText';
import { LADDER, MARKUP_PCT, QUOTATION_THRESHOLD } from '@/lib/pricing-model';
import { cn } from '@/lib/utils';
import type { DoorTier, TierDoor } from '@/lib/tier-doors';

/**
 * How a price is decided, said once. (TICKET-003)
 *
 * The landing page used to make this argument in three places: the "Choose how
 * you want to buy" cards (Retail / Bulk / Wholesale with their quantity
 * ranges), the packages section's prose about the markup falling from 60% to
 * 22%, and the priced packages board underneath it. Three blocks, one claim,
 * and the reader has to reconcile them before they believe any of it.
 *
 * This is that claim in one component: the rule, the rungs with their real
 * markups and real prices, and the rung the reader is standing on right now.
 *
 * Every figure is derived. The markups come from `LADDER`, the prices from the
 * doors the caller priced against a real product, and the quotation threshold
 * from `QUOTATION_THRESHOLD` - so a change to the ladder changes this section
 * rather than leaving it quoting a number the checkout no longer honours.
 */

/** One accent per rung, matching the packages board the rest of the site uses. */
const ACCENT: Record<TierDoor['accent'], { dot: string; wash: string; ink: string }> = {
  forest: { dot: 'bg-forest', wash: 'bg-forest-wash', ink: 'text-forest-ink' },
  ocean: { dot: 'bg-ocean', wash: 'bg-ocean-wash', ink: 'text-ocean-ink' },
  gold: { dot: 'bg-gold', wash: 'bg-gold-50', ink: 'text-gold-dark' },
  royal: { dot: 'bg-royal', wash: 'bg-royal-wash', ink: 'text-royal-ink' },
  ink: { dot: 'bg-ink', wash: 'bg-surface-sunk', ink: 'text-ink' },
};

export function PricingExplainer({
  doors,
  productName,
  currentTier,
  className,
}: {
  /** The five packages priced against one real product. */
  doors: TierDoor[];
  /** The product those figures belong to, named so they are not read as generic. */
  productName?: string;
  /** The rung the visitor's current quantity falls on. */
  currentTier: DoorTier;
  className?: string;
}) {
  if (doors.length === 0) return null;

  const current = doors.find((door) => door.tier === currentTier);
  const entryMarkup = MARKUP_PCT[LADDER[0].tier];
  const deepestRung = LADDER[LADDER.length - 1];
  const deepestMarkup = MARKUP_PCT[deepestRung.tier];

  return (
    <section className={cn('mx-auto max-w-market px-4', className)} aria-labelledby="pricing-tiers">
      <div className="rounded-lg border border-hairline bg-surface-raised p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 id="pricing-tiers" className="font-display text-headline-md font-semibold text-ink">
              Your price depends on how many you buy
            </h2>
            <p className="measure mt-2 text-[14px] leading-6 text-body">
              A product does not have one price. AfriDeal buys from the supplier and resells to you
              at a published markup that falls as your quantity rises — from{' '}
              <span className="font-mono tabular-nums text-ink">{entryMarkup}%</span> at retail down
              to <span className="font-mono tabular-nums text-ink">{deepestMarkup}%</span> at{' '}
              <span className="font-mono tabular-nums text-ink">
                {deepestRung.minimum_quantity}
              </span>{' '}
              units. The rung your quantity lands on is applied automatically at checkout — nothing
              to apply for, and no rung hidden behind an account.
            </p>
          </div>

          {/* The reader's own rung, stated rather than left to be inferred from the board. */}
          {current && (
            <p className="inline-flex shrink-0 items-center gap-2 rounded-full bg-forest-wash px-4 py-2 text-[13px] font-medium text-forest-ink ring-1 ring-inset ring-forest/20">
              <BadgeCheck size={15} strokeWidth={1.6} aria-hidden="true" className="text-forest" />
              You are on the {current.label} tier
            </p>
          )}
        </div>

        {productName && (
          <p className="mt-6 text-[12.5px] leading-5 text-muted">
            Priced on <span className="font-medium text-ink">{productName}</span>, per unit.
          </p>
        )}

        {/*
          The rungs as a single strip rather than five cards. Read left to
          right it is the sentence above with figures attached: same product,
          more units, less markup.
        */}
        <ol className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {doors.map((door) => {
            const accent = ACCENT[door.accent];
            const isCurrent = door.tier === currentTier;

            return (
              <li key={door.tier}>
                <Link
                  href={door.href}
                  className={cn(
                    'flex h-full flex-col rounded-md border p-4 transition-shadow hover:shadow-card',
                    isCurrent ? 'border-forest/40 ring-1 ring-inset ring-forest/20' : 'border-hairline',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className={cn('h-2 w-2 shrink-0 rounded-full', accent.dot)} aria-hidden="true" />
                    <span className="truncate text-[13.5px] font-semibold text-ink">{door.label}</span>
                  </div>

                  <p className="mt-1 font-mono text-[11.5px] tabular-nums text-muted">
                    {door.range ?? '—'} units
                  </p>

                  <div className="mt-3">
                    {door.byQuotation ? (
                      <p className="text-[13px] font-medium text-ink">By quotation</p>
                    ) : door.unitPrice !== null ? (
                      <MoneyText amount={door.unitPrice} size="md" tone="ink" />
                    ) : (
                      <p className="text-[13px] text-muted">—</p>
                    )}
                  </div>

                  <p className={cn('mt-1 font-mono text-[11.5px] tabular-nums', accent.ink)}>
                    {door.byQuotation
                      ? `${QUOTATION_THRESHOLD}+ units`
                      : door.savingPct > 0
                        ? `−${door.savingPct.toFixed(0)}% vs retail`
                        : 'Retail rung'}
                  </p>

                  {isCurrent && (
                    <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-forest">
                      Your tier
                    </p>
                  )}
                </Link>
              </li>
            );
          })}
        </ol>

        <Link
          href="/how-it-works"
          className="mt-6 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-forest underline-offset-4 hover:underline"
        >
          How the ladder is calculated
          <ArrowRight size={13} strokeWidth={1.75} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
