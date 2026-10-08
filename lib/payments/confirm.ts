import 'server-only';

import { findById, mutate, nextIds, readAll } from '@/lib/db';
import { EVENTS, audit, notify } from '@/lib/notifications';
import { claimedAfterWindow } from '@/lib/payments/policy';
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
  | {
      ok: false;
      reason:
        | 'NOT_FOUND'
        | 'CANCELLED_BY_PERSON'
        | 'ALREADY_PAID_DIFFERENTLY'
        /** This reference is already confirmed against a different order. */
        | 'REFERENCE_USED_ELSEWHERE';
    };

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
  // recorded and sent to finance rather than swallowed.
  if (order.status === 'CANCELLED' && order.cancel_reason !== 'EXPIRED') {
    await flagRefusedPayment({
      order,
      provider: input.provider,
      providerReference: input.providerReference,
      amount: input.amount,
      why: 'the order was cancelled on purpose, so the payment was not applied',
    });
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

    // The index refused the insert. Which of two very different things that means
    // depends on whose row is already holding the reference.
    const held = await findConfirmed(input);

    // Another order's money. Refuse: confirming here would mark this order paid on
    // a payment that was never for it.
    if (held.otherOrderId) {
      await flagRefusedPayment({
        order,
        provider: input.provider,
        providerReference: input.providerReference,
        amount: input.amount,
        why: `the reference is already settled against order ${held.otherOrderId}`,
      });
      return { ok: false, reason: 'REFERENCE_USED_ELSEWHERE' };
    }

    // Our own order, so a genuine race: another caller claimed it first. Their row
    // wins and we still continue to step 2, because that caller may not have
    // finished its legs yet.
    if (!held.mine) throw error;
    claim = { payment: held.mine, wonClaim: false };
  }

  if (claim.conflict) {
    // A second, distinct payment for an order that is already paid: a double charge.
    await flagRefusedPayment({
      order,
      provider: input.provider,
      providerReference: input.providerReference,
      amount: input.amount,
      why: `the order is already paid under reference ${claim.payment.provider_reference}, so this looks like a double charge`,
    });
    return { ok: false, reason: 'ALREADY_PAID_DIFFERENTLY' };
  }

  // ── 2. Legs ────────────────────────────────────────────────────────────────
  const raised = await raiseSupplierLegs(order, now);

  // ── 3. Finish ──────────────────────────────────────────────────────────────
  const finish = await finishOrder(order, claim.payment, now);

  // The order was cancelled by a person between the check at the top and the
  // finish. The money is claimed and legs may exist, so a human has to decide.
  if (finish.cancelledByPerson) {
    await flagRefusedPayment({
      order: finish.order,
      provider: input.provider,
      providerReference: input.providerReference,
      amount: input.amount,
      why: 'the order was cancelled while the payment was being confirmed; supplier orders may already exist',
    });
    return { ok: false, reason: 'CANCELLED_BY_PERSON' };
  }

  // ── 4. After ───────────────────────────────────────────────────────────────
  // Only the call that actually moved the order announces it. A replay, or a
  // second click on "Mark paid", must not send the buyer a second "payment
  // confirmed" or write a second audit line.
  if (finish.transitioned) {
    await announce({
      order: finish.order,
      payment: claim.payment,
      raised,
      actor: input.actor,
      late: finish.late,
      amountMatches,
    });
  }

  return {
    ok: true,
    order: finish.order,
    payment: claim.payment,
    replayed: !claim.wonClaim,
    late: finish.late,
  };
}

/**
 * Money arrived that we could not apply. Recorded and sent to finance.
 *
 * Every caller that refuses a confirmation comes through here, because a gateway
 * only calls back after it has taken the money: a refusal with no trace would be
 * a buyer's payment nobody knows about. The audit row is the record finance
 * works from to refund or reassign it.
 */
