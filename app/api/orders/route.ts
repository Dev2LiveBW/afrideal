import { z } from 'zod';

import { fail, guard, handled, ok } from '@/lib/api';
import { insert, insertMany, nextId, nextIds, readAll } from '@/lib/db';
import { EVENTS, audit, notify } from '@/lib/notifications';
import { resolvePrice } from '@/lib/pricing-tiers';
import { selectSupplier } from '@/lib/supplier-selection';
import { startPayment } from '@/lib/payments/adapters';
import { allAsDisplayed } from '@/lib/payments/status';
import { checkoutIsPaused } from '@/lib/settings';
import { paymentExpiresAt } from '@/lib/payments/policy';
import type { Order, OrderItem, OrderTimelineEntry, Payment } from '@/types';

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
  payment_method: z.enum(['DPO_PAY', 'ORANGE_MONEY', 'PAYGATE', 'EFT']),
  delivery_address: z.string().min(4, 'Enter a delivery address.'),
  delivery_city: z.string().min(2, 'Enter a city.'),
});

// ── GET /api/orders ──────────────────────────────────────────────────────────

export const GET = handled(async (request: Request) => {
  const { actor, response } = await guard();
  if (response) return response;

  // Spec 0003, AC-5: the list agrees with the detail screens about what is still
  // payable, so a closed window shows as cancelled here too.
  const [storedOrders, payments] = await Promise.all([readAll('orders'), readAll('payments')]);
  const orders = allAsDisplayed(storedOrders, payments);
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

// ── POST /api/orders - checkout, with the split engine ───────────────────────

/**
 * Placing an order does five things atomically enough for a demo:
 *
 *   1. resolves each cart line to a product and variant, at the server's price
 *   2. routes each line to a supplier using the composite score
 *   3. writes ONE customer-facing Order
 *   4. writes ONE SupplierOrder per distinct supplier
 *   5. raises ONE supplier invoice per supplier order, all PENDING
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

  // Spec 0003, AC-8: checked before any pricing or supplier work, so a pause stops
  // an order at the door rather than part way through building one.
  if (await checkoutIsPaused()) {
    return fail('Checkout is temporarily unavailable. Please try again shortly.', 409);
  }

  const [products, offers, suppliers, bands] = await Promise.all([
    readAll('products'),
    readAll('supplier-offers'),
    readAll('suppliers'),
    readAll('customer-prices'),
  ]);

  const orderId = await nextId('orders', 'o');
  const now = new Date().toISOString();

  // 1 + 2 - resolve and route every line.
  const itemIds = await nextIds('order-items', 'oi', lines.length);
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
     * §14 - price the line from the buyer's own tier ladder, at the server, for
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
      id: itemIds[items.length],
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

  // Spec 0003: an order is placed and nothing more. The PAID entry is written by
  // confirmPayment(), the only thing that knows money actually moved.
  const timeline: OrderTimelineEntry[] = [
    { status: 'AWAITING_PAYMENT', label: 'Order placed, waiting for payment', at: now },
  ];

  // 3 - the customer-facing order. The reference follows the id (the seed
  // numbers o001 as AFD-24810), so it is unique for the same reason the id is;
  // a row count would repeat under concurrent checkouts.
  const order: Order = {
    id: orderId,
    reference: `AFD-${24809 + Number.parseInt(orderId.slice(1), 10)}`,
    customer_id: actor.id,
    customer_name: actor.name,
    status: 'AWAITING_PAYMENT',
    subtotal,
    delivery_fee: DELIVERY_FEE,
    total: subtotal + DELIVERY_FEE,
    payment_method,
    // Null until a payment confirms. It used to be invented from the clock here,
    // which is what made every order look paid the moment it was placed.
    payment_reference: null,
    payment_expires_at: paymentExpiresAt(now, payment_method),
    cancel_reason: null,
    delivery_address,
    delivery_city,
    placed_at: now,
    updated_at: now,
    timeline,
    internal_notes: '',
  };

  await insert('orders', order);
  await insertMany('order-items', items);

  // Spec 0003: no supplier order and no payable exists yet. The supplier is
  // asked to prepare goods by confirmPayment(), once money has actually arrived.
  // Opening the attempt here gives a callback something to match on later.
  const started = await startPayment(order);
  const [paymentId] = await nextIds('payments', 'pmt', 1);

  const payment: Payment = {
    id: paymentId,
    order_id: orderId,
    provider: started.provider,
    provider_reference: started.providerReference,
    status: 'STARTED',
    amount: order.total,
    amount_matches: false,
    created_at: now,
    confirmed_at: null,
    failure_reason: null,
    note: null,
  };

  await insert('payments', payment);

  await notify({
    userId: actor.id,
    title: 'Order placed, waiting for payment',
    body: `${order.reference} is held for you. We start sourcing as soon as payment is confirmed.`,
    kind: 'ORDER',
  });

  await audit({
    actorId: actor.id,
    actorName: actor.name,
    action: EVENTS.ORDER_CREATED,
    entity: 'order',
    entityId: orderId,
    detail: `${order.reference} placed - ${items.length} line(s), awaiting payment by ${payment.provider}.`,
  });

  // Spec 0003: `supplier_orders` and `payables` are gone from this response
  // because they do not exist yet. They appear once payment confirms, on the
  // order detail. One `payment` object is what checkout branches on.
  return ok(
    {
      order,
      items,
      payment: {
        id: payment.id,
        provider: payment.provider,
        // The buyer needs this for a bank transfer: it is what they quote so we
        // can match their money to this order.
        reference: payment.provider_reference,
        redirect_url: started.redirectUrl,
        instructions: started.instructions,
      },
      events: [EVENTS.ORDER_CREATED],
    },
    { status: 201 },
  );
});
