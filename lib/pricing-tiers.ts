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

import { DEFAULT_DELIVERY_COUNTRY, isCrossBorder } from './lanes.mjs';
import { applyMultiBuy, landedCost } from './pricing-formula.mjs';

/**
 * Tiered pricing engine.
 *
 * Replaces the assumption that a product has one price. A product has a ladder
 * of published bands, and which rung a buyer stands on depends on how many
 * units they are taking. Above the published ladder they are quoted instead.
 *
 * Nothing here is hard-coded: bands live in /data/customer-prices.json, the
 * markups that generate them live in `lib/pricing-formula.mjs`, and the margin
 * floors that constrain them live in /data/margin-rules.json.
 */

// ── Margin arithmetic ────────────────────────────────────────────────────────

/**
 * Apply a margin rule to a supplier cost and return the selling price.
 *
 * The distinction that has to be kept straight:
 *
 *   markup  → price = cost × (1 + v)          30% on 250 → 325.00
 *   margin  → price = cost ÷ (1 − v)          30% on 250 → 357.14
 *
 * Getting these the wrong way round overstates profitability on every report.
 */
export function applyMargin(supplierCost: number, type: MarginType, value: number, fixed = 0): number {
  switch (type) {
    case 'PERCENTAGE_MARKUP':
      return supplierCost * (1 + value / 100);

    case 'PERCENTAGE_MARGIN': {
      // A 100% margin is undefined - the divisor collapses to zero.
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

/**
 * The honest breakdown. Markup and margin are reported separately, and customs
 * on imported goods is a cost line of its own (spec 0007, AC-8), so a report
 * never shows margin the border already took. It is zero while the courier
 * clears the goods (CUSTOMS_RATE).
 */
export function marginBreakdown(
  sellingPrice: number,
  supplierCost: number,
  logisticsCost: number,
  gatewayRate: number,
  customsCost = 0,
): MarginBreakdown {
  // The provider charges on what the customer actually pays, not on cost.
  const gatewayCost = sellingPrice * gatewayRate;
  const grossMargin = sellingPrice - supplierCost - customsCost - logisticsCost - gatewayCost;

  return {
    supplier_cost: supplierCost,
    selling_price: sellingPrice,
    customs_cost: customsCost,
    logistics_cost: logisticsCost,
    gateway_cost: gatewayCost,
    gross_margin: grossMargin,
    gross_margin_pct: sellingPrice === 0 ? 0 : (grossMargin / sellingPrice) * 100,
    markup_pct: supplierCost === 0 ? 0 : (grossMargin / supplierCost) * 100,
  };
}

/**
 * What one unit of an offer costs AfriDeal in Pula once it is landed: the
 * supplier's price in their own currency (one per length where the offer has
 * them), converted, plus customs when the goods cross a border on their way to
 * the buyer (spec 0009: goods' country ≠ delivery country, not "≠ Botswana").
 */
export function offerLandedCost(
  offer: SupplierOffer,
  product: Product,
  variantId: string | null = null,
  /** Where the order is going; the default until "Deliver to" carries a country. */
  deliveryCountry: string = DEFAULT_DELIVERY_COUNTRY,
): { cost: number; customs: number; landed: number } {
  const perVariant = variantId
    ? offer.variant_costs?.find((entry) => entry.variant_id === variantId)?.cost
    : undefined;
  const { cost_thebe, customs_thebe, landed_thebe } = landedCost({
    cost: perVariant ?? offer.supplier_cost,
    currency: offer.cost_currency ?? 'BWP',
    imported: isCrossBorder(product.country_of_origin, deliveryCountry),
  });
  return { cost: cost_thebe / 100, customs: customs_thebe / 100, landed: landed_thebe / 100 };
}

// ── Customer type to reachable tiers ─────────────────────────────────────────

/**
 * Which tiers a buyer may be quoted.
 *
 * Every account type reaches every published rung, including a visitor with no
 * account. The published ladder is the platform's argument, and a price a buyer
 * has to register to see is not a price they can compare. What still varies by
 * account type is the quotation path above the ladder, where a business or
 * institutional buyer is answered by a person rather than by a price list.
 */
const PUBLISHED: PricingTier[] = ['RETAIL', 'BULK', 'WHOLESALE', 'WHOLESALE_PLUS'];

export const TIERS_BY_CUSTOMER_TYPE: Record<CustomerType, PricingTier[]> = {
  GUEST: [...PUBLISHED, 'PROMOTIONAL'],
  RETAIL: [...PUBLISHED, 'PROMOTIONAL', 'RFQ'],
  BUSINESS: [...PUBLISHED, 'PROMOTIONAL', 'NEGOTIATED', 'RFQ'],
  RESELLER: [...PUBLISHED, 'PROMOTIONAL', 'NEGOTIATED', 'RFQ'],
  INSTITUTIONAL: [...PUBLISHED, 'NEGOTIATED', 'RFQ'],
};

export function canReachTier(customerType: CustomerType, tier: PricingTier): boolean {
  return TIERS_BY_CUSTOMER_TYPE[customerType]?.includes(tier) ?? false;
}

// ── Band resolution ──────────────────────────────────────────────────────────

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
 *
 * A product whose options cost different amounts (a wig sold by length) has a
 * ladder per variant. Those bands win for their own variant; the product-level
 * bands (`variant_id: null`) are the ladder for every other variant, and for
 * surfaces that show a product without choosing one, where they read as the
 * "from" price.
 */
export function priceLadder(
  bands: CustomerPrice[],
  productId: string,
  customerType: CustomerType,
  variantId: string | null = null,
  now: Date = new Date(),
): CustomerPrice[] {
  const live = bands
    .filter((band) => band.product_id === productId)
    .filter((band) => band.customer_type === customerType)
    .filter((band) => canReachTier(customerType, band.pricing_tier))
    .filter((band) => isLive(band, now));

  const own = variantId ? live.filter((band) => band.variant_id === variantId) : [];
  const ladder = own.length > 0 ? own : live.filter((band) => band.variant_id === null);

  return ladder.sort((a, b) => a.minimum_quantity - b.minimum_quantity);
}

/** True when this product publishes a ladder of its own for this variant. */
export function hasVariantLadder(
  bands: CustomerPrice[],
  productId: string,
  variantId: string | null,
): boolean {
  return (
    variantId !== null &&
    bands.some((band) => band.product_id === productId && band.variant_id === variantId)
  );
}

/**
 * Resolve the price for a specific quantity.
 *
 * Falls back to the retail ladder when a buyer type has no bands of its own, so
 * a business account never sees an empty price. When the quantity runs past the
 * top published band, `requires_rfq` is set rather than silently quoting the
 * top rung - that is the "100 units and up, ask for a quotation" behaviour.
 *
 * `tierQuantity` is the count that decides the rung: every unit in the cart from
 * the same seller and category (spec 0007, AC-5), from `sellerQuantities()`. It
 * defaults to this line's own quantity. On the retail rung it also earns the
 * multi-buy discount: 2% off for 2 units, 3% for 3, 5% for 4.
 */
export function resolvePrice(
  bands: CustomerPrice[],
  product: Product,
  quantity: number,
  customerType: CustomerType = 'RETAIL',
  variantId: string | null = null,
  options: { tierQuantity?: number; now?: Date } = {},
): TieredPriceResult {
  const now = options.now ?? new Date();
  const tierQuantity = Math.max(quantity, options.tierQuantity ?? quantity);
  if (product.owner_type === 'SUPPLIER' || product.commercial_model === 'SUPPLIER_LED') {
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

  const ladder = priceLadder(bands, product.id, customerType, variantId, now);
  const fallback = customerType === 'RETAIL' ? [] : priceLadder(bands, product.id, 'RETAIL', variantId, now);
  const usable = ladder.length > 0 ? ladder : fallback;

  const retailBase =
    usable.find((band) => band.minimum_quantity <= 1)?.unit_price ?? product.price;

  const match = usable.find((band) => matchesQuantity(band, tierQuantity));

  // Past the top of the ladder: quote by RFQ rather than guessing.
  if (!match) {
    const top = usable[usable.length - 1] ?? null;
    const beyondTop =
      top !== null && top.maximum_quantity !== null && tierQuantity > top.maximum_quantity;

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

  // The multi-buy discount belongs to the standing retail rung only. A
  // promotional entry price is already a discount and does not stack.
  const unit =
    match.pricing_tier === 'RETAIL' ? applyMultiBuy(match.unit_price, tierQuantity) : match.unit_price;
  const saving = retailBase - unit;

  return {
    unit_price: unit,
    line_total: unit * quantity,
    quantity,
    tier: match.pricing_tier,
    customer_type: customerType,
    saving_per_unit: saving,
    saving_pct: retailBase === 0 ? 0 : (saving / retailBase) * 100,
    requires_rfq: match.pricing_tier === 'RFQ',
    band: match,
  };
}

/** One cart line's price, as every surface that shows or charges it must work it out. */
export interface PricedLine {
  /** What one unit of this variant costs at this quantity, in Pula. */
  unit_price: number;
  line_total: number;
  resolved: TieredPriceResult;
}

/**
 * Price one line: the product, the chosen variant, the line's quantity and the
 * quantity that decides its rung.
 *
 * The one place the variant arithmetic lives, so the product page, the cart,
 * checkout and the order route cannot quote different figures for the same
 * line. A variant with its own ladder (a wig length) is priced from it directly.
 * Otherwise the variant's uplift over the base price is applied as a ratio, so a
 * case-of-12 stays dearer than a single tub at every rung.
 */
export function priceLine(
  bands: CustomerPrice[],
  product: Product,
  variantId: string | null,
  quantity: number,
  customerType: CustomerType = 'RETAIL',
  tierQuantity: number = quantity,
): PricedLine {
  const resolved = resolvePrice(bands, product, quantity, customerType, variantId, {
    tierQuantity,
  });

  if (hasVariantLadder(bands, product.id, variantId)) {
    return { unit_price: resolved.unit_price, line_total: resolved.unit_price * quantity, resolved };
  }

  const variant = product.variants.find((entry) => entry.id === variantId);
  const ratio = product.price === 0 || !variant ? 1 : variant.price / product.price;
  const unit = Math.ceil(resolved.unit_price * ratio);
  return { unit_price: unit, line_total: unit * quantity, resolved };
}

/**
 * Who a product is bought from, for counting quantities. AfriDeal-managed
 * products are AfriDeal's; a supplier-listed product is that supplier's.
 */
function sellerOf(product: Product): string {
  return product.owner_type === 'SUPPLIER' && product.supplier_id
    ? product.supplier_id
    : 'AFRIDEAL';
}

/**
 * The quantity that decides each line's rung: every unit in the cart from the
 * same seller and the same category (spec 0007, AC-5). Three 8" and three 10"
 * wigs count as six, so both lines stand on the bulk rung. A hair serum, being
 * Beauty & Personal Care rather than Hair, does not count with them.
 *
 * Returns a lookup by product id.
 */
export function sellerQuantities(
  lines: { product_id: string; qty: number }[],
  products: Product[],
): (productId: string) => number {
  const byId = new Map(products.map((product) => [product.id, product]));
  const totals = new Map<string, number>();
  const keyFor = (product: Product) => `${sellerOf(product)}|${product.category_id}`;

  for (const line of lines) {
    const product = byId.get(line.product_id);
    if (!product) continue;
    const key = keyFor(product);
    totals.set(key, (totals.get(key) ?? 0) + line.qty);
  }

  return (productId) => {
    const product = byId.get(productId);
    return product ? (totals.get(keyFor(product)) ?? 0) : 0;
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

// ── Minimum margin protection ────────────────────────────────────────────────

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

    // Worst case is the most expensive supplier we might actually route to,
    // landed: in Pula, for this band's length, with customs if imported.
    const productOffers = offers.filter((offer) => offer.product_id === product.id && offer.active);
    if (productOffers.length === 0) continue;

    const worst = productOffers
      .map((offer) => offerLandedCost(offer, product, band.variant_id))
      .reduce((a, b) => (b.landed > a.landed ? b : a));
    const worstCost = worst.cost;
    const breakdown = marginBreakdown(
      band.unit_price,
      worst.cost,
      rule.logistics_cost,
      rule.gateway_rate,
      worst.customs,
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
  WHOLESALE_PLUS: 'Wholesale+',
  NEGOTIATED: 'Negotiated',
  PROMOTIONAL: 'Promotional',
  RFQ: 'By quotation',
};

/** What each rung means to the buyer standing on it. */
export const TIER_BLURBS: Record<PricingTier, string> = {
  RETAIL: 'Single units and small orders.',
  BULK: 'Restocking a salon, a shop or a small site.',
  WHOLESALE: 'Trade quantities for a business that resells.',
  WHOLESALE_PLUS: 'The deepest published rung, for standing volume.',
  NEGOTIATED: 'Priced under an existing supply agreement.',
  PROMOTIONAL: 'A published price running for a limited period.',
  RFQ: 'Priced on quotation against your volume and delivery point.',
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
