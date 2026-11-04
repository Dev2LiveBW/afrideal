import { z } from 'zod';

import { fail, guard, handled, ok } from '@/lib/api';
import { PHONE_PATTERN, addAddress, type AddressFields, type AddressResult } from '@/lib/addresses';
import { insert, insertMany, mutate, nextId, nextIds, readAll } from '@/lib/db';
import { EVENTS, audit, notify } from '@/lib/notifications';
import { offerLandedCost, priceLine, sellerQuantities } from '@/lib/pricing-tiers';
import { routeLine } from '@/lib/supplier-selection';
import { availablePaymentMethods, startPayment } from '@/lib/payments/adapters';
import { orderForSupplier } from '@/lib/order-privacy';
import { allAsDisplayed } from '@/lib/payments/status';
import { findCollectionPoint } from '@/lib/collection-points';
import { activeCountries } from '@/lib/countries';
import { fromPula, pulaPerUnit } from '@/lib/currency.mjs';
import { DEFAULT_DELIVERY_COUNTRY, isCrossBorder } from '@/lib/lanes.mjs';
import { checkoutIsPaused } from '@/lib/settings';
import { paymentExpiresAt } from '@/lib/payments/policy';
import { TERMS_VERSION } from '@/lib/terms';
import type { Order, OrderItem, OrderTimelineEntry, Payment } from '@/types';

export const dynamic = 'force-dynamic';

const DOORSTEP_DELIVERY_FEE = 45;

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
  payment_method: z.enum(['CARD', 'ORANGE_MONEY', 'PAYGATE', 'EFT']),
  delivery_method: z.enum(['DOORSTEP', 'COLLECTION_POINT']).optional().default('DOORSTEP'),
  collection_point: z.string().nullish(),
  delivery_address: z.string().min(4, 'Enter a delivery address.'),
  delivery_city: z.string().min(2, 'Enter a city.'),
  /** Spec 0009: where the order is going. Botswana until "Deliver to" sends one. */
  delivery_country: z.string().trim().toUpperCase().length(2).optional(),
  /** Spec 0011, AC-8: without this there is no order. */
  terms_accepted: z.boolean().optional(),
  recipient_name: z.string().trim().max(120).nullish(),
  delivery_phone: z.string().trim().max(30).nullish(),
  delivery_instructions: z.string().trim().max(300, 'Keep delivery instructions under 300 characters.').nullish(),
  /** Spec 0011, AC-4: keep this typed address in the buyer's book. */
  save_address: z.boolean().optional(),
  address_label: z.string().trim().max(40).nullish(),
});

/**
 * Keep a typed address in the buyer's book. The order is already placed, so a
 * failure here must never reach the buyer as a failed order: anything that
 * stops the save becomes a notice instead.
 */
