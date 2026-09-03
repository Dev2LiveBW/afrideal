import ladder from '@/data/price-ladder.json';

import type { CustomerType, PricingTier } from '@/types';

/**
 * The published price ladder.
 *
 * A product does not have one price. It has a retail price and a fixed set of
 * steps down from it, and which step a buyer stands on is decided by how many
 * units they take and what kind of account they hold.
 *
 * The numbers live in /data/price-ladder.json because two very different things
 * need to agree about them: this module, which explains and resolves prices at
 * runtime, and scripts/seed.mjs, which writes the bands into
 * /data/customer-prices.json. A ladder typed out twice is a ladder that drifts,
 * and a storefront that explains one discount while checkout charges another is
 * worse than having no explanation at all.
 *
 * Copy — labels, blurbs, badges — stays here rather than in the JSON, because
 * it is presentation and it changes for different reasons than the arithmetic.
 */

export interface LadderRungConfig {
  tier: PricingTier;
  min_quantity: number;
  /** null on the top rung — no upper bound. */
  max_quantity: number | null;
  /** Published step-down off the retail unit price, in percent. */
  discount_pct: number;
  /** §19 — the margin this rung may not be pushed below. */
  minimum_margin_pct: number;
  /** Set on the rung that is quoted rather than listed. */
  quote_only: boolean;
}

export const LADDER_CURRENCY = ladder.currency as 'BWP';

export const LADDER_RUNGS = ladder.rungs as LadderRungConfig[];

/**
 * §7 — the extra trade discount an account type earns, on top of the published
 * ladder. It applies from the BULK rung upward: a verified business buying a
 * single unit pays the same retail price as anyone else, because the discount
 * is for the volume commitment, not the letterhead.
 */
export const ACCOUNT_DISCOUNTS = ladder.account_discounts as Record<CustomerType, number>;

/** Per-category margin floors that override the ladder default (see §19). */
export const FLOOR_OVERRIDES = ladder.floor_overrides as Record<
  string,
  Partial<Record<PricingTier, number>>
>;

// ── Presentation ─────────────────────────────────────────────────────────────

export interface RungCopy {
  /** Short name, used in badges and tables. */
  label: string;
  /** What the rung is called on the pricing page. */
  title: string;
  /** The one-line promise. */
  headline: string;
  /** Who it is for. */
  blurb: string;
  /** Chip beside the title on the pricing page. */
  badge: string | null;
  /** Quantity used for the worked example on the pricing page. */
  example_quantity: number;
  /** Tailwind accent, so every surface tints a rung the same way. */
  accent: 'forest' | 'slate' | 'gold' | 'plum' | 'ink';
}

export const RUNG_COPY: Record<string, RungCopy> = {
  RETAIL: {
    label: 'Retail',
    title: 'Retail',
    headline: 'Standard everyday prices.',
    blurb: 'Perfect for personal shopping.',
    badge: null,
    example_quantity: 1,
    accent: 'forest',
  },
  BULK: {
    label: 'Bulk',
    title: 'Bulk',
    headline: 'Lower prices when you buy more.',
    blurb: 'Great for families and small resellers.',
    badge: 'Save more',
    example_quantity: 10,
    accent: 'slate',
  },
  WHOLESALE: {
    label: 'Wholesale',
    title: 'Wholesale',
    headline: 'Better prices for your business.',
    blurb: 'Stock more, save more.',
    badge: 'Best value',
    example_quantity: 20,
    accent: 'gold',
  },
  WHOLESALE_PLUS: {
    label: 'Wholesale+',
    title: 'Wholesale+',
    headline: 'Our best published prices.',
    blurb: 'For serious resellers and businesses.',
    badge: 'Maximum savings',
    example_quantity: 50,
    accent: 'plum',
  },
  RFQ: {
    label: 'Custom',
    title: 'Custom / Institutional',
    headline: 'Tailored pricing for large orders.',
    blurb: 'Talk to our team for the best deal.',
    badge: 'Get a quote',
    example_quantity: 100,
    accent: 'ink',
  },
};

