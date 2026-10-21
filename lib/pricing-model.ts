/**
 * The AfriDeal price ladder - one rule, applied to every product.
 *
 * AfriDeal buys from a verified supplier and resells to the customer. The
 * customer-facing price is the landed cost (the supplier's cost, converted to
 * pula) plus a published markup decided by how many units the customer takes
 * (spec 0007, the product owner's developer table of 2026-10-20). Customs is
 * not in it: since 2026-10-21 the courier clears the goods and charges for it
 * in the delivery fee (spec 0008).
 *
 *   1 – 4 units      Retail        landed + 50%, less 2 / 3 / 5% for 2 / 3 / 4 units
 *   5 – 10 units     Bulk          landed + 33%
 *   11 – 20 units    Wholesale     landed + 25%
 *   21 – 99 units    Wholesale+    landed + 18%
 *   100 units +      Custom        by quotation
 *
 * Worked example, an 8" wig at a supplier cost of R280 (rate 1:1 for now):
 *
 *   Landed       280 × 1.00 = BWP 280
 *   Retail       280 × 1.50 = BWP 420 per unit
 *   Bulk         280 × 1.33 = BWP 373 per unit (372.40, rounded up)
 *   Wholesale    280 × 1.25 = BWP 350 per unit
 *   Wholesale+   280 × 1.18 = BWP 331 per unit (330.40, rounded up)
 *
 * The arithmetic itself lives in `lib/pricing-formula.mjs`, shared with the
 * seed, so the published bands and the charged price cannot disagree.
 *
 * Three decisions are deliberate and worth keeping.
 *
 * Delivery is quoted separately at checkout against the real address rather
 * than smeared across every unit, so a customer collecting from Gaborone is not
 * paying for a Francistown run. Customs goes with delivery: the buyer's chosen
 * courier clears the goods and prices the clearance into its own fee.
 *
 * The ladder does not vary by account type. Everyone - a first-time visitor, a
 * salon owner, a school procurement officer - is shown the same published
 * figures for the same quantity.
 *
 * Quantity is counted across one seller's units in one category (spec 0007,
 * AC-5), so a salon taking three 8" and three 10" wigs stands on the bulk rung.
 */

import type { PricingTier } from '@/types';

import {
  LADDER_RUNGS,
  QUOTATION_THRESHOLD as THRESHOLD,
  unitPrice,
} from './pricing-formula.mjs';

/** Where the quantity ladder stops publishing and starts quoting. */
export const QUOTATION_THRESHOLD: number = THRESHOLD;

/** The tiers that carry a published figure, cheapest last. */
export type PublishedTier = Extract<
  PricingTier,
  'RETAIL' | 'BULK' | 'WHOLESALE' | 'WHOLESALE_PLUS'
>;

export interface LadderRung {
  tier: PublishedTier;
  /** Fraction of the landed cost added on top, e.g. 0.5 for 50%. */
  markup: number;
  minimum_quantity: number;
  maximum_quantity: number;
  /** Minimum share of the selling price kept after landed cost and card fee, in %. */
  floor: number;
}

/**
 * The published rungs, cheapest last, from `lib/pricing-formula.mjs`. Changing
 * a markup there changes every customer price on the next seed, and every
 * figure the storefront quotes.
 */
export const LADDER: LadderRung[] = LADDER_RUNGS.map((rung) => ({ ...rung }));

/**
 * Selling price for one unit at a given rung, from a landed cost in thebe.
 *
 * Rounded up to the Pula. Rounding down would let a rounding error, applied
 * across a hundred-unit order, quietly eat the margin the rung was set to earn.
 */
export function priceAtRung(landedThebe: number, rung: LadderRung): number {
  return unitPrice(landedThebe, rung.markup);
}

/** The rung a quantity falls on, or null once it passes into quotation territory. */
export function rungForQuantity(quantity: number): LadderRung | null {
  return (
    LADDER.find(
      (rung) => quantity >= rung.minimum_quantity && quantity <= rung.maximum_quantity,
    ) ?? null
  );
}

export function requiresQuotation(quantity: number): boolean {
  return quantity >= QUOTATION_THRESHOLD;
}

/** `1–4`, `5–10`, `100+` - the range as the buyer reads it. */
export function rungRange(rung: LadderRung): string {
  return `${rung.minimum_quantity}–${rung.maximum_quantity}`;
}

/** Markup on the landed cost, in whole percent: `{ RETAIL: 50, … }`. */
export const MARKUP_PCT: Record<PublishedTier, number> = Object.fromEntries(
  LADDER.map((rung) => [rung.tier, Math.round(rung.markup * 1000) / 10]),
) as Record<PublishedTier, number>;

/**
 * What a buyer saves per unit by moving from the retail rung to another one, on
 * the same landed cost. Expressed against the retail price, because that is the
 * figure they would otherwise have paid.
 */
export function savingPctAt(tier: PublishedTier): number {
  const retail = 1 + LADDER[0].markup;
  const rung = LADDER.find((entry) => entry.tier === tier);
  if (!rung) return 0;
  return ((retail - (1 + rung.markup)) / retail) * 100;
}

/** The saving on the cheapest published rung - the headline the ladder earns. */
export function deepestSavingPct(): number {
  return savingPctAt(LADDER[LADDER.length - 1].tier);
}

/** Kept for the surfaces that quote the first quantity break by name. */
export function bulkSavingPct(): number {
  return savingPctAt('BULK');
}
