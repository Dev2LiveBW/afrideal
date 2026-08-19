// ─────────────────────────────────────────────────────────────────────────────
// AfriDeal domain model. Every /data/*.json file has a matching interface here.
//
// The procurement entities from the revised spec (customer pricing tiers, RFQs,
// margin rules, supplier users, brands, images) live in ./procurement and are
// re-exported here, so `@/types` stays the single import for the whole model.
// ─────────────────────────────────────────────────────────────────────────────

export * from './procurement';

// `export *` re-exports for consumers but does not bind the names locally, so
// the interfaces below import what they reference explicitly.
import type { CommercialModel, CustomerType, SupplierType } from './procurement';

export type Role =
  | 'SUPER_ADMIN'
  | 'OPERATIONS_ADMIN'
  | 'FINANCE_ADMIN'
  | 'SUPPLIER_OWNER'
  | 'RUNNER'
  | 'CUSTOMER';

export type UserStatus = 'ACTIVE' | 'SUSPENDED';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  avatar: string;
  status: UserStatus;
  supplier_id?: string;
  runner_id?: string;
  /** §7 — set on buyers. Decides which pricing tiers they can be quoted. */
  customer_type?: CustomerType;
}

/** Safe shape — never leaves the server with the password attached. */
export type PublicUser = Omit<User, 'password'>;

// ── Catalogue ────────────────────────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  slug: string;
  emoji: string;
  blurb: string;
}

export interface ProductVariant {
  id: string;
  label: string;
  sku: string;
  /** Pula, inclusive. Overrides the product price when selected. */
  price: number;
}

export type ProductStatus = 'ACTIVE' | 'DRAFT' | 'PENDING_APPROVAL' | 'ARCHIVED';

export interface Product {
  id: string;
  name: string;
  slug: string;
  category_id: string;
  emoji: string;
  /** Hex pair used as the image stand-in gradient. */
  swatch: [string, string];
  short_description: string;
  description: string;
  specs: { label: string; value: string }[];
  variants: ProductVariant[];
  /** What AfriDeal charges the customer. Always above every supplier cost. */
  price: number;
  status: ProductStatus;
  rating: number;
  review_count: number;
  featured: boolean;
  created_at: string;

  // ── Procurement additions ──────────────────────────────────────────────
  brand_id?: string | null;
  product_type?: string;
  country_of_origin?: string;
  /** Set only while a PROMOTIONAL band is live. The strikethrough figure. */
  compare_at_price?: number;
  promotion?: {
    discount_pct: number;
    ends_at: string;
    stock_allocated: number;
    stock_sold: number;
  };
}

export type SupplierStatus = 'VERIFIED' | 'PENDING' | 'SUSPENDED' | 'REJECTED';

export interface VerificationDoc {
  id: string;
  label: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  uploaded_at: string | null;
  note?: string;
}

export interface Supplier {
  id: string;
  name: string;
  legal_name: string;
  initials: string;
  country: 'BW' | 'ZA';
  city: string;
  status: SupplierStatus;
  contact_email: string;
  contact_phone: string;
  registration_no: string;
  joined_at: string;
  /** 0–5 */
  rating: number;
  /** 0–100 */
  fulfilment_rate: number;
  /** 0–100 composite used by the selection engine. */
  reliability_score: number;
  avg_fulfilment_days: number;
  total_gmv: number;
  products_count: number;
  orders_count: number;
  verification_docs: VerificationDoc[];
  categories: string[];
  /** §11 — manufacturer, wholesaler, distributor and so on. */
  supplier_type?: SupplierType;
  /** §6 — whether AfriDeal or the supplier sets the customer-facing price. */
  commercial_model?: CommercialModel;
}

export interface SupplierOffer {
  id: string;
  product_id: string;
  supplier_id: string;
  /** What the supplier charges AfriDeal, in Pula. */
  supplier_cost: number;
  stock: number;
  fulfilment_days: number;
  moq: number;
  last_updated: string;
  active: boolean;
}

export interface InventoryRecord {
  id: string;
  product_id: string;
  variant_id: string;
  supplier_id: string;
  on_hand: number;
  reserved: number;
}

// ── Orders, escrow, fulfilment ───────────────────────────────────────────────

export type OrderStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'DISPUTED'
  | 'CANCELLED';

export type PaymentMethod = 'DPO_PAY' | 'ORANGE_MONEY' | 'PAYGATE';

export interface OrderTimelineEntry {
  status: string;
  label: string;
  at: string;
  note?: string;
  actor?: string;
}

export interface Order {
  id: string;
  reference: string;
  customer_id: string;
  customer_name: string;
  status: OrderStatus;
  subtotal: number;
  delivery_fee: number;
  total: number;
  payment_method: PaymentMethod;
  payment_reference: string;
  delivery_address: string;
  delivery_city: string;
  placed_at: string;
  updated_at: string;
  timeline: OrderTimelineEntry[];
  internal_notes: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  variant_id: string;
  product_name: string;
  variant_label: string;
  emoji: string;
  qty: number;
  unit_price: number;
  line_total: number;
  supplier_id: string;
  supplier_cost: number;
}

