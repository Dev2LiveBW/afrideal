/**
 * The AfriDeal price ladder - one rule, applied to every product.
 *
 * AfriDeal buys from a verified supplier and resells to the customer. The
 * customer-facing price is therefore the supplier's cost plus a published
 * platform markup, and the markup is decided by how many units the customer
 * takes:
 *
 *   1 – 4 units      Retail        cost + 60%
 *   5 – 19 units     Bulk          cost + 46%
 *   20 – 49 units    Wholesale     cost + 32%
 *   50 – 99 units    Wholesale+    cost + 22%
 *   100 units +      Custom        by quotation
 *
 * Worked example, on a supplier cost of BWP 250.00:
 *
 *   Retail       250 × 1.60 = BWP 400.00 per unit
 *   Bulk         250 × 1.46 = BWP 365.00 per unit   (BWP  35.00 per unit less)
 *   Wholesale    250 × 1.32 = BWP 330.00 per unit   (BWP  70.00 per unit less)
 *   Wholesale+   250 × 1.22 = BWP 305.00 per unit   (BWP  95.00 per unit less)
 *   100 +        quoted against the volume, the delivery point and the lead time
 *
 * Four published rungs rather than two. Two rungs made the ladder an argument
 * about a single quantity break; a buyer taking twenty units and a buyer taking
 * ninety stood on the same price, so the catalogue had nothing to say to the
 * reseller it most wants. Four rungs give the same product a rate at every
 * quantity a Botswana buyer actually orders in, and the board that publishes
 * them is the baseline for every product in the catalogue - there is no product
 * priced on a different structure, and none where a rung is hidden until you
 * register.
 *
 * Three decisions are deliberate and worth keeping.
 *
 * The markup applies to the supplier cost alone. Delivery is quoted separately
 * at checkout against the real address rather than smeared across every unit,
 * so a customer collecting from Gaborone is not paying for a Francistown run.
 *
 * The ladder does not vary by account type. Everyone - a first-time visitor, a
 * salon owner, a school procurement officer - is shown the same published
 * figures for the same quantity. A price the buyer has to apply for is not a
 * price advantage they can act on, and the whole argument of the catalogue is
 * that the buyer can see the comparison before committing.
 *
 * The gaps narrow as the ladder descends: 14 points from retail to bulk, then
 * 14, then 10. The margin has to survive the bottom rung on the platform's
 * thinnest category, and a ladder that kept stepping by the full amount would
 * have priced the deepest rung under its floor rather than earning its way
 * there.
 */

import type { PricingTier } from '@/types';

/** Where the quantity ladder stops publishing and starts quoting. */
export const QUOTATION_THRESHOLD = 100;

/** The tiers that carry a published figure, cheapest last. */
export type PublishedTier = Extract<
  PricingTier,
  'RETAIL' | 'BULK' | 'WHOLESALE' | 'WHOLESALE_PLUS'
>;

export interface LadderRung {
  tier: PublishedTier;
  /** Fraction of supplier cost added on top, e.g. 0.6 for 60%. */
  markup: number;
  minimum_quantity: number;
  maximum_quantity: number;
}

/**
 * The published rungs, cheapest last. Changing a markup here changes every
 * customer price on the next seed, and every figure the storefront quotes.
 */
export const LADDER: LadderRung[] = [
  { tier: 'RETAIL', markup: 0.6, minimum_quantity: 1, maximum_quantity: 4 },
  { tier: 'BULK', markup: 0.46, minimum_quantity: 5, maximum_quantity: 19 },
  { tier: 'WHOLESALE', markup: 0.32, minimum_quantity: 20, maximum_quantity: 49 },
  {
    tier: 'WHOLESALE_PLUS',
    markup: 0.22,
    minimum_quantity: 50,
    maximum_quantity: QUOTATION_THRESHOLD - 1,
  },
];

/**
 * Selling price for one unit at a given rung.
 *
 * Rounded up to the Pula. Rounding down would let a rounding error, applied
 * across a hundred-unit order, quietly eat the margin the rung was set to earn.
 */
export function priceAtRung(supplierCost: number, rung: LadderRung): number {
  return Math.ceil(supplierCost * (1 + rung.markup));
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

/** `1–4`, `5–19`, `100+` - the range as the buyer reads it. */
export function rungRange(rung: LadderRung): string {
  return `${rung.minimum_quantity}–${rung.maximum_quantity}`;
}

export const MARKUP_PCT: Record<PublishedTier, number> = Object.fromEntries(
  LADDER.map((rung) => [rung.tier, rung.markup * 100]),
) as Record<PublishedTier, number>;

/**
 * What a buyer saves per unit by moving from the retail rung to another one, on
 * the same supplier cost. Expressed against the retail price, because that is
 * the figure they would otherwise have paid.
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
