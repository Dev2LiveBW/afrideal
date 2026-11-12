import { z } from 'zod';

import { fail, guard, handled, ok } from '@/lib/api';
import { throttle } from '@/lib/rate-limit';
import { PHONE_PATTERN, addAddress, type AddressFields, type AddressResult } from '@/lib/addresses';
import { insert, insertMany, insertUnless, mutate, nextId, nextIds, readAll } from '@/lib/db';
import { EVENTS, audit, notify } from '@/lib/notifications';
import { availablePaymentMethods, startPayment } from '@/lib/payments/adapters';
import { itemForCustomer, orderForCustomer, orderForSupplier } from '@/lib/order-privacy';
import { ADMIN_ROLES } from '@/lib/roles';
import { allAsDisplayed } from '@/lib/payments/status';
import { priceOrder, resolveLane } from '@/lib/order-lines';
import { evaluateCode } from '@/lib/promo-codes';
import { REFUSED_ALREADY_USED, usedByBuyer } from '@/lib/promo.mjs';
import { checkoutIsPaused } from '@/lib/settings';
import { paymentExpiresAt } from '@/lib/payments/policy';
import { TERMS_VERSION } from '@/lib/terms';
import type { Order, OrderItem, OrderTimelineEntry, Payment, PromoCode } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * How many unpaid orders one buyer may hold open at once. Far above what a
 * person leaves waiting (verify's scripted buyers peak around a dozen), and a
 * ceiling on how many rows one account can pile up before paying for anything.
 */
const MAX_OPEN_UNPAID_ORDERS = 25;

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
  /** Spec 0011, AC-24: the code applied, and the discount the buyer was shown. */
  promo_code: z.string().trim().max(40).nullish(),
  promo_expected_discount: z.number().nullish(),
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
  // Buyers, suppliers and the team. A runner reaches an order through its own
  // jobs (the runner workspace), never through the list of everyone's orders.
  const { actor, response } = await guard(['CUSTOMER', 'SUPPLIER_OWNER', ...ADMIN_ROLES]);
  if (response) return response;

  // Spec 0003, AC-5: the list agrees with the detail screens about what is still
  // payable, so a closed window shows as cancelled here too.
  const [storedOrders, payments] = await Promise.all([readAll('orders'), readAll('payments')]);
  const orders = allAsDisplayed(storedOrders, payments);
  const status = new URL(request.url).searchParams.get('status');

  const newestFirst = <T extends Pick<Order, 'status' | 'placed_at'>>(rows: T[]) =>
    (status ? rows.filter((row) => row.status === status) : rows).sort((a, b) =>
      b.placed_at.localeCompare(a.placed_at),
    );

  // Customers only ever see their own orders; suppliers see the orders they
  // have a leg on, each through its own allow list. Enforced here, not in the page.
  if (actor.role === 'CUSTOMER') {
    return ok(newestFirst(orders.filter((order) => order.customer_id === actor.id).map(orderForCustomer)));
  }

  if (actor.role === 'SUPPLIER_OWNER') {
    const legs = await readAll('supplier-orders');
    const mine = new Set(
      legs.filter((leg) => leg.supplier_id === actor.supplierId).map((leg) => leg.order_id),
    );
    return ok(newestFirst(orders.filter((order) => mine.has(order.id)).map(orderForSupplier)));
  }

  return ok(newestFirst(orders));
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

  const throttled = throttle('placeOrder', actor.id);
  if (throttled) return throttled;

  // A buyer with this many orders still waiting for payment pays or cancels
  // some first. Read from the store, so it holds whichever server instance
  // takes the request, unlike the throttle above. Lapsed ones read as
  // cancelled (spec 0003, AC-5) and do not count.
  {
    const [stored, payments] = await Promise.all([readAll('orders'), readAll('payments')]);
    const unpaid = allAsDisplayed(
      stored.filter((order) => order.customer_id === actor.id),
      payments,
    ).filter((order) => order.status === 'AWAITING_PAYMENT').length;
    if (unpaid >= MAX_OPEN_UNPAID_ORDERS) {
      return fail(
        `You have ${unpaid} orders waiting for payment. Pay for or cancel one of them before placing another.`,
        429,
      );
    }
  }

  const parsed = CheckoutSchema.safeParse(await request.json());
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? 'Invalid checkout payload.', 422);
  }

  const {
    lines,
    payment_method,
    delivery_method,
    delivery_address,
    delivery_city,
    delivery_country,
    terms_accepted,
    recipient_name,
    delivery_phone,
    delivery_instructions,
    save_address,
    address_label,
    promo_code,
    promo_expected_discount,
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

  // Spec 0009: the lane, its currency and its fee, worked out as the quote does.
  const lane = await resolveLane(parsed.data);
  if (!lane.ok) return fail(lane.error, lane.status);
  const { country, currency, deliveryCountry, point } = lane;

  // Spec 0009, answers 1 and 2: the buyer pays in their country's currency,
  // with one of the methods offered there.
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

  const built = await priceOrder(lines, lane, actor.customerType);
  if (!built.ok) return fail(built.error, built.status);

  const { subtotal } = built;
  const delivery_fee = lane.deliveryFee;

  // Spec 0011, AC-24: what the buyer has seen is compared, never used. The only
  // discount is the one worked out here.
  const totalWith = (discount: number) => Math.round((subtotal - discount + delivery_fee) * 100) / 100;
  const staleCode = async (promoCode: PromoCode | undefined, reason: string, discount: number) => {
    // Only a real code is worth a record. Anyone can post any text, and an audit
    // log must not be something a buyer can fill with it.
    if (promoCode) {
      await audit({
        actorId: actor.id,
        actorName: actor.name,
        action: EVENTS.PROMO_STALE_REFUSED,
        entity: 'promo-code',
        entityId: promoCode.id,
        detail: `${promoCode.code} refused at order: ${reason}`,
      });
    }
    return ok({ error: reason, reason, promo_discount: discount, total: totalWith(discount) }, { status: 409 });
  };

  const applied = promo_code
    ? await evaluateCode({ code: promo_code, buyerId: actor.id, built, lane })
    : null;
  if (applied) {
    const { promo: stored, result } = applied;
    if (!result.ok) return staleCode(stored, result.reason, 0);
    if (result.discount !== promo_expected_discount) {
      return staleCode(stored, 'Your discount has changed.', result.discount);
    }
  }
  const promo = applied?.result.ok ? { code: applied.code, ...applied.result } : null;
  const promoDiscount = promo?.discount ?? 0;

  const orderId = await nextId('orders', 'o');
  const now = new Date().toISOString();
  const itemIds = await nextIds('order-items', 'oi', lines.length);
  const items: OrderItem[] = built.lines.map((line, index) => ({
    ...line.item,
    id: itemIds[index],
    order_id: orderId,
  }));

  // Spec 0003: an order is placed and nothing more. The PAID entry is written by
  // confirmPayment(), the only thing that knows money actually moved.
  const timeline: OrderTimelineEntry[] = [
    { status: 'AWAITING_PAYMENT', label: 'Order placed, waiting for payment', at: now },
  ];

  // The locker, its address and town come from the one shared list, never from
  // the request: checkout shows the same fee it reads from there.
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
    buyer_fx_rate: lane.rate,
    subtotal,
    delivery_fee,
    total: totalWith(promoDiscount),
    payment_method,
    recipient_name: recipient_name || actor.name,
    delivery_phone: delivery_phone || null,
    delivery_instructions: delivery_instructions || null,
    terms_accepted_at: now,
    terms_version: TERMS_VERSION,
    ...(promo && {
      promo_code: promo.code,
      promo_discount: promo.discount,
      promo_discount_pula: promo.discountPula,
    }),
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

  // Spec 0011, AC-25: checked again inside the write, so two parallel submits
  // cannot both pass the once per buyer rule.
  if (promo && applied) {
    const placed = await insertUnless('orders', order, (rows) =>
      usedByBuyer(allAsDisplayed(rows, applied.payments), promo.code, actor.id),
    );
    if (!placed) return staleCode(applied.promo, REFUSED_ALREADY_USED, 0);
  } else {
    await insert('orders', order);
  }
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
      // What the buyer may read: not the team's notes, nor who supplies each
      // line at what cost (lib/order-privacy.ts).
      order: orderForCustomer(order),
      items: items.map(itemForCustomer),
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
