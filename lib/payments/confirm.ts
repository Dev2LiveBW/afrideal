import 'server-only';

import { findById, insertMany, mutate, nextIds, readAll } from '@/lib/db';
import { EVENTS, audit, notify } from '@/lib/notifications';
import { selectSupplier } from '@/lib/supplier-selection';
import type {
  Order,
  OrderItem,
  Payment,
  PaymentProvider,
  Supplier,
  SupplierOffer,
  SupplierOrder,
  SupplierPayable,
} from '@/types';

/**
 * The one way an order becomes paid (spec 0003).
 *
 * Checkout used to mark an order paid and raise the supplier legs in the same
 * request, before any money moved. Everything that confirms a payment now comes
 * through here: the gateway callback, a finance admin marking a bank transfer
 * paid, and later a refund reversal.
 *
 * ## Why the write order matters
 *
 * `mutate()` takes an advisory lock per collection, so it makes each collection's
 * write safe and does nothing for a confirmation spanning four of them. The
 * sequence below is what makes an interrupted run recoverable rather than
 * silently broken:
 *
 *   1. claim  - win, or recognise, the payment row.
 *   2. legs   - upsert one supplier order and one payable per supplier.
 *   3. finish - flip the order to PROCESSING. This is the completion marker.
 *   4. after  - audit and notify, never before the order is PROCESSING.
 *
 * A crash between 1 and 3 leaves a claimed payment on an order that is not yet
 * PROCESSING. The next callback or a manual retry re-runs 2 to 4 and finishes the
 * job. That is why a replay means "finish the remaining work", not "do nothing".
 */

/** Postgres unique violation. The partial index on (provider, provider_reference) raises it. */
const UNIQUE_VIOLATION = '23505';

/**
 * drizzle 0.45 wraps the driver error, so the pg code can sit one level down.
 * Checking only `err.code` silently misses every real replay.
 */
function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  if ((error as { code?: unknown }).code === UNIQUE_VIOLATION) return true;
  const cause = (error as { cause?: { code?: unknown } }).cause;
  return cause?.code === UNIQUE_VIOLATION;
}

export type ConfirmActor = { id: string; name: string };

/** A gateway callback carries no session, so it audits under a fixed identity. */
export const CALLBACK_ACTOR: ConfirmActor = { id: 'system:payments', name: 'Payment callback' };

export type ConfirmInput = {
  orderId: string;
  provider: PaymentProvider;
  /** The provider's id for this attempt, and what a replayed callback arrives carrying. */
  providerReference: string;
  /** What the provider says was actually paid. Compared with the order total. */
  amount: number;
  actor: ConfirmActor;
  /** A finance admin's words when confirming a bank transfer by hand. */
  note?: string | null;
};

export type ConfirmOutcome =
  | { ok: true; order: Order; payment: Payment; replayed: boolean; late: boolean }
  | { ok: false; reason: 'NOT_FOUND' | 'CANCELLED_BY_PERSON' | 'ALREADY_PAID_DIFFERENTLY' };

/**
 * Confirm a payment and raise everything that depends on it.
 *
 * Returns a tagged outcome rather than throwing for business refusals, because
 * the callback route has to map them onto codes a gateway will not retry forever:
 * a refusal is 409, not a 500.
 */
export async function confirmPayment(input: ConfirmInput): Promise<ConfirmOutcome> {
  const order = await findById('orders', input.orderId);
  if (!order) return { ok: false, reason: 'NOT_FOUND' };

  // AC-7: a late payment reopens an order the clock cancelled, but never one a
  // person cancelled on purpose. The money is real either way, so the refusal is
  // reported rather than swallowed and the caller flags it for a human.
  if (order.status === 'CANCELLED' && order.cancel_reason !== 'EXPIRED') {
    return { ok: false, reason: 'CANCELLED_BY_PERSON' };
  }

  const now = new Date().toISOString();
  const amountMatches = input.amount === order.total;

  // ── 1. Claim ───────────────────────────────────────────────────────────────
  let claim: ClaimResult;
  try {
    claim = await claimPayment(input, order, now, amountMatches);
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    // The index caught a genuine race: another caller inserted this exact
    // (provider, provider_reference) first. Their row wins, and we still go on to
    // step 2, because that caller may not have finished its own legs yet.
    const existing = await findConfirmed(input);
    if (!existing) throw error;
    claim = { payment: existing, wonClaim: false };
  }

  if (claim.conflict) return { ok: false, reason: 'ALREADY_PAID_DIFFERENTLY' };

  // ── 2. Legs ────────────────────────────────────────────────────────────────
  const raised = await raiseSupplierLegs(order, now);

  // ── 3. Finish ──────────────────────────────────────────────────────────────
  const wasExpired = order.status === 'CANCELLED' && order.cancel_reason === 'EXPIRED';
  const finished = await finishOrder(order, claim.payment, now, wasExpired);

  // ── 4. After ───────────────────────────────────────────────────────────────
  await announce({
    order: finished,
    payment: claim.payment,
    raised,
    actor: input.actor,
    late: wasExpired,
    amountMatches,
  });

  return {
    ok: true,
    order: finished,
    payment: claim.payment,
    replayed: !claim.wonClaim,
    late: wasExpired,
  };
}

