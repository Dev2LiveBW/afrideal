import type { PriceResult, PricingRule } from '@/types';

import { LADDER } from './pricing-model';

/**
 * Pricing engine.
 *
 * The customer price is the supplier's cost plus a published markup, and
 * nothing else. Delivery is quoted separately at checkout against the real
 * address, and the payment provider's fee is a cost AfriDeal carries out of its
 * own margin rather than a surcharge bolted onto the shelf price. So:
 *
 *   price  = ceil(supplier_cost × (1 + markup))
 *   margin = price − supplier_cost − logistics − gateway fee
 *
 * Rules are data, not code - they live in /data/pricing-rules.json and are
 * editable from /admin/pricing. Changing a category's markup there changes
 * every recommended price on the next read, with no redeploy. The defaults are
 * the platform ladder in `pricing-model.ts`.
 */

export const DEFAULT_LOGISTICS_COST = 15;
export const DEFAULT_GATEWAY_RATE = 0.025;

/** The platform's standing retail markup, as a percentage. */
export const DEFAULT_MARKUP_PCT = LADDER[0].markup * 100;

/**
 * Landed price for one unit, plus the margin that survives after the costs
 * AfriDeal absorbs.
 *
 * `margin_pct` is margin over the *selling price*, not over cost, so it reads
 * the way a finance team expects on a P&L. `markup` is reported separately and
 * is the figure the pricing rule is actually set in - conflating the two
 * overstates profitability on every report.
 */
export function calculatePrice(supplierCost: number, rule: PricingRule | null): PriceResult {
  const markupPct =
    rule == null
      ? DEFAULT_MARKUP_PCT
      : rule.markup_type === 'PERCENTAGE'
        ? rule.markup_value
        : 0;

  const markup =
    rule != null && rule.markup_type === 'FIXED'
      ? rule.markup_value
      : supplierCost * (markupPct / 100);

  const recommendedPrice = Math.ceil(supplierCost + markup);

  const logisticsCost = rule?.logistics_cost ?? DEFAULT_LOGISTICS_COST;
  const gatewayCost = recommendedPrice * (rule?.gateway_rate ?? DEFAULT_GATEWAY_RATE);
  const margin = recommendedPrice - supplierCost - logisticsCost - gatewayCost;

  return {
    supplier_cost: supplierCost,
    markup,
    logistics_cost: logisticsCost,
    gateway_cost: gatewayCost,
    recommended_price: recommendedPrice,
    margin,
    margin_pct: recommendedPrice === 0 ? 0 : (margin / recommendedPrice) * 100,
  };
}

/** Pick the active rule for a category. */
export function getPricingRule(rules: PricingRule[], categoryId: string): PricingRule | null {
  return rules.find((rule) => rule.category_id === categoryId && rule.active) ?? null;
}

/** Convenience: look up the rule and price in one call. */
export function priceFor(
  supplierCost: number,
  categoryId: string,
  rules: PricingRule[],
): PriceResult {
  return calculatePrice(supplierCost, getPricingRule(rules, categoryId));
}

/**
 * Realised margin on a line that has already been sold, where the actual price
 * charged may differ from the recommendation (promotions, overrides, old carts).
 */
export function realisedMargin(sellingPrice: number, supplierCost: number, rule: PricingRule | null) {
  const logisticsCost = rule?.logistics_cost ?? DEFAULT_LOGISTICS_COST;
  const gatewayCost = sellingPrice * (rule?.gateway_rate ?? DEFAULT_GATEWAY_RATE);
  const margin = sellingPrice - supplierCost - logisticsCost - gatewayCost;

  return {
    margin,
    margin_pct: sellingPrice === 0 ? 0 : (margin / sellingPrice) * 100,
    logistics_cost: logisticsCost,
    gateway_cost: gatewayCost,
  };
}
