import 'server-only';

import { readAll } from '@/lib/db';
import { rankOffers } from '@/lib/supplier-selection';
import type {
  EscrowRecord,
  Order,
  OrderItem,
  Product,
  SelectionResult,
  Supplier,
  SupplierOrder,
} from '@/types';

/**
 * Server-side read models.
 *
 * Pages call these rather than joining collections themselves, so a change to
 * how an order assembles its legs happens in one place and every screen that
 * shows an order agrees about what it says.
 */

export interface OrderDetail {
  order: Order;
  items: OrderItem[];
  legs: (SupplierOrder & { supplier: Supplier | null; items: OrderItem[]; escrow: EscrowRecord | null })[];
  escrow: EscrowRecord[];
}

export async function getOrderDetail(orderId: string): Promise<OrderDetail | null> {
  const [orders, items, legs, escrow, suppliers] = await Promise.all([
    readAll('orders'),
    readAll('order-items'),
    readAll('supplier-orders'),
    readAll('escrow'),
    readAll('suppliers'),
  ]);

  const order = orders.find((candidate) => candidate.id === orderId);
  if (!order) return null;

  const orderItems = items.filter((item) => item.order_id === orderId);
  const orderEscrow = escrow.filter((record) => record.order_id === orderId);

  return {
    order,
    items: orderItems,
    escrow: orderEscrow,
    legs: legs
      .filter((leg) => leg.order_id === orderId)
      .map((leg) => ({
        ...leg,
        supplier: suppliers.find((supplier) => supplier.id === leg.supplier_id) ?? null,
        items: orderItems.filter((item) => leg.item_ids.includes(item.id)),
        escrow: orderEscrow.find((record) => record.supplier_order_id === leg.id) ?? null,
      })),
  };
}

export interface ProductDetail {
  product: Product;
  categoryName: string;
  selection: SelectionResult;
  /** Every offer including unverified suppliers — admin view only. */
  allSelection: SelectionResult;
}

/**
 * A supplier offer with the confidential parts removed (§5).
 *
 * `supplier_cost` is what a supplier privately quotes AfriDeal. It must never
 * reach a storefront page: a React server component serialises whatever it
 * hands a client component into the HTML payload, so passing a raw ScoredOffer
 * to the browser publishes the cost whether or not anything renders it.
 */
export interface PublicOffer {
  offer_id: string;
  supplier_id: string;
  supplier_name: string;
  supplier_initials: string;
  city: string;
  country: 'BW' | 'ZA';
  supplier_type: string;
  rating: number;
  fulfilment_rate: number;
  reliability_score: number;
  fulfilment_days: number;
  in_stock: boolean;
  /** Coarse band rather than an exact count, which is also commercially sensitive. */
  stock_band: 'OUT_OF_STOCK' | 'LOW' | 'AVAILABLE' | 'BULK_READY';
  minimum_order_quantity: number;
  rank: number;
  label: string;
  is_primary: boolean;
}

function stockBand(stock: number): PublicOffer['stock_band'] {
  if (stock <= 0) return 'OUT_OF_STOCK';
  if (stock < 50) return 'LOW';
  if (stock < 500) return 'AVAILABLE';
  return 'BULK_READY';
}

/** Project ranked offers down to what a customer is entitled to see. */
export function toPublicOffers(scored: SelectionResult['all']): PublicOffer[] {
  return scored.map((entry) => ({
    offer_id: entry.offer.id,
    supplier_id: entry.supplier.id,
    supplier_name: entry.supplier.name,
    supplier_initials: entry.supplier.initials,
    city: entry.supplier.city,
    country: entry.supplier.country,
    supplier_type: entry.supplier.supplier_type ?? 'WHOLESALER',
    rating: entry.supplier.rating,
    fulfilment_rate: entry.supplier.fulfilment_rate,
    reliability_score: entry.supplier.reliability_score,
    fulfilment_days: entry.offer.fulfilment_days,
    in_stock: entry.offer.stock > 0,
    stock_band: stockBand(entry.offer.stock),
    minimum_order_quantity: entry.offer.moq,
    rank: entry.rank,
    label: entry.label,
    is_primary: entry.rank === 1,
  }));
}

export async function getProductDetail(productId: string): Promise<ProductDetail | null> {
  const [products, offers, suppliers, categories] = await Promise.all([
    readAll('products'),
    readAll('supplier-offers'),
    readAll('suppliers'),
    readAll('categories'),
  ]);

  const product = products.find((candidate) => candidate.id === productId);
  if (!product) return null;

  const productOffers = offers.filter((offer) => offer.product_id === productId);

  return {
    product,
    categoryName: categories.find((c) => c.id === product.category_id)?.name ?? 'Uncategorised',
    selection: rankOffers(productOffers, suppliers),
    allSelection: rankOffers(productOffers, suppliers, { includeUnverified: true }),
  };
}

