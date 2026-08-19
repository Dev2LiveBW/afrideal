import type {
  CustomerPrice,
  CustomerType,
  MarginAlert,
  MarginBreakdown,
  MarginRule,
  MarginType,
  PricingTier,
  Product,
  SupplierOffer,
  TieredPriceResult,
} from '@/types';

/**
 * Tiered pricing engine (revised spec §14–§20).
 *
 * Replaces the assumption that a product has one price. A product has a ladder
 * of price bands, and which rung a buyer stands on depends on who they are and
 * how many units they are taking.
 *
 * Nothing here is hard-coded: bands live in /data/customer-prices.json and the
 * rules that generate them live in /data/margin-rules.json.
 */

// ── §17/§18 — margin arithmetic ──────────────────────────────────────────────

/**
 * Apply a margin rule to a supplier cost and return the selling price.
 *
 * The distinction §18 insists on:
 *
 *   markup  → price = cost × (1 + v)          30% on 250 → 325.00
 *   margin  → price = cost ÷ (1 − v)          30% on 250 → 357.14
 *
 * Getting these the wrong way round overstates profitability on every report,
 * which is exactly why the spec calls it out.
 */
export function applyMargin(supplierCost: number, type: MarginType, value: number, fixed = 0): number {
  switch (type) {
    case 'PERCENTAGE_MARKUP':
      return supplierCost * (1 + value / 100);

    case 'PERCENTAGE_MARGIN': {
      // A 100% margin is undefined — the divisor collapses to zero.
      if (value >= 100) return supplierCost * 2;
      return supplierCost / (1 - value / 100);
    }

    case 'FIXED_MARGIN':
      return supplierCost + value;

    case 'FIXED_FEE':
      return supplierCost + value;

    case 'HYBRID':
      return supplierCost * (1 + value / 100) + fixed;

    case 'COMMISSION':
      // Model B: the supplier sets the price and AfriDeal takes a cut of it,
      // so the supplier cost already is the customer-facing price.
      return supplierCost / (1 - value / 100);

    default:
      return supplierCost;
  }
}

/** §18 — the honest breakdown. Markup and margin are reported separately. */
export function marginBreakdown(
  sellingPrice: number,
  supplierCost: number,
  logisticsCost: number,
  gatewayRate: number,
): MarginBreakdown {
  const gatewayCost = supplierCost * gatewayRate;
  const grossMargin = sellingPrice - supplierCost - logisticsCost - gatewayCost;

  return {
    supplier_cost: supplierCost,
    selling_price: sellingPrice,
    logistics_cost: logisticsCost,
    gateway_cost: gatewayCost,
    gross_margin: grossMargin,
    gross_margin_pct: sellingPrice === 0 ? 0 : (grossMargin / sellingPrice) * 100,
    markup_pct: supplierCost === 0 ? 0 : (grossMargin / supplierCost) * 100,
  };
}

// ── §7 — customer type to reachable tiers ────────────────────────────────────

/**
 * Which tiers a buyer may be quoted.
 *
 * A retail consumer is never shown wholesale pricing, and a reseller is never
 * forced to buy at retail. Guests see retail only, which is what makes the
 * catalogue browsable without an account.
 */
export const TIERS_BY_CUSTOMER_TYPE: Record<CustomerType, PricingTier[]> = {
  GUEST: ['RETAIL', 'PROMOTIONAL'],
  RETAIL: ['RETAIL', 'BULK', 'PROMOTIONAL'],
  BUSINESS: ['RETAIL', 'BULK', 'WHOLESALE', 'PROMOTIONAL', 'NEGOTIATED'],
  RESELLER: ['BULK', 'WHOLESALE', 'PROMOTIONAL', 'NEGOTIATED'],
  INSTITUTIONAL: ['BULK', 'WHOLESALE', 'NEGOTIATED', 'RFQ'],
};

export function canReachTier(customerType: CustomerType, tier: PricingTier): boolean {
  return TIERS_BY_CUSTOMER_TYPE[customerType]?.includes(tier) ?? false;
}

// ── §14/§15 — band resolution ────────────────────────────────────────────────

function isLive(band: CustomerPrice, now: Date): boolean {
  if (band.status !== 'ACTIVE') return false;
  if (new Date(band.effective_from) > now) return false;
  if (band.effective_to && new Date(band.effective_to) < now) return false;
  return true;
}

function matchesQuantity(band: CustomerPrice, quantity: number): boolean {
  if (quantity < band.minimum_quantity) return false;
  if (band.maximum_quantity !== null && quantity > band.maximum_quantity) return false;
  return true;
}

/**
 * Every band a buyer of this type may be shown for this product, cheapest rung
 * last. This is the ladder rendered on the product page.
 */
export function priceLadder(
  bands: CustomerPrice[],
  productId: string,
  customerType: CustomerType,
  variantId: string | null = null,
  now: Date = new Date(),
): CustomerPrice[] {
  return bands
    .filter((band) => band.product_id === productId)
    .filter((band) => band.variant_id === null || band.variant_id === variantId)
    .filter((band) => band.customer_type === customerType)
    .filter((band) => canReachTier(customerType, band.pricing_tier))
    .filter((band) => isLive(band, now))
    .sort((a, b) => a.minimum_quantity - b.minimum_quantity);
}

/**
 * Resolve the price for a specific quantity.
 *
 * Falls back to the retail ladder when a buyer type has no bands of its own, so
 * a business account never sees an empty price. When the quantity runs past the
 * top band, `requires_rfq` is set rather than silently quoting the top rung —
 * that is the §20 "100+ → request quotation" behaviour.
 */
