// ═════════════════════════════════════════════════════════════════════════════
// Procurement model (revised spec §3–§27).
//
// Added alongside the retail model rather than replacing it, so this is the
// shape to build against going forward:
//
//   PRODUCT  ≠  SUPPLIER  ≠  SUPPLIER_OFFER  ≠  CUSTOMER_PRICE
//
// A Product carries no cost, no stock and no supplier. A SupplierOffer carries
// what a supplier will supply and at what confidential cost. A CustomerPrice
// carries what a buyer of a given type pays at a given quantity. Four different
// questions, four different tables.
// ═════════════════════════════════════════════════════════════════════════════

/** §7 — drives which pricing tiers a buyer can reach. */
export type CustomerType = 'RETAIL' | 'BUSINESS' | 'RESELLER' | 'INSTITUTIONAL' | 'GUEST';

/** §14 — the tier a price band belongs to. */
export type PricingTier =
  | 'RETAIL'
  | 'BULK'
  | 'WHOLESALE'
  | 'NEGOTIATED'
  | 'PROMOTIONAL'
  | 'RFQ';

/** §11 — what kind of business the supplier is. */
export type SupplierType =
  | 'MANUFACTURER'
  | 'WHOLESALER'
  | 'DISTRIBUTOR'
  | 'RETAILER'
  | 'IMPORTER'
  | 'BRAND'
  | 'AGENT';

/** §12 — a supplier company may have several users, each scoped to that supplier. */
export type SupplierUserRole =
  | 'SUPPLIER_OWNER'
  | 'SUPPLIER_ADMIN'
  | 'SUPPLIER_SALES'
  | 'SUPPLIER_FULFILMENT'
  | 'SUPPLIER_FINANCE';

export interface SupplierUser {
  id: string;
  supplier_id: string;
  user_id: string;
  role: SupplierUserRole;
  status: 'ACTIVE' | 'SUSPENDED';
}

/**
 * §17 — how AfriDeal takes its cut.
 *
 * PERCENTAGE_MARKUP and PERCENTAGE_MARGIN are different arithmetic on the same
 * number, and the difference is not cosmetic: 30% markup on a BWP 250 cost is
 * BWP 325, while a 30% margin on the same cost is BWP 357.14. See §18.
 */
export type MarginType =
  | 'PERCENTAGE_MARKUP'
  | 'PERCENTAGE_MARGIN'
  | 'FIXED_MARGIN'
  | 'FIXED_FEE'
  | 'HYBRID'
  | 'COMMISSION';

/** §6 — who sets the customer-facing price. */
export type CommercialModel = 'AFRIDEAL_MANAGED' | 'SUPPLIER_LED';

/** §8/§26 — brands exist so product matching has something to match on. */
export interface Brand {
  id: string;
  name: string;
  slug: string;
}

/** §10 — one image library per product, shared by every supplier offering it. */
export interface ProductImage {
  id: string;
  product_id: string;
  variant_id: string | null;
  image_url: string;
  image_type: 'PRIMARY' | 'GALLERY' | 'SPEC' | 'PACKAGING';
  sort_order: number;
  source: 'AFRIDEAL' | 'SUPPLIER' | 'BRAND';
  permission_status: 'CLEARED' | 'PENDING' | 'RESTRICTED';
  created_at: string;
}

/**
 * §14 — what a customer actually pays.
 *
 * Bands resolve on (customer_type, quantity). A row with a null
 * `supplier_offer_id` is a platform-wide price under Model A; a row naming an
 * offer is priced against that specific supplier, which is what lets §6 Model B
 * and §32 customer-selectable suppliers land later without a redesign.
 */
export interface CustomerPrice {
  id: string;
  product_id: string;
  variant_id: string | null;
  supplier_offer_id: string | null;
  customer_type: CustomerType;
  pricing_tier: PricingTier;
  minimum_quantity: number;
  /** null means no upper bound — the top band. */
  maximum_quantity: number | null;
  unit_price: number;
  currency: 'BWP';
  pricing_method: MarginType;
  effective_from: string;
  effective_to: string | null;
  status: 'ACTIVE' | 'SCHEDULED' | 'EXPIRED';
}

/** §21 — a buyer asking for a price on a quantity nobody has listed. */
export type RfqStatus = 'SUBMITTED' | 'SOURCING' | 'QUOTED' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';

export interface Rfq {
  id: string;
  reference: string;
  customer_id: string;
  customer_name: string;
  customer_type: CustomerType;
  product_id: string;
  product_name: string;
  variant_id: string | null;
  requested_quantity: number;
  target_price: number | null;
  delivery_location: string;
  required_delivery_date: string | null;
  notes: string;
  status: RfqStatus;
  created_at: string;
  updated_at: string;
}

export type RfqResponseStatus = 'PENDING' | 'SUBMITTED' | 'SELECTED' | 'REJECTED' | 'EXPIRED';

export interface RfqResponse {
  id: string;
  rfq_id: string;
  supplier_id: string;
  quantity: number;
  /** Confidential supplier-side price. Never rendered to a retail customer (§5). */
  unit_price: number;
  currency: 'BWP';
  lead_time_days: number;
  minimum_order_quantity: number;
  shipping_terms: string;
  valid_until: string;
  notes: string;
  status: RfqResponseStatus;
  created_at: string;
}

/** §19 — raised when a supplier cost rise pushes a live price under its floor. */
export interface MarginAlert {
  product_id: string;
  product_name: string;
  customer_price_id: string;
  pricing_tier: PricingTier;
  unit_price: number;
  supplier_cost: number;
  actual_margin_pct: number;
  minimum_margin_pct: number;
  shortfall_pct: number;
}

/** A resolved price band plus the arithmetic behind it. */
export interface TieredPriceResult {
  unit_price: number;
  line_total: number;
  quantity: number;
  tier: PricingTier;
  customer_type: CustomerType;
  /** Saving against the retail band at quantity 1. */
  saving_per_unit: number;
  saving_pct: number;
  /** Set when the quantity runs past every listed band and needs a quotation. */
  requires_rfq: boolean;
  band: CustomerPrice | null;
}

/** §18 — markup and margin reported separately, never conflated. */
export interface MarginBreakdown {
  supplier_cost: number;
  selling_price: number;
  logistics_cost: number;
  gateway_cost: number;
  /** selling_price − supplier_cost − logistics − gateway */
  gross_margin: number;
  /** gross_margin ÷ selling_price */
  gross_margin_pct: number;
  /** gross_margin ÷ supplier_cost */
  markup_pct: number;
}

/** §16/§17 — a configurable rule, replacing the markup-only version. */
export interface MarginRule {
  id: string;
  category_id: string;
  category_name: string;
  customer_type: CustomerType;
  pricing_tier: PricingTier;
  margin_type: MarginType;
  /** Percentage for the percentage types, Pula for the fixed ones. */
  margin_value: number;
  /** Second component of a HYBRID rule, in Pula. */
  fixed_component: number;
  logistics_cost: number;
  gateway_rate: number;
  /** §19 — the floor this tier may not fall below. */
  minimum_margin_pct: number;
  commercial_model: CommercialModel;
  active: boolean;
}