export async function flagRefusedPayment(args: {
  order: Pick<Order, 'id' | 'reference' | 'total'> | null;
  provider: PaymentProvider;
  providerReference: string;
  amount: number;
  why: string;
}): Promise<void> {
  const { order, provider, providerReference, amount, why } = args;
  const subject = order ? order.reference : `reference ${providerReference}`;
  const detail = `${provider} payment ${providerReference} of BWP ${amount.toFixed(2)} for ${subject} was not applied: ${why}. Needs finance to refund or reassign it.`;

  console.error(`[payments] refused: ${detail}`);

  await audit({
    actorId: CALLBACK_ACTOR.id,
    actorName: CALLBACK_ACTOR.name,
    action: EVENTS.PAYMENT_REFUSED,
    entity: 'order',
    entityId: order?.id ?? providerReference,
    detail,
  });

  const finance = (await readAll('users')).filter((user) =>
    ['FINANCE_ADMIN', 'SUPER_ADMIN'].includes(user.role),
  );
  for (const member of finance) {
    await notify({
      userId: member.id,
      title: 'Payment needs a decision',
      body: detail,
      kind: 'PAYMENT',
    });
  }
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

    // Prefer flipping an attempt this order already has, so it does not accumulate
    // an orphan row beside its confirmed one.
    //
    // A FAILED row carrying this exact reference counts as claimable. A provider
    // that reports a payment failed and then settles the same transaction is a real
    // sequence, and before this it was a permanent dead end: the claim skipped the
    // failed row, inserted a duplicate, the unique index fired, and the error
    // rethrew as a 500 on every retry forever. A failed row with no reference is
    // left alone, because there is nothing to identify it by.
    const started = mine.find(
      (row) =>
        row.provider === input.provider &&
        ((row.status === 'STARTED' &&
          (row.provider_reference === null ||
            row.provider_reference === input.providerReference)) ||
          (row.status === 'FAILED' && row.provider_reference === input.providerReference)),
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

/**
 * Who owns the confirmed row that this reference already belongs to.
 *
 * Matching on the order as well as the reference is the whole point. The first
 * version matched only provider and reference, so a reference already confirmed on
 * order A was handed back to a confirmation aimed at order B: order B then had its
 * supplier legs raised and was marked paid on money that was never for it, with no
 * payment row of its own and no amount check. A finance admin reusing a bank
 * reference they had typed before was enough to trigger it.
 */
async function findConfirmed(
  input: ConfirmInput,
): Promise<{ mine: Payment | null; otherOrderId: string | null }> {
  const rows = await readAll('payments');

  const matching = rows.filter(
    (row) =>
      row.status === 'CONFIRMED' &&
      row.provider === input.provider &&
      row.provider_reference === input.providerReference,
  );

  return {
    mine: matching.find((row) => row.order_id === input.orderId) ?? null,
    otherOrderId: matching.find((row) => row.order_id !== input.orderId)?.order_id ?? null,
  };
}

type RaisedLegs = { supplierOrders: SupplierOrder[]; payables: SupplierPayable[] };

/**
 * One supplier order and one payable per supplier on the order.
 *
 * Idempotent by `(order_id, supplier_id)` for the leg and by `supplier_order_id`
 * for the payable, so a replay or a resumed run adds nothing. This is the step
 * that used to run at checkout, which is how a supplier could be told to prepare
 * goods for an order nobody had paid for.
 *
 * ## Why each decision happens inside its own `mutate`
 *
 * The first version of this read the existing legs, decided what was missing, and
 * inserted several awaits later. Two overlapping confirmations both read "no legs"
 * and both inserted, so one order got two sets of supplier orders and two payables:
 * double liability to the supplier.
 *
 * It passed testing only by accident. On the JSON driver `nextIds` scans for the
 * highest existing number without reserving it, so both callers minted the same id
 * and `assertNewIds` rejected the second. On Postgres `id_counters` hands each
 * caller its own block, so the ids differ and nothing stops either insert. A bug
 * that only appears on the real store is the worst kind.
 *
 * So the check and the write now share one lock per collection. `mutate` cannot
 * span two collections, which is fine: legs are claimed under the legs lock,
 * payables under the payables lock, and a run that dies between them leaves legs
 * with no payable, which the next retry completes. Same claim then complete shape
 * as `confirmPayment` itself.
 */
async function raiseSupplierLegs(order: Order, now: string): Promise<RaisedLegs> {
  const [items, offers, suppliers] = await Promise.all([
    readAll('order-items'),
    readAll('supplier-offers'),
    readAll('suppliers'),
  ]);

  const mine = items.filter((item) => item.order_id === order.id);

  // AC-9: the supplier chosen at checkout fulfils the order. Re-selection runs
  // only when that supplier can no longer fulfil, because the buyer's price is a
  // promise and re-routing every time would move the margin under it.
  const bySupplier = new Map<string, OrderItem[]>();
  for (const item of mine) {
    const supplierId = resolveSupplier(item, offers, suppliers);
    bySupplier.set(supplierId, [...(bySupplier.get(supplierId) ?? []), item]);
  }

  if (bySupplier.size === 0) return { supplierOrders: [], payables: [] };

  // Reserved before the lock, because minting ids is itself a write and taking a
  // second lock inside a held one invites a deadlock. Ids this call ends up not
  // using just leave a gap, which the store already tolerates.
  const legIds = await nextIds('supplier-orders', 'sup', bySupplier.size);

  const supplierOrders = await mutate<'supplier-orders', SupplierOrder[]>(
    'supplier-orders',
    (rows) => {
      // Read inside the lock. This is the line that makes the whole thing safe: a
      // second caller cannot observe this set before the first one has written.
      const alreadyLegged = new Set(
        rows.filter((leg) => leg.order_id === order.id).map((leg) => leg.supplier_id),
      );

      const created: SupplierOrder[] = [];
      let next = 0;

      for (const [supplierId, supplierItems] of bySupplier) {
        if (alreadyLegged.has(supplierId)) continue;

        const gross = supplierItems.reduce((sum, item) => sum + item.line_total, 0);
        const cost = supplierItems.reduce((sum, item) => sum + item.supplier_cost * item.qty, 0);

        const route = selectSupplier(
          offers.filter((offer) => offer.product_id === supplierItems[0].product_id),
          suppliers,
          supplierItems[0].qty,
        );

        created.push({
          id: legIds[next++],
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
      }

      return { rows: [...rows, ...created], result: created };
    },
  );

  // Every leg this order now has, not only the ones this call created. A resumed
  // run has to raise the payable for a leg an earlier, interrupted run left
  // behind, which the previous version could never do.
  const allLegs = (await readAll('supplier-orders')).filter((leg) => leg.order_id === order.id);
  if (allLegs.length === 0) return { supplierOrders, payables: [] };

  const payableIds = await nextIds('supplier-payables', 'pay', allLegs.length);

  const payables = await mutate<'supplier-payables', SupplierPayable[]>(
    'supplier-payables',
    (rows) => {
      const covered = new Set(rows.map((entry) => entry.supplier_order_id));
      const created: SupplierPayable[] = [];
      let next = 0;

      for (const leg of allLegs) {
        if (covered.has(leg.id)) continue;

        // Raised here rather than through lib/payables.ts, which owns transitions
        // between states and not the first write into PENDING.
        created.push({
          id: payableIds[next++],
          order_id: order.id,
          supplier_order_id: leg.id,
          supplier_id: leg.supplier_id,
          // Taken from the leg rather than recomputed, so a payable can be raised
          // for a leg this call did not build. Gross is what the customer pays for
          // those lines: the supplier's cost plus our margin on them.
          amount: leg.supplier_subtotal + leg.platform_margin,
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
      }

      return { rows: [...rows, ...created], result: created };
    },
  );

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

type FinishResult = {
  order: Order;
  /** True only for the call that moved the order to PROCESSING. */
  transitioned: boolean;
  /** The payment was claimed after the window closed, so the order reopened. */
  late: boolean;
  /** A person cancelled the order after this confirmation began. */
  cancelledByPerson: boolean;
};

/**
 * Flip the order to PROCESSING. The write that proves everything before it finished.
 *
 * Lateness is decided here, under the orders lock, from when the payment was
 * claimed, not from whether something already wrote the expiry down. Before this
 * only an order the retry route had persisted as EXPIRED counted as late, so the
 * usual route (a buyer abandons the card page, the gateway calls back at minute
 * 35, or a bank transfer lands on day 8) confirmed as an ordinary on time
 * payment with nothing in the timeline or audit (AC-7). Using the claim time also
 * keeps a crashed run honest: one resumed after the deadline is not late if the
 * money was claimed before it.
 */
async function finishOrder(order: Order, payment: Payment, now: string): Promise<FinishResult> {
  return mutate<'orders', FinishResult>('orders', (rows) => {
    const index = rows.findIndex((row) => row.id === order.id);
    if (index === -1) {
      return { rows, result: { order, transitioned: false, late: false, cancelledByPerson: false } };
    }

    const current = rows[index];
    const storedExpired = current.status === 'CANCELLED' && current.cancel_reason === 'EXPIRED';

    // Only an order still waiting, or one the clock cancelled, may be moved to
    // PROCESSING. Without this a replayed callback dragged an IN_TRANSIT or
    // DELIVERED order backwards, and overwrote a cancellation that landed after
    // this function read its snapshot.
    const mayStart = current.status === 'AWAITING_PAYMENT' || storedExpired;

    if (!mayStart) {
      return {
        rows,
        result: {
          order: current,
          transitioned: false,
          late: false,
          cancelledByPerson: current.status === 'CANCELLED' && !storedExpired,
        },
      };
    }

    const claimedLate = claimedAfterWindow(current, payment, new Date(now));
    const late = storedExpired || claimedLate;

    const next: Order = {
      ...current,
      status: 'PROCESSING',
      payment_reference: payment.provider_reference,
      cancel_reason: null,
      updated_at: now,
      timeline: [
        ...current.timeline,
        // The expiry nothing had written down yet, so the timeline tells the
        // whole story: held, released, then reopened by a late payment.
        ...(claimedLate
          ? [
              {
                status: 'CANCELLED' as const,
                label: 'Cancelled, payment window closed',
                at: current.payment_expires_at,
                actor: 'System',
              },
            ]
          : []),
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
    return {
      rows: copy,
      result: { order: next, transitioned: true, late, cancelledByPerson: false },
    };
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