export type FailOutcome =
  | { ok: true; payment: Payment }
  | { ok: false; reason: 'NOT_FOUND' | 'ALREADY_CONFIRMED' };

/**
 * Record that an attempt failed (AC-10).
 *
 * Deliberately touches nothing but the payment row. A declined card does not
 * cancel the order: the buyer may start another attempt until the deadline, and
 * cancelling here would throw away a basket over one bad card.
 *
 * A confirmed payment is never walked back to FAILED. An out of order provider
 * notification arriving after a success is refused, because the money did arrive
 * and reversing it belongs to refunds, not to a late failure notice.
 */
export async function failPayment(input: {
  orderId: string;
  provider: PaymentProvider;
  providerReference: string;
  reason?: string | null;
  actor: ConfirmActor;
}): Promise<FailOutcome> {
  const order = await findById('orders', input.orderId);
  if (!order) return { ok: false, reason: 'NOT_FOUND' };

  const outcome = await mutate<'payments', FailOutcome>('payments', (rows) => {
    const mine = rows.filter((row) => row.order_id === order.id);

    if (mine.some((row) => row.status === 'CONFIRMED')) {
      return { rows, result: { ok: false, reason: 'ALREADY_CONFIRMED' } };
    }

    const target =
      mine.find(
        (row) =>
          row.provider === input.provider &&
          (row.provider_reference === input.providerReference || row.provider_reference === null),
      ) ?? null;

    if (!target) return { rows, result: { ok: false, reason: 'NOT_FOUND' } };

    const failed: Payment = {
      ...target,
      provider_reference: input.providerReference,
      status: 'FAILED',
      confirmed_at: null,
      failure_reason: input.reason ?? 'The provider reported a failed payment.',
    };

    return {
      rows: rows.map((row) => (row.id === target.id ? failed : row)),
      result: { ok: true, payment: failed },
    };
  });

  if (!outcome.ok) return outcome;

  // Audited like any other money event: a failed attempt is part of the record.
  await audit({
    actorId: input.actor.id,
    actorName: input.actor.name,
    action: EVENTS.PAYMENT_FAILED,
    entity: 'order',
    entityId: order.id,
    detail: `${order.reference} payment failed via ${input.provider}: ${outcome.payment.failure_reason}`,
  });

  await notify({
    userId: order.customer_id,
    title: 'Payment did not go through',
    body: `${order.reference} is still held for you. You can try paying again.`,
    kind: 'PAYMENT',
  });

  return outcome;
}

type ClaimResult = { payment: Payment; wonClaim: boolean; conflict?: boolean };

/**
 * Win, or recognise, the payment row for this confirmation.
 *
 * Runs wholly inside one `mutate('payments')`, so the "at most one CONFIRMED per
 * order" invariant is read and written under the same lock. Reading outside it
 * would be a read then write that two callers could both pass.
 */
