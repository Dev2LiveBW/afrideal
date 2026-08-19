import { z } from 'zod';

import { fail, guard, handled, ok } from '@/lib/api';
import { insert, insertMany, nextId, readAll } from '@/lib/db';
import { EVENTS, audit, notify } from '@/lib/notifications';
import { resolvePrice } from '@/lib/pricing-tiers';
import { selectSupplier } from '@/lib/supplier-selection';
import type {
  EscrowRecord,
  Order,
  OrderItem,
  OrderTimelineEntry,
  SupplierOrder,
} from '@/types';

export const dynamic = 'force-dynamic';

const DELIVERY_FEE = 45;

const CheckoutSchema = z.object({
  lines: z
    .array(
      z.object({
        product_id: z.string(),
        variant_id: z.string(),
        qty: z.number().int().min(1).max(999),
      }),
    )
    .min(1, 'Your cart is empty.'),
  payment_method: z.enum(['DPO_PAY', 'ORANGE_MONEY', 'PAYGATE']),
  delivery_address: z.string().min(4, 'Enter a delivery address.'),
  delivery_city: z.string().min(2, 'Enter a city.'),
});

// ── GET /api/orders ──────────────────────────────────────────────────────────

export const GET = handled(async (request: Request) => {
  const { actor, response } = await guard();
  if (response) return response;

  const orders = await readAll('orders');
  const status = new URL(request.url).searchParams.get('status');

  // Customers only ever see their own orders; suppliers see the orders they
  // have a leg on. This is enforced here, not in the page.
  let visible = orders;

  if (actor.role === 'CUSTOMER') {
    visible = orders.filter((order) => order.customer_id === actor.id);
  } else if (actor.role === 'SUPPLIER_OWNER') {
    const legs = await readAll('supplier-orders');
    const mine = new Set(
      legs.filter((leg) => leg.supplier_id === actor.supplierId).map((leg) => leg.order_id),
    );
    visible = orders.filter((order) => mine.has(order.id));
  }

  if (status) visible = visible.filter((order) => order.status === status);

  return ok(visible.sort((a, b) => b.placed_at.localeCompare(a.placed_at)));
});

// ── POST /api/orders — checkout, with the split engine ───────────────────────

/**
 * Placing an order does five things atomically enough for a demo:
 *
 *   1. resolves each cart line to a product and variant, at the server's price
 *   2. routes each line to a supplier using the composite score
 *   3. writes ONE customer-facing Order
 *   4. writes ONE SupplierOrder per distinct supplier
 *   5. writes ONE Escrow record per supplier order, all HELD
 *
 * Prices are re-read from the catalogue rather than trusted from the client,
 * so a tampered cart cannot set its own price.
 */