/** `1 – 4 units`, `100+ units` — the range as the pricing page prints it. */
export function rungRange(rung: LadderRungConfig): string {
  if (rung.max_quantity === null) return `${rung.min_quantity}+ units`;
  return `${rung.min_quantity} – ${rung.max_quantity} units`;
}

// ── Arithmetic ───────────────────────────────────────────────────────────────

/**
 * The lowest price a rung may carry without breaching its margin floor.
 *
 * Solving `(price − cost − logistics − gateway) ÷ price ≥ floor` for price.
 * This is what stops a published discount from quietly selling at a loss on a
 * thin-margin category: the ladder proposes, the floor disposes.
 */
export function floorPrice(
  supplierCost: number,
  logisticsCost: number,
  gatewayRate: number,
  minimumMarginPct: number,
): number {
  const recoverable = supplierCost + logisticsCost + supplierCost * gatewayRate;
  if (minimumMarginPct >= 100) return recoverable * 2;
  return recoverable / (1 - minimumMarginPct / 100);
}

/** The rung a given quantity lands on. Quantities below 1 read as 1. */
export function rungForQuantity(quantity: number): LadderRungConfig {
  const qty = Math.max(1, Math.floor(quantity));
  return (
    LADDER_RUNGS.find(
      (rung) => qty >= rung.min_quantity && (rung.max_quantity === null || qty <= rung.max_quantity),
    ) ?? LADDER_RUNGS[LADDER_RUNGS.length - 1]
  );
}

export function rungFor(tier: PricingTier): LadderRungConfig | null {
  return LADDER_RUNGS.find((rung) => rung.tier === tier) ?? null;
}

/**
 * Total step-down for a rung and an account type.
 *
 * The two stack, but the account discount only applies once the buyer is past
 * the retail rung, and the combined figure is capped so no ladder arithmetic
 * can ever produce a free product.
 */
export function totalDiscountPct(
  rung: LadderRungConfig,
  customerType: CustomerType = 'RETAIL',
): number {
  const account = rung.discount_pct === 0 ? 0 : (ACCOUNT_DISCOUNTS[customerType] ?? 0);
  return Math.min(rung.discount_pct + account, 60);
}

/**
 * A rung's unit price, derived from the product's retail price.
 *
 * This is the guarantee the pricing page makes: whatever a product costs at
 * retail, its other rungs are that price stepped down by the published
 * percentages. Rounded to the Pula — nobody quotes thebe on a wholesale line.
 */
export function rungUnitPrice(
  retailUnitPrice: number,
  rung: LadderRungConfig,
  customerType: CustomerType = 'RETAIL',
): number {
  return Math.round(retailUnitPrice * (1 - totalDiscountPct(rung, customerType) / 100));
}

export interface LadderStep {
  rung: LadderRungConfig;
  copy: RungCopy;
  unit_price: number;
  /** Against the retail rung, per unit. */
  saving_per_unit: number;
  discount_pct: number;
  /** The rung is quoted, so the price is indicative rather than charged. */
  quote_only: boolean;
  /** Line total at the rung's worked-example quantity. */
  example_quantity: number;
  example_total: number;
}

/**
 * The full ladder for one retail price — every rung, priced.
 *
 * Used by the pricing page and by any product that has no explicit bands of its
 * own, which is what makes "every product abides by the ladder" true rather
 * than aspirational.
 */
export function ladderFor(
  retailUnitPrice: number,
  customerType: CustomerType = 'RETAIL',
): LadderStep[] {
  return LADDER_RUNGS.map((rung) => {
    const unitPrice = rungUnitPrice(retailUnitPrice, rung, customerType);
    const quantity = RUNG_COPY[rung.tier]?.example_quantity ?? rung.min_quantity;

    return {
      rung,
      copy: RUNG_COPY[rung.tier],
      unit_price: unitPrice,
      saving_per_unit: retailUnitPrice - unitPrice,
      discount_pct: totalDiscountPct(rung, customerType),
      quote_only: rung.quote_only,
      example_quantity: quantity,
      example_total: unitPrice * quantity,
    };
  });
}