async function claimPayment(
  input: ConfirmInput,
  order: Order,
  now: string,
  amountMatches: boolean,
): Promise<ClaimResult> {
  const [newId] = await nextIds('payments', 'pmt', 1);

  // The generic is pinned because the branches below return different shapes of
  // ClaimResult, and inference would otherwise narrow R to whichever returns first.
  return mutate<'payments', ClaimResult>('payments', (rows) => {
    const mine = rows.filter((row) => row.order_id === order.id);

    // Already confirmed under this very reference: a replay. Hand back the same
    // row so step 2 can finish whatever the first call did not.
    const sameReference = mine.find(
      (row) =>
        row.status === 'CONFIRMED' &&
        row.provider === input.provider &&
        row.provider_reference === input.providerReference,
    );
    if (sameReference) return { rows, result: { payment: sameReference, wonClaim: false } };

    // Confirmed under a different reference: a second, distinct payment for one
    // order. That is a double charge, not a replay, and a human has to decide.
    const otherConfirmed = mine.find((row) => row.status === 'CONFIRMED');
    if (otherConfirmed) {
      return { rows, result: { payment: otherConfirmed, wonClaim: false, conflict: true } };
    }

    // Prefer flipping the attempt checkout already opened, so one order does not
    // accumulate an orphan STARTED row beside its confirmed one.
    const started = mine.find(
      (row) =>
        row.status === 'STARTED' &&
        row.provider === input.provider &&
        (row.provider_reference === null || row.provider_reference === input.providerReference),
    );

    const confirmed: Payment = {
      id: started?.id ?? newId,
      order_id: order.id,
      provider: input.provider,
      provider_reference: input.providerReference,
      status: 'CONFIRMED',
      amount: input.amount,
      amount_matches: amountMatches,
      created_at: started?.created_at ?? now,
      confirmed_at: now,
      failure_reason: null,
      note: input.note ?? null,
    };

    const next = started
      ? rows.map((row) => (row.id === started.id ? confirmed : row))
      : [...rows, confirmed];

    return { rows: next, result: { payment: confirmed, wonClaim: true } };
  });
}

/** Re-read the confirmed row after losing the unique-index race. */
async function findConfirmed(input: ConfirmInput): Promise<Payment | null> {
  const rows = await readAll('payments');
  return (
    rows.find(
      (row) =>
        row.status === 'CONFIRMED' &&
        row.provider === input.provider &&
        row.provider_reference === input.providerReference,
    ) ?? null
  );
}

type RaisedLegs = { supplierOrders: SupplierOrder[]; payables: SupplierPayable[] };

/**
 * One supplier order and one payable per supplier on the order.
 *
 * Idempotent by `(order_id, supplier_id)` for the leg and by `supplier_order_id`
 * for the payable, so a replay or a resumed run adds nothing. This is the step
 * that used to run at checkout, which is how a supplier could be told to prepare
 * goods for an order nobody had paid for.
 */
async function raiseSupplierLegs(order: Order, now: string): Promise<RaisedLegs> {
  const [items, existingLegs, existingPayables, offers, suppliers] = await Promise.all([
    readAll('order-items'),
    readAll('supplier-orders'),
    readAll('supplier-payables'),
    readAll('supplier-offers'),
    readAll('suppliers'),
  ]);

  const mine = items.filter((item) => item.order_id === order.id);
  const alreadyLegged = new Set(
    existingLegs.filter((leg) => leg.order_id === order.id).map((leg) => leg.supplier_id),
  );

  // AC-9: the supplier chosen at checkout fulfils the order. Re-selection runs
  // only when that supplier can no longer fulfil, because the buyer's price is a
  // promise and re-routing every time would move the margin under it.
  const bySupplier = new Map<string, OrderItem[]>();
  for (const item of mine) {
    const supplierId = resolveSupplier(item, offers, suppliers);
    bySupplier.set(supplierId, [...(bySupplier.get(supplierId) ?? []), item]);
  }

  const pending = [...bySupplier.entries()].filter(([supplierId]) => !alreadyLegged.has(supplierId));
  if (pending.length === 0) return { supplierOrders: [], payables: [] };

  const legIds = await nextIds('supplier-orders', 'sup', pending.length);
  const payableIds = await nextIds('supplier-payables', 'pay', pending.length);

  const supplierOrders: SupplierOrder[] = [];
  const payables: SupplierPayable[] = [];
  const legged = new Set(existingPayables.map((entry) => entry.supplier_order_id));

  pending.forEach(([supplierId, supplierItems], index) => {
    const legId = legIds[index];
    const gross = supplierItems.reduce((sum, item) => sum + item.line_total, 0);
    const cost = supplierItems.reduce((sum, item) => sum + item.supplier_cost * item.qty, 0);

    const route = selectSupplier(
      offers.filter((offer) => offer.product_id === supplierItems[0].product_id),
      suppliers,
      supplierItems[0].qty,
    );

    supplierOrders.push({
      id: legId,
      order_id: order.id,
      supplier_id: supplierId,
      status: 'AWAITING_CONFIRMATION',
      item_ids: supplierItems.map((item) => item.id),
      supplier_subtotal: cost,
      platform_margin: gross - cost,
      selection_reason: route?.reason ?? 'Routed on composite supplier score.',
      auto_selected: true,
      created_at: now,
    });

    if (legged.has(legId)) return;

    // Raised here rather than through lib/payables.ts, which owns transitions
    // between states and not the first write into PENDING.
    payables.push({
      id: payableIds[index],
      order_id: order.id,
      supplier_order_id: legId,
      supplier_id: supplierId,
      amount: gross,
      status: 'PENDING',
      gateway: order.payment_method,
      raised_at: now,
      settled_at: null,
      cancelled_at: null,
      terms_days: 7,
      history: [
        {
          from: null,
          to: 'PENDING',
          at: now,
          actor: 'System',
          note: 'Procurement invoice raised once payment was confirmed.',
        },
      ],
    });
  });

  await insertMany('supplier-orders', supplierOrders);
  await insertMany('supplier-payables', payables);

  return { supplierOrders, payables };
}

