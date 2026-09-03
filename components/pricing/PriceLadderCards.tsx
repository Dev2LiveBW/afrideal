import Link from 'next/link';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Handshake,
  Package,
  ShoppingBag,
  Store,
  Tag,
} from 'lucide-react';

import { PriceTag } from '@/components/brand/MoneyText';
import { ACCOUNT_DISCOUNTS, ladderFor, rungRange, type LadderStep } from '@/lib/price-ladder';
import { CUSTOMER_TYPE_LABELS } from '@/lib/pricing-tiers';
import { cn } from '@/lib/utils';
import type { CustomerType, PricingTier } from '@/types';

/**
 * The published ladder, explained (§14/§20).
 *
 * Mobile is the design target: one card per rung, stacked, legible on a 360px
 * screen without pinching. The example price beside each rung is computed from
 * a real catalogue product through lib/price-ladder rather than typed into the
 * markup — the one page on the site that explains pricing is the one page that
 * must never quote a number checkout would disagree with.
 */

const RUNG_ICONS: Partial<Record<PricingTier, typeof ShoppingBag>> = {
  RETAIL: ShoppingBag,
  BULK: Package,
  WHOLESALE: Store,
  WHOLESALE_PLUS: Building2,
  RFQ: Handshake,
};

/** One accent per rung, written out in full so Tailwind keeps the classes. */
const ACCENTS = {
  forest: {
    card: 'border-forest/25 bg-forest-wash/40',
    icon: 'bg-forest text-white',
    title: 'text-forest-ink',
    range: 'text-forest',
    badge: 'bg-forest-wash text-forest-ink ring-forest/20',
    example: 'bg-forest-wash/70',
  },
  slate: {
    card: 'border-royal/20 bg-royal-wash/50',
    icon: 'bg-royal text-white',
    title: 'text-royal-ink',
    range: 'text-royal',
    badge: 'bg-royal-wash text-royal-ink ring-royal/20',
    example: 'bg-royal-wash/70',
  },
  gold: {
    card: 'border-gold/30 bg-gold-50/60',
    icon: 'bg-gold text-white',
    title: 'text-gold-700',
    range: 'text-gold-dark',
    badge: 'bg-gold-50 text-gold-700 ring-gold/25',
    example: 'bg-gold-50/80',
  },
  plum: {
    card: 'border-plum/20 bg-plum-wash/50',
    icon: 'bg-plum text-white',
    title: 'text-plum-ink',
    range: 'text-plum',
    badge: 'bg-plum-wash text-plum-ink ring-plum/20',
    example: 'bg-plum-wash/70',
  },
  ink: {
    card: 'border-hairline bg-surface-raised',
    icon: 'bg-ink text-white',
    title: 'text-ink',
    range: 'text-body',
    badge: 'bg-ink/[0.06] text-ink ring-hairline-strong',
    example: 'bg-surface-sunk/70',
  },
} as const;

/**
 * The worked example.
 *
 * Rendered once and placed by `flex-wrap`: it wraps onto its own full-width row
 * on a phone and sits beside the copy from `sm` up. Rendering a phone copy and
 * a desktop copy and hiding one would read every price twice to a screen
 * reader, which is a worse bug than the layout it fixes.
 */