export const POST = handled(async (request: Request) => {
  const { actor, response } = await guard();
  if (response) return response;

  const parsed = CheckoutSchema.safeParse(await request.json());
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? 'Invalid checkout payload.', 422);
  }

  const { lines, payment_method, delivery_address, delivery_city } = parsed.data;

  const [products, offers, suppliers, bands] = await Promise.all([
    readAll('products'),
    readAll('supplier-offers'),
    readAll('suppliers'),
    readAll('customer-prices'),
  ]);

  const orderId = await nextId('orders', 'o');
  const now = new Date().toISOString();

  // 1 + 2 — resolve and route every line.
  let itemSeq = Number.parseInt((await nextId('order-items', 'oi')).slice(2), 10);
  const items: OrderItem[] = [];

  for (const line of lines) {
    const product = products.find((candidate) => candidate.id === line.product_id);
    if (!product) return fail(`Product ${line.product_id} is no longer available.`, 422);

    const variant = product.variants.find((candidate) => candidate.id === line.variant_id);
    if (!variant) return fail(`That option is no longer available for ${product.name}.`, 422);

    const route = selectSupplier(
      offers.filter((offer) => offer.product_id === product.id),
      suppliers,
      line.qty,
    );

    if (!route) return fail(`No verified supplier can currently fulfil ${product.name}.`, 409);

    /**
     * §14 — price the line from the buyer's own tier ladder, at the server, for
     * the quantity actually ordered. The client sends no prices at all, so a
     * tampered cart cannot set its own, and a buyer who qualifies for wholesale
     * gets it whether or not the page they came from showed it.
     */
    const productBands = bands.filter((band) => band.product_id === product.id);
    const tiered = resolvePrice(productBands, product, line.qty, actor.customerType);

    if (tiered.requires_rfq) {
      return fail(
        `${product.name} at ${line.qty} units is priced by quotation. Submit a quotation request rather than ordering directly.`,
        409,
      );
    }

    // Variants carry an uplift over the product base; apply it as a ratio so a
    // case is correctly dearer than a single unit at every rung of the ladder.
    const variantRatio = product.price === 0 ? 1 : variant.price / product.price;
    const unitPrice = Math.ceil(tiered.unit_price * variantRatio);

    items.push({
      id: `oi${String(itemSeq++).padStart(3, '0')}`,
      order_id: orderId,
      product_id: product.id,
      variant_id: variant.id,
      product_name: product.name,
      variant_label: variant.label,
      emoji: product.emoji,
      qty: line.qty,
      unit_price: unitPrice,
      line_total: unitPrice * line.qty,
      supplier_id: route.supplier.id,
      supplier_cost: route.offer.supplier_cost,
    });
  }

  const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);

  const timeline: OrderTimelineEntry[] = [
    { status: 'PENDING', label: 'Order placed', at: now },
    { status: 'PAID', label: 'Payment confirmed — funds held in escrow', at: now },
  ];

  // 3 — the customer-facing order.
  const orderCount = (await readAll('orders')).length;
  const order: Order = {
    id: orderId,
    reference: `AFD-${24810 + orderCount}`,
    customer_id: actor.id,
    customer_name: actor.name,
    status: 'PROCESSING',
    subtotal,
    delivery_fee: DELIVERY_FEE,
    total: subtotal + DELIVERY_FEE,
    payment_method,
    payment_reference: `${payment_method.split('_')[0]}-${Date.now().toString().slice(-6)}`,
    delivery_address,
    delivery_city,
    placed_at: now,
    updated_at: now,
    timeline,
    internal_notes: '',
  };

  await insert('orders', order);
  await insertMany('order-items', items);

  // 4 + 5 — one supplier order and one escrow record per supplier.
  const bySupplier = new Map<string, OrderItem[]>();
  for (const item of items) {
    bySupplier.set(item.supplier_id, [...(bySupplier.get(item.supplier_id) ?? []), item]);
  }

  let supSeq = Number.parseInt((await nextId('supplier-orders', 'sup')).slice(3), 10);
  let escrowSeq = Number.parseInt((await nextId('escrow', 'e')).slice(1), 10);

  const supplierOrders: SupplierOrder[] = [];
  const escrowRecords: EscrowRecord[] = [];

  for (const [supplierId, supplierItems] of bySupplier) {
    const supplierOrderId = `sup${String(supSeq++).padStart(3, '0')}`;
    const gross = supplierItems.reduce((sum, item) => sum + item.line_total, 0);
    const cost = supplierItems.reduce((sum, item) => sum + item.supplier_cost * item.qty, 0);

    const route = selectSupplier(
      offers.filter((offer) => offer.product_id === supplierItems[0].product_id),
      suppliers,
      supplierItems[0].qty,
    );

    supplierOrders.push({
      id: supplierOrderId,
      order_id: orderId,
      supplier_id: supplierId,
      status: 'AWAITING_CONFIRMATION',
      item_ids: supplierItems.map((item) => item.id),
      supplier_subtotal: cost,
      platform_margin: gross - cost,
      selection_reason: route?.reason ?? 'Routed on composite supplier score.',
      auto_selected: true,
      created_at: now,
    });

    escrowRecords.push({
      id: `e${String(escrowSeq++).padStart(3, '0')}`,
      order_id: orderId,
      supplier_order_id: supplierOrderId,
      supplier_id: supplierId,
      amount: gross,
      status: 'HELD',
      gateway: payment_method,
      held_at: now,
      released_at: null,
      refunded_at: null,
      hold_window_days: 7,
      history: [
        { from: null, to: 'HELD', at: now, actor: 'System', note: 'Payment confirmed — funds held.' },
      ],
    });
  }

  await insertMany('supplier-orders', supplierOrders);
  await insertMany('escrow', escrowRecords);

  // Events. Suppliers get told they have something to confirm.
  const users = await readAll('users');
  for (const supplierOrder of supplierOrders) {
    const owner = users.find((user) => user.supplier_id === supplierOrder.supplier_id);
    if (owner) {
      await notify({
        userId: owner.id,
        title: 'New order to confirm',
        body: `${order.reference} needs confirmation within 24 hours.`,
        kind: 'ORDER',
      });
    }
  }

  await notify({
    userId: actor.id,
    title: 'Order placed',
    body: `${order.reference} is confirmed. Your payment is held in escrow until you confirm delivery.`,
    kind: 'ORDER',
  });

  await audit({
    actorId: actor.id,
    actorName: actor.name,
    action: EVENTS.ORDER_CREATED,
    entity: 'order',
    entityId: orderId,
    detail: `${order.reference} placed — ${items.length} line(s) split across ${supplierOrders.length} supplier(s).`,
  });

  return ok(
    {
      order,
      items,
      supplier_orders: supplierOrders,
      escrow: escrowRecords,
      events: [EVENTS.ORDER_CREATED, EVENTS.PAYMENT_CONFIRMED, EVENTS.SUPPLIER_ORDER_CREATED],
    },
    { status: 201 },
  );
});