/**
 * Who fulfils one line: the supplier checkout picked, unless they cannot any
 * more. `selectSupplier` gates on an active offer from a VERIFIED supplier;
 * stock is only its preference, so we check that ourselves against the quantity
 * actually ordered.
 */
function resolveSupplier(item: OrderItem, offers: SupplierOffer[], suppliers: Supplier[]): string {
  const forProduct = offers.filter((offer) => offer.product_id === item.product_id);
  const pinned = forProduct.find((offer) => offer.supplier_id === item.supplier_id);
  const supplier = suppliers.find((candidate) => candidate.id === item.supplier_id);

  const stillGood =
    pinned?.active === true && supplier?.status === 'VERIFIED' && pinned.stock >= item.qty;

  if (stillGood) return item.supplier_id;

  return selectSupplier(forProduct, suppliers, item.qty)?.supplier.id ?? item.supplier_id;
}

/** Flip the order to PROCESSING. The write that proves everything before it finished. */
async function finishOrder(
  order: Order,
  payment: Payment,
  now: string,
  late: boolean,
): Promise<Order> {
  return mutate('orders', (rows) => {
    const index = rows.findIndex((row) => row.id === order.id);
    if (index === -1) return { rows, result: order };

    const current = rows[index];
    if (current.status === 'PROCESSING') return { rows, result: current };

    const next: Order = {
      ...current,
      status: 'PROCESSING',
      payment_reference: payment.provider_reference,
      cancel_reason: null,
      updated_at: now,
      timeline: [
        ...current.timeline,
        {
          status: 'PAID',
          label: late ? 'Payment confirmed late, order reopened' : 'Payment confirmed',
          at: now,
          actor: 'System',
        },
        { status: 'PROCESSING', label: 'Sourcing from supplier', at: now },
      ],
    };

    const copy = [...rows];
    copy[index] = next;
    return { rows: copy, result: next };
  });
}

/**
 * Audit and notify, strictly after the order is PROCESSING.
 *
 * Audit is not optional here: a payment reference is tied to a named buyer, so
 * every money transition is logged under Botswana's Data Protection Act.
 */
async function announce(args: {
  order: Order;
  payment: Payment;
  raised: RaisedLegs;
  actor: ConfirmActor;
  late: boolean;
  amountMatches: boolean;
}): Promise<void> {
  const { order, payment, raised, actor, late, amountMatches } = args;

  await audit({
    actorId: actor.id,
    actorName: actor.name,
    action: EVENTS.PAYMENT_CONFIRMED,
    entity: 'order',
    entityId: order.id,
    detail: [
      `${order.reference} confirmed by ${payment.provider}, reference ${payment.provider_reference}.`,
      late ? ' Confirmed after the payment window closed, so the order was reopened.' : '',
      amountMatches ? '' : ` Paid ${payment.amount} against a total of ${order.total}; needs finance.`,
    ]
      .join('')
      .trim(),
  });

  if (raised.supplierOrders.length > 0) {
    const users = await readAll('users');
    for (const leg of raised.supplierOrders) {
      for (const user of users.filter((candidate) => candidate.supplier_id === leg.supplier_id)) {
        await notify({
          userId: user.id,
          title: 'New paid order to confirm',
          body: `${order.reference} is paid for. Please confirm within 24 hours.`,
          kind: 'SUPPLIER',
        });
      }
    }
  }

  await notify({
    userId: order.customer_id,
    title: late ? 'Payment received, order reopened' : 'Payment confirmed',
    body: `${order.reference} is paid for and we are sourcing it now.`,
    kind: 'PAYMENT',
  });
}