export type SupplierOrderStatus =
  | 'AWAITING_CONFIRMATION'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY_FOR_COLLECTION'
  | 'COLLECTED'
  | 'DELIVERED'
  | 'CANCELLED';

export interface SupplierOrder {
  id: string;
  order_id: string;
  supplier_id: string;
  status: SupplierOrderStatus;
  item_ids: string[];
  supplier_subtotal: number;
  /** The platform cut on this leg. */
  platform_margin: number;
  /** Why the engine picked this supplier — surfaced in the admin UI. */
  selection_reason: string;
  auto_selected: boolean;
  created_at: string;
}

export type EscrowStatus = 'HELD' | 'RELEASED' | 'REFUNDED' | 'DISPUTED';

export interface EscrowTransition {
  from: EscrowStatus | null;
  to: EscrowStatus;
  at: string;
  actor: string;
  note: string;
}

export interface EscrowRecord {
  id: string;
  order_id: string;
  supplier_order_id: string;
  supplier_id: string;
  amount: number;
  status: EscrowStatus;
  gateway: PaymentMethod;
  held_at: string;
  released_at: string | null;
  refunded_at: string | null;
  /** Days the funds may sit before ops is nudged. */
  hold_window_days: number;
  history: EscrowTransition[];
}

export type DisputeStatus =
  | 'OPEN'
  | 'UNDER_REVIEW'
  | 'RESOLVED_CUSTOMER'
  | 'RESOLVED_SUPPLIER';

export interface Dispute {
  id: string;
  order_id: string;
  escrow_id: string;
  customer_id: string;
  customer_name: string;
  supplier_id: string;
  reason: string;
  detail: string;
  status: DisputeStatus;
  opened_at: string;
  /** ISO date the SLA clock expires. Drives the countdown colour. */
  sla_due_at: string;
  resolved_at: string | null;
  resolution_note: string | null;
}

export interface Runner {
  id: string;
  user_id: string;
  name: string;
  initials: string;
  phone: string;
  vehicle: string;
  plate: string;
  city: string;
  online: boolean;
  rating: number;
  deliveries_completed: number;
  earnings_mtd: number;
  earnings_total: number;
}

export type ShipmentStatus =
  | 'UNASSIGNED'
  | 'ASSIGNED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'FAILED';

export interface Shipment {
  id: string;
  order_id: string;
  supplier_order_id: string;
  runner_id: string | null;
  status: ShipmentStatus;
  pickup_name: string;
  pickup_address: string;
  dropoff_name: string;
  dropoff_address: string;
  distance_km: number;
  payout: number;
  created_at: string;
  delivered_at: string | null;
}

export interface Settlement {
  id: string;
  supplier_id: string;
  supplier_name: string;
  period: string;
  gross: number;
  commission: number;
  net: number;
  status: 'PAID' | 'PENDING';
  paid_at: string | null;
}

// ── Pricing ──────────────────────────────────────────────────────────────────

export interface PricingRule {
  id: string;
  category_id: string;
  category_name: string;
  markup_type: 'PERCENTAGE' | 'FIXED';
  markup_value: number;
  logistics_cost: number;
  /** Gateway fee as a fraction of supplier cost, e.g. 0.025. */
  gateway_rate: number;
  active: boolean;
}

export interface PriceResult {
  supplier_cost: number;
  markup: number;
  logistics_cost: number;
  gateway_cost: number;
  recommended_price: number;
  margin: number;
  margin_pct: number;
}

// ── Selection engine ─────────────────────────────────────────────────────────

export interface ScoreBreakdown {
  reliability: number;
  stock: number;
  speed: number;
  rating: number;
  cost: number;
}

export interface ScoredOffer {
  offer: SupplierOffer;
  supplier: Supplier;
  score: number;
  breakdown: ScoreBreakdown;
  rank: number;
  /** PRIMARY, BACKUP 1, BACKUP 2, … */
  label: string;
  reason: string;
}

export interface SelectionResult {
  primary: ScoredOffer | null;
  backups: ScoredOffer[];
  all: ScoredOffer[];
}

// ── Platform plumbing ────────────────────────────────────────────────────────

export interface AuditEntry {
  id: string;
  at: string;
  actor_id: string;
  actor_name: string;
  action: string;
  entity: string;
  entity_id: string;
  detail: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  kind: 'ORDER' | 'ESCROW' | 'SUPPLIER' | 'DISPUTE' | 'SYSTEM';
  read: boolean;
  at: string;
}

export interface CartLine {
  product_id: string;
  variant_id: string;
  name: string;
  variant_label: string;
  emoji: string;
  unit_price: number;
  qty: number;
  supplier_id: string;
  /**
   * The product's primary photograph, copied in at add-to-cart time.
   *
   * Optional because the cart is persisted to localStorage: a basket built
   * before this field existed still deserializes, and a product with no
   * photography has none to copy. Both cases fall back to the emoji tile.
   */
  image_url?: string;
}
