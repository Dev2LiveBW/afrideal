import { bigserial, jsonb, pgSchema, text, timestamp } from 'drizzle-orm/pg-core';

/**
 * The Postgres store's shape: one document table per collection.
 *
 * Each row is `{ id, data }` where `data` is the same object the JSON file
 * held, so `Schema[C]` in lib/db.ts and every caller stay untouched. `seq`
 * preserves insertion order, which the JSON files gave for free and some
 * lists rely on. Hot fields (an order's status, a payable's supplier) can be
 * promoted to indexed generated columns later without changing a caller.
 *
 * Everything lives in its own `afrideal` schema rather than `public`, because
 * the Neon database this started on is shared with another project whose
 * tables (`users`, `notifications`) collide with collection names here.
 *
 * drizzle-kit reads this file directly, so it must not import `server-only`
 * or anything path-aliased.
 */

export const afrideal = pgSchema('afrideal');

function docTable(name: string) {
  return afrideal.table(name, {
    id: text('id').primaryKey(),
    seq: bigserial('seq', { mode: 'number' }).notNull(),
    data: jsonb('data').$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  });
}

export type DocTable = ReturnType<typeof docTable>;

// One export per table so drizzle-kit can see them all. Names are the
// collection names with `-` → `_`.
export const auditLog = docTable('audit_log');
export const brands = docTable('brands');
export const categories = docTable('categories');
export const customerPrices = docTable('customer_prices');
export const disputes = docTable('disputes');
export const inventory = docTable('inventory');
export const marginRules = docTable('margin_rules');
export const notifications = docTable('notifications');
export const orderItems = docTable('order_items');
export const orders = docTable('orders');
export const pricingRules = docTable('pricing_rules');
export const productImages = docTable('product_images');
export const products = docTable('products');
export const rfqResponses = docTable('rfq_responses');
export const rfqs = docTable('rfqs');
export const runnerRequests = docTable('runner_requests');
export const runners = docTable('runners');
export const settlements = docTable('settlements');
export const shipments = docTable('shipments');
export const supplierOffers = docTable('supplier_offers');
export const supplierOrders = docTable('supplier_orders');
export const supplierPayables = docTable('supplier_payables');
export const supplierUsers = docTable('supplier_users');
export const suppliers = docTable('suppliers');
export const users = docTable('users');

/** Collection name → table. lib/db.ts checks this covers every `Collection`. */
export const tables = {
  'audit-log': auditLog,
  brands,
  categories,
  'customer-prices': customerPrices,
  disputes,
  inventory,
  'margin-rules': marginRules,
  notifications,
  'order-items': orderItems,
  orders,
  'pricing-rules': pricingRules,
  'product-images': productImages,
  products,
  'rfq-responses': rfqResponses,
  rfqs,
  'runner-requests': runnerRequests,
  runners,
  settlements,
  shipments,
  'supplier-offers': supplierOffers,
  'supplier-orders': supplierOrders,
  'supplier-payables': supplierPayables,
  'supplier-users': supplierUsers,
  suppliers,
  users,
} as const;

export type PostgresCollection = keyof typeof tables;