/** Catalogue with the verified-supplier count each product can be routed to. */
export async function getCatalogue() {
  const [products, offers, suppliers, categories] = await Promise.all([
    readAll('products'),
    readAll('supplier-offers'),
    readAll('suppliers'),
    readAll('categories'),
  ]);

  const verified = new Set(
    suppliers.filter((supplier) => supplier.status === 'VERIFIED').map((supplier) => supplier.id),
  );

  return {
    categories,
    products: products.map((product) => ({
      ...product,
      supplierCount: offers.filter(
        (offer) => offer.product_id === product.id && offer.active && verified.has(offer.supplier_id),
      ).length,
    })),
  };
}

/** Everything one supplier is allowed to see about itself. */
export async function getSupplierWorkspace(supplierId: string) {
  const [suppliers, offers, products, legs, orders, items, escrow, settlements] = await Promise.all([
    readAll('suppliers'),
    readAll('supplier-offers'),
    readAll('products'),
    readAll('supplier-orders'),
    readAll('orders'),
    readAll('order-items'),
    readAll('escrow'),
    readAll('settlements'),
  ]);

  const supplier = suppliers.find((candidate) => candidate.id === supplierId) ?? null;
  const myOffers = offers.filter((offer) => offer.supplier_id === supplierId);
  const myProductIds = new Set(myOffers.map((offer) => offer.product_id));
  const myLegs = legs.filter((leg) => leg.supplier_id === supplierId);
  const myOrderIds = new Set(myLegs.map((leg) => leg.order_id));

  return {
    supplier,
    offers: myOffers,
    products: products.filter((product) => myProductIds.has(product.id)),
    legs: myLegs.map((leg) => ({
      ...leg,
      order: orders.find((order) => order.id === leg.order_id) ?? null,
      items: items.filter((item) => leg.item_ids.includes(item.id)),
      escrow: escrow.find((record) => record.supplier_order_id === leg.id) ?? null,
    })),
    orders: orders.filter((order) => myOrderIds.has(order.id)),
    escrow: escrow.filter((record) => record.supplier_id === supplierId),
    settlements: settlements.filter((settlement) => settlement.supplier_id === supplierId),
  };
}

/** Runner workspace — their jobs, and the open pool they can accept from. */
export async function getRunnerWorkspace(runnerId: string) {
  const [runners, shipments, orders, suppliers] = await Promise.all([
    readAll('runners'),
    readAll('shipments'),
    readAll('orders'),
    readAll('suppliers'),
  ]);

  const decorate = (shipment: (typeof shipments)[number]) => ({
    ...shipment,
    order: orders.find((order) => order.id === shipment.order_id) ?? null,
    supplier: suppliers.find((supplier) => supplier.name === shipment.pickup_name) ?? null,
  });

  return {
    runner: runners.find((candidate) => candidate.id === runnerId) ?? null,
    active: shipments
      .filter((s) => s.runner_id === runnerId && s.status !== 'DELIVERED' && s.status !== 'FAILED')
      .map(decorate),
    completed: shipments.filter((s) => s.runner_id === runnerId && s.status === 'DELIVERED').map(decorate),
    available: shipments
      .filter((s) => s.runner_id === null || s.status === 'UNASSIGNED')
      .map(decorate),
  };
}

/** Notifications for the topbar bell. */
export async function getNotifications(userId: string) {
  const notifications = await readAll('notifications');
  return notifications
    .filter((notification) => notification.user_id === userId)
    .sort((a, b) => b.at.localeCompare(a.at));
}

/** Counts the admin sidebar shows as badges. */
export async function getAdminBadges() {
  const [suppliers, disputes, escrow, legs] = await Promise.all([
    readAll('suppliers'),
    readAll('disputes'),
    readAll('escrow'),
    readAll('supplier-orders'),
  ]);

  return {
    pendingSuppliers: suppliers.filter((supplier) => supplier.status === 'PENDING').length,
    openDisputes: disputes.filter(
      (dispute) => dispute.status === 'OPEN' || dispute.status === 'UNDER_REVIEW',
    ).length,
    heldEscrow: escrow.filter((record) => record.status === 'HELD').length,
    awaitingConfirmation: legs.filter((leg) => leg.status === 'AWAITING_CONFIRMATION').length,
  };
}