async function saveOrderAddress(userId: string, fields: AddressFields, now: string) {
  let refused: 'FULL' | 'DUPLICATE' | null = null;
  try {
    const [id] = await nextIds('addresses', 'adr', 1);
    const result = await mutate<'addresses', AddressResult>('addresses', (rows) =>
      addAddress(rows, { id, userId, fields, now, refuseDuplicates: true }),
    );
    if (result.ok) return;
    if (result.reason !== 'NOT_FOUND') refused = result.reason;
  } catch (error) {
    console.error('[orders] saving the address failed', error);
  }

  await notify({
    userId,
    title: 'Address not saved',
    body:
      refused === 'FULL'
        ? 'Your address book is full, so this address was not saved. Your order is not affected.'
        : refused === 'DUPLICATE'
          ? 'This address is already in your address book. Your order is not affected.'
          : 'We could not save this address just now. Your order is not affected.',
    kind: 'ORDER',
  });
}

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
    visible = orders.filter((order) => mine.has(order.id)).map(orderForSupplier);
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

  const {
    lines,
    payment_method,
    delivery_method,
    collection_point,
    delivery_address,
    delivery_city,
    delivery_country,
    terms_accepted,
    recipient_name,
    delivery_phone,
    delivery_instructions,
    save_address,
    address_label,
  } = parsed.data;

  // Spec 0003, AC-8: checked before any pricing or supplier work, so a pause stops
  // an order at the door rather than part way through building one.
  if (await checkoutIsPaused()) {
    return fail('Checkout is temporarily unavailable. Please try again shortly.', 409);
  }

  // Spec 0011, AC-8: the buyer agrees before anything is priced or held.
  if (terms_accepted !== true) {
    return fail('Please agree to the terms to place your order.', 422);
  }

  // Spec 0011, AC-4: a driver needs a number; a locker pickup does not.
  if (delivery_phone ? !PHONE_PATTERN.test(delivery_phone) : delivery_method === 'DOORSTEP') {
    return fail('Enter a phone number we can reach for this delivery.', 422);
  }

  // A collection point order must name a locker on the list; its fee is charged
  // from that list, so an unknown name cannot pick its own price.
  if (delivery_method === 'COLLECTION_POINT' && !findCollectionPoint(collection_point)) {
    return fail('Choose one of the collection points listed at checkout.', 422);
  }

  // Spec 0009: the lane runs to the locker's country when one is chosen, else to
  // the buyer's. Customs and courier clearance key off it, never off Botswana.
  const locker = delivery_method === 'COLLECTION_POINT' ? findCollectionPoint(collection_point) : null;
  const deliveryCountry = locker?.country ?? delivery_country ?? DEFAULT_DELIVERY_COUNTRY;
  const country = (await activeCountries()).find((entry) => entry.code === deliveryCountry);
  if (!country) {
    return fail('We do not deliver to that country yet.', 422);
  }
  // Spec 0009, answers 1 and 2: the buyer pays in their country's currency,
  // with one of the methods offered there.
  const currency = country.buyer_currency;
  const offered = country.payment_methods.map((entry) => entry.method).filter(Boolean);
  if (!offered.includes(payment_method)) {
    return fail(`That payment method is not offered in ${country.name} yet.`, 422);
  }

  // A method nothing can take money through would leave the order waiting for a
  // payment that cannot arrive. Checkout only offers the available ones; this is
  // the guard for anything that posts here directly.
  if (!availablePaymentMethods().includes(payment_method)) {
    return fail('That payment method is not available yet. Please pay by bank transfer.', 422);
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
  const tierQuantityOf = sellerQuantities(lines, products);

  for (const line of lines) {
    const product = products.find((candidate) => candidate.id === line.product_id);
    if (!product) return fail(`Product ${line.product_id} is no longer available.`, 422);

    const variant = product.variants.find((candidate) => candidate.id === line.variant_id);
    if (!variant) return fail(`That option is no longer available for ${product.name}.`, 422);

    const minOrderQty = product.owner_type === 'SUPPLIER' ? Math.max(1, product.moq ?? 1) : 1;
    if (line.qty < minOrderQty) {
      return fail(
        `${product.name} requires a minimum order of ${minOrderQty} units.`,
        422,
      );
    }

    const route = routeLine(product, offers, suppliers, line.qty);

    if (!route) return fail(`No verified supplier can currently fulfil ${product.name}.`, 409);

    /**
     * §14 - price the line from the buyer's own tier ladder, at the server.
     * Supplier-owned products use the supplier's set price directly; AfriDeal
     * products use the ladder, on the rung chosen by every unit in this order
     * from the same seller and category (spec 0007, AC-5). `priceLine()` is the
     * function the cart and checkout show, so the charge matches the summary.
     */
    const productBands = bands.filter((band) => band.product_id === product.id);
    const priced = priceLine(
      productBands,
      product,
      variant.id,
      line.qty,
      actor.customerType,
      tierQuantityOf(product.id),
    );

    if (priced.resolved.requires_rfq) {
      return fail(
        `${product.name} at ${line.qty} units is priced by quotation. Submit a quotation request rather than ordering directly.`,
        409,
      );
    }

    // Spec 0007, AC-7: what this unit cost us, fixed now so a later rate or
    // cost change never rewrites a placed order or its payable.
    // Spec 0009, AC-3: customs when the routed supplier's goods cross a border.
    const landed = offerLandedCost(
      route.offer,
      variant.id,
      isCrossBorder(route.supplier.country, deliveryCountry),
    );
    const supplierCost =
      route.offer.variant_costs?.find((entry) => entry.variant_id === variant.id)?.cost ??
      route.offer.supplier_cost;

    items.push({
      id: itemIds[items.length],
      order_id: orderId,
      product_id: product.id,
      variant_id: variant.id,
      product_name: product.name,
      variant_label: variant.label,
      emoji: product.emoji,
      qty: line.qty,
      // Priced in pula, charged in the buyer's currency (spec 0009).
      unit_price: fromPula(priced.unit_price, currency),
      line_total: fromPula(priced.line_total, currency),
      supplier_id: route.supplier.id,
      supplier_cost: supplierCost,
      supplier_cost_currency: route.offer.cost_currency ?? 'BWP',
      fx_rate: supplierCost === 0 ? 1 : landed.cost / supplierCost,
      customs_amount: landed.customs,
    });
  }

  const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);

  // Spec 0003: an order is placed and nothing more. The PAID entry is written by
  // confirmPayment(), the only thing that knows money actually moved.
  const timeline: OrderTimelineEntry[] = [
    { status: 'AWAITING_PAYMENT', label: 'Order placed, waiting for payment', at: now },
  ];

  // The locker, its fee, address and town come from the one shared list, never
  // from the request: checkout shows the same fee it reads from there.
  const isCollectionPoint = delivery_method === 'COLLECTION_POINT';
  const point = isCollectionPoint ? findCollectionPoint(collection_point) : null;
  const delivery_fee = fromPula(point ? point.fee : DOORSTEP_DELIVERY_FEE, currency);
  const resolvedAddress = point ? point.name : delivery_address;

  // 3 - the customer-facing order. The reference follows the id (the seed
  // numbers o001 as AFD-24810), so it is unique for the same reason the id is;
  // a row count would repeat under concurrent checkouts.
  const order: Order = {
    id: orderId,
    reference: `AFD-${24809 + Number.parseInt(orderId.slice(1), 10)}`,
    customer_id: actor.id,
    customer_name: actor.name,
    status: 'AWAITING_PAYMENT',
    currency,
    buyer_fx_rate: pulaPerUnit(currency),
    subtotal,
    delivery_fee,
    total: subtotal + delivery_fee,
    payment_method,
    recipient_name: recipient_name || actor.name,
    delivery_phone: delivery_phone || null,
    delivery_instructions: delivery_instructions || null,
    terms_accepted_at: now,
    terms_version: TERMS_VERSION,
    // Null until a payment confirms. It used to be invented from the clock here,
    // which is what made every order look paid the moment it was placed.
    payment_reference: null,
    payment_expires_at: paymentExpiresAt(now, payment_method),
    cancel_reason: null,
    delivery_address: resolvedAddress,
    delivery_city: point ? point.city : delivery_city,
    delivery_country: deliveryCountry,
    delivery_method,
    collection_point: point ? point.name : null,
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

  if (save_address && delivery_method === 'DOORSTEP' && delivery_phone) {
    await saveOrderAddress(
      actor.id,
      {
        label: address_label || order.delivery_city,
        recipient_name: order.recipient_name ?? actor.name,
        phone: delivery_phone,
        country: deliveryCountry,
        town: order.delivery_city,
        street: delivery_address,
      },
      now,
    );
  }

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