function ExampleFigure({ step }: { step: LadderStep }) {
  if (step.quote_only) {
    return (
      <div className="flex items-center justify-between gap-3 sm:block sm:text-right">
        <p className="text-[11.5px] text-muted">Request a quote</p>
        <Link
          href="/browse"
          className="inline-flex items-center gap-1.5 rounded-full bg-surface-raised px-3 py-2 text-[12.5px] font-medium text-ink ring-1 ring-inset ring-hairline-strong transition-colors hover:bg-ink hover:text-white sm:mt-1.5"
        >
          Get a quote
          <ArrowRight size={13} strokeWidth={1.75} />
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-baseline justify-between gap-3 sm:block sm:text-right">
      <p className="text-[11.5px] text-muted">Example price</p>
      <div className="flex items-baseline gap-2 sm:mt-1 sm:block">
        <p>
          <PriceTag amount={step.unit_price} size="lg" />
          <span className="ml-1 text-[11.5px] font-normal text-muted">/ unit</span>
        </p>
        <p className="font-mono text-[11px] tabular-nums text-muted">
          {step.example_quantity} {step.example_quantity === 1 ? 'unit' : 'units'}
        </p>
      </div>
    </div>
  );
}

function RungCard({ step, isCurrent }: { step: LadderStep; isCurrent: boolean }) {
  const accent = ACCENTS[step.copy.accent];
  const Icon = RUNG_ICONS[step.rung.tier] ?? Tag;

  return (
    <li
      className={cn(
        'rounded-md border p-4 sm:p-5',
        accent.card,
        isCurrent && 'ring-1 ring-inset ring-forest/40',
      )}
    >
      <div className="flex flex-wrap gap-3.5 sm:flex-nowrap sm:gap-4">
        <span
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full sm:h-11 sm:w-11',
            accent.icon,
          )}
        >
          <Icon size={18} strokeWidth={1.6} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3
              className={cn('font-display text-[17px] font-semibold sm:text-[19px]', accent.title)}
            >
              {step.copy.title}
            </h3>

            {isCurrent ? (
              <span className="rounded-full bg-forest px-2 py-0.5 text-[10.5px] font-medium text-white">
                Your tier
              </span>
            ) : (
              step.copy.badge && (
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[10.5px] font-medium ring-1 ring-inset',
                    accent.badge,
                  )}
                >
                  {step.copy.badge}
                </span>
              )
            )}
          </div>

          <p className={cn('mt-0.5 font-mono text-[12.5px] font-medium tabular-nums', accent.range)}>
            {rungRange(step.rung)}
          </p>

          <p className="mt-2 text-[13px] leading-5 text-body">
            {step.copy.headline}
            <span className="block text-muted">{step.copy.blurb}</span>
          </p>
        </div>

        {/* Full width on a phone — 150px of price column beside the copy
            squeezes a tier name onto three lines — and a fixed column from
            `sm` up, where there is room for both. */}
        <div
          className={cn(
            'w-full shrink-0 rounded px-3.5 py-2.5 sm:w-[150px] sm:py-3',
            accent.example,
          )}
        >
          <ExampleFigure step={step} />
        </div>
      </div>
    </li>
  );
}

export function PriceLadderCards({
  retailPrice,
  customerType,
  exampleName,
}: {
  /** Retail unit price of the product the worked examples are drawn from. */
  retailPrice: number;
  /** Resolved from the session on the server — never a control in the browser. */
  customerType: CustomerType | null;
  exampleName?: string;
}) {
  const account = customerType && customerType !== 'GUEST' ? customerType : null;
  const steps = ladderFor(retailPrice, account ?? 'RETAIL');

  // A trade account's discount stacks on every rung from Bulk up, so no single
  // rung is "theirs". Only a retail account stands on one, and that is the one
  // the badge marks.
  const tradeDiscount = account ? (ACCOUNT_DISCOUNTS[account] ?? 0) : 0;

  return (
    <div>
      <div className="flex items-start gap-3.5 sm:gap-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-forest text-white sm:h-14 sm:w-14">
          <Tag size={20} strokeWidth={1.6} />
        </span>
        <h2 className="font-display text-[22px] font-bold leading-[1.15] tracking-[-0.02em] text-ink sm:text-[30px]">
          The price depends on who is buying and how many
        </h2>
      </div>

      <p className="mt-4 text-[13.5px] leading-6 text-body sm:text-[15px] sm:leading-7">
        A product does not have one universal price. Prices are set per account type and per
        quantity, and they apply automatically at checkout.
      </p>

      {account && (
        <p className="mt-5 flex items-start gap-2 rounded-md bg-forest-wash/70 px-4 py-3 text-[13px] font-medium text-forest-ink">
          <CheckCircle2 size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-forest" />
          <span>
            You are on the {CUSTOMER_TYPE_LABELS[account].replace(' customer', '')} tier
            {tradeDiscount > 0 && (
              <span className="block font-normal text-forest">
                Your account takes a further {tradeDiscount}% off every rung from Bulk upward. The
                example prices below already include it.
              </span>
            )}
          </span>
        </p>
      )}

      <ul className="mt-4 space-y-2.5 sm:space-y-3">
        {steps.map((step) => (
          <RungCard
            key={step.rung.tier}
            step={step}
            isCurrent={account !== null && tradeDiscount === 0 && step.rung.tier === 'RETAIL'}
          />
        ))}
      </ul>

      {exampleName && (
        <p className="mt-4 text-[12px] leading-5 text-muted">
          Example prices are live figures for {exampleName}. Every product steps down the same ladder
          from its own retail price, so the percentages hold whatever you are buying.
        </p>
      )}
    </div>
  );
}
