/**
 * The AfriDeal price ladder - one rule, applied to every product.
 *
 * AfriDeal buys from a verified supplier and resells to the customer. The
 * customer-facing price is therefore the supplier's cost plus a published
 * platform markup, and the markup is decided by how many units the customer
 * takes:
 *
 *   1 – 4 units      Retail      cost + 60%
 *   5 – 99 units     Bulk        cost + 44%
 *   100 units +      Wholesale   by quotation
 *
 * Worked example, on a supplier cost of BWP 200.00:
 *
 *   Retail   200 × 1.60 = BWP 320.00 per unit
 *   Bulk     200 × 1.44 = BWP 288.00 per unit   (BWP 32.00 per unit less)
 *   100 +    quoted against the volume, the delivery point and the lead time
 *
 * Two decisions are deliberate and worth keeping.
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
 */

import type { PricingTier } from '@/types';

/** Where the quantity ladder stops publishing and starts quoting. */
export const QUOTATION_THRESHOLD = 100;

export interface LadderRung {
  tier: Extract<PricingTier, 'RETAIL' | 'BULK'>;
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
  { tier: 'BULK', markup: 0.44, minimum_quantity: 5, maximum_quantity: QUOTATION_THRESHOLD - 1 },
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

/** `1–4`, `5–99`, `100+` - the range as the buyer reads it. */
export function rungRange(rung: LadderRung): string {
  return `${rung.minimum_quantity}–${rung.maximum_quantity}`;
}

export const MARKUP_PCT: Record<LadderRung['tier'], number> = {
  RETAIL: LADDER[0].markup * 100,
  BULK: LADDER[1].markup * 100,
};

/**
 * What a buyer saves per unit by moving from the retail rung to the bulk rung
 * on the same supplier cost. Expressed against the retail price, because that
 * is the figure they would otherwise have paid.
 */
export function bulkSavingPct(): number {
  const retail = 1 + LADDER[0].markup;
  const bulk = 1 + LADDER[1].markup;
  return ((retail - bulk) / retail) * 100;
}