export function resolvePrice(
  bands: CustomerPrice[],
  product: Product,
  quantity: number,
  customerType: CustomerType = 'RETAIL',
  variantId: string | null = null,
  now: Date = new Date(),
): TieredPriceResult {
  const ladder = priceLadder(bands, product.id, customerType, variantId, now);
  const fallback = customerType === 'RETAIL' ? [] : priceLadder(bands, product.id, 'RETAIL', variantId, now);
  const usable = ladder.length > 0 ? ladder : fallback;

  const retailBase =
    usable.find((band) => band.minimum_quantity <= 1)?.unit_price ?? product.price;

  const match = usable.find((band) => matchesQuantity(band, quantity));

  // Past the top of the ladder: quote by RFQ rather than guessing.
  if (!match) {
    const top = usable[usable.length - 1] ?? null;
    const beyondTop =
      top !== null && top.maximum_quantity !== null && quantity > top.maximum_quantity;

    if (beyondTop) {
      return {
        unit_price: top.unit_price,
        line_total: top.unit_price * quantity,
        quantity,
        tier: 'RFQ',
        customer_type: customerType,
        saving_per_unit: retailBase - top.unit_price,
        saving_pct: retailBase === 0 ? 0 : ((retailBase - top.unit_price) / retailBase) * 100,
        requires_rfq: true,
        band: top,
      };
    }

    return {
      unit_price: product.price,
      line_total: product.price * quantity,
      quantity,
      tier: 'RETAIL',
      customer_type: customerType,
      saving_per_unit: 0,
      saving_pct: 0,
      requires_rfq: false,
      band: null,
    };
  }

  const saving = retailBase - match.unit_price;

  return {
    unit_price: match.unit_price,
    line_total: match.unit_price * quantity,
    quantity,
    tier: match.pricing_tier,
    customer_type: customerType,
    saving_per_unit: saving,
    saving_pct: retailBase === 0 ? 0 : (saving / retailBase) * 100,
    requires_rfq: match.pricing_tier === 'RFQ',
    band: match,
  };
}

/** The next rung up, for the "buy N more and save" nudge on the product page. */
export function nextBand(
  bands: CustomerPrice[],
  productId: string,
  quantity: number,
  customerType: CustomerType = 'RETAIL',
  variantId: string | null = null,
): CustomerPrice | null {
  const ladder = priceLadder(bands, productId, customerType, variantId);
  return ladder.find((band) => band.minimum_quantity > quantity) ?? null;
}

// ── §19 — minimum margin protection ──────────────────────────────────────────

/**
 * Find live prices sitting below their tier's margin floor.
 *
 * Deliberately returns alerts rather than repricing anything. A supplier raising
 * their cost should never silently move a customer-facing price; an operator
 * reviews the alert and decides.
 */
export function findMarginAlerts(
  bands: CustomerPrice[],
  offers: SupplierOffer[],
  products: Product[],
  rules: MarginRule[],
  now: Date = new Date(),
): MarginAlert[] {
  const alerts: MarginAlert[] = [];

  for (const band of bands) {
    if (!isLive(band, now)) continue;

    const product = products.find((entry) => entry.id === band.product_id);
    if (!product) continue;

    const rule = rules.find(
      (entry) =>
        entry.category_id === product.category_id &&
        entry.pricing_tier === band.pricing_tier &&
        entry.customer_type === band.customer_type &&
        entry.active,
    );
    if (!rule) continue;

    // Worst case is the most expensive supplier we might actually route to.
    const productOffers = offers.filter((offer) => offer.product_id === product.id && offer.active);
    if (productOffers.length === 0) continue;

    const worstCost = Math.max(...productOffers.map((offer) => offer.supplier_cost));
    const breakdown = marginBreakdown(
      band.unit_price,
      worstCost,
      rule.logistics_cost,
      rule.gateway_rate,
    );

    if (breakdown.gross_margin_pct < rule.minimum_margin_pct) {
      alerts.push({
        product_id: product.id,
        product_name: product.name,
        customer_price_id: band.id,
        pricing_tier: band.pricing_tier,
        unit_price: band.unit_price,
        supplier_cost: worstCost,
        actual_margin_pct: breakdown.gross_margin_pct,
        minimum_margin_pct: rule.minimum_margin_pct,
        shortfall_pct: rule.minimum_margin_pct - breakdown.gross_margin_pct,
      });
    }
  }

  return alerts.sort((a, b) => b.shortfall_pct - a.shortfall_pct);
}

// ── Display helpers ──────────────────────────────────────────────────────────

export const TIER_LABELS: Record<PricingTier, string> = {
  RETAIL: 'Retail',
  BULK: 'Bulk',
  WHOLESALE: 'Wholesale',
  NEGOTIATED: 'Negotiated',
  PROMOTIONAL: 'Promotional',
  RFQ: 'By quotation',
};

export const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
  RETAIL: 'Retail customer',
  BUSINESS: 'Business',
  RESELLER: 'Reseller',
  INSTITUTIONAL: 'Institutional',
  GUEST: 'Guest',
};

/** `1–4`, `5–19`, `100+` */
export function bandRange(band: CustomerPrice): string {
  if (band.maximum_quantity === null) return `${band.minimum_quantity}+`;
  if (band.minimum_quantity === band.maximum_quantity) return String(band.minimum_quantity);
  return `${band.minimum_quantity}–${band.maximum_quantity}`;
}
