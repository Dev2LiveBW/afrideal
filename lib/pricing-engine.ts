import type { PriceResult, PricingRule } from '@/types';

/**
 * Pricing engine.
 *
 * Rules are data, not code — they live in /data/pricing-rules.json and are
 * editable from /admin/pricing. Changing a category markup there changes every
 * recommended price on the next read, with no redeploy.
 */

export const DEFAULT_LOGISTICS_COST = 15;
export const DEFAULT_GATEWAY_RATE = 0.025;

/**
 * Landed price for one unit.
 *
 *   markup    = percentage of supplier cost, or a flat Pula amount
 *   logistics = per-unit delivery contribution
 *   gateway   = payment processing, charged on the supplier cost
 *   price     = ceil(cost + markup + logistics + gateway)
 *
 * `margin_pct` is margin over the *selling price*, not over cost, so it reads
 * the way a finance team expects on a P&L.
 */
export function calculatePrice(supplierCost: number, rule: PricingRule | null): PriceResult {
  const markup =
    rule == null
      ? 0
      : rule.markup_type === 'PERCENTAGE'
        ? supplierCost * (rule.markup_value / 100)
        : rule.markup_value;

  const logisticsCost = rule?.logistics_cost ?? DEFAULT_LOGISTICS_COST;
  const gatewayCost = supplierCost * (rule?.gateway_rate ?? DEFAULT_GATEWAY_RATE);
  const recommendedPrice = Math.ceil(supplierCost + markup + logisticsCost + gatewayCost);

  return {
    supplier_cost: supplierCost,
    markup,
    logistics_cost: logisticsCost,
    gateway_cost: gatewayCost,
    recommended_price: recommendedPrice,
    margin: markup,
    margin_pct: recommendedPrice === 0 ? 0 : (markup / recommendedPrice) * 100,
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
  const gatewayCost = supplierCost * (rule?.gateway_rate ?? DEFAULT_GATEWAY_RATE);
  const margin = sellingPrice - supplierCost - logisticsCost - gatewayCost;

  return {
    margin,
    margin_pct: sellingPrice === 0 ? 0 : (margin / sellingPrice) * 100,
    logistics_cost: logisticsCost,
    gateway_cost: gatewayCost,
  };
}
