import { beforeAll, describe, expect, it, vi } from 'vitest';

import { allowSlowHandshakes } from '@/lib/postgres/network.mjs';

// `lib/db.ts` memoises reads with React's `cache()`, which only exists inside a
// server component render. A passthrough keeps the module importable here, and
// losing the memoisation is what this test wants anyway: every read must be fresh
// to see what a competing caller just wrote.
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return { ...actual, cache: (fn: unknown) => fn };
});

/**
 * confirmPayment against real Postgres (spec 0003, AC-3 and AC-4).
 *
 * Skipped unless `PAYMENTS_IT_DATABASE_URL` points at a throwaway Neon branch, so
 * `npm test` stays a fast offline unit run. Never point it at production: this
 * writes orders, payments, supplier orders and payables.
 *
 *   DB_DRIVER=postgres PAYMENTS_IT_DATABASE_URL=<branch url> npx vitest run lib/payments/confirm.integration.test.ts
 *
 * ## Why this has to be Postgres
 *
 * The duplicate supplier leg race is invisible on the JSON driver. There `nextIds`
 * scans for the highest existing number without reserving it, so two concurrent
 * callers mint the SAME id and `assertNewIds` rejects the second by accident. On
 * Postgres `id_counters` reserves a distinct block per caller, the ids differ, and
 * nothing would stop either insert. The HTTP level check in scripts/verify.mjs
 * therefore passes whether the fix is present or not; this one does not.
 */

const BRANCH_URL = process.env.PAYMENTS_IT_DATABASE_URL;
const describeIfBranch = BRANCH_URL ? describe : describe.skip;

describeIfBranch('confirmPayment, against Postgres', () => {
  let confirmPayment: typeof import('./confirm').confirmPayment;
  let db: typeof import('@/lib/db');

  beforeAll(async () => {
    // Botswana to us-east-2 exceeds the 250 ms Node allows per address, so the
    // socket budget has to be raised before anything opens a connection (AGENTS.md).
    allowSlowHandshakes();
    process.env.DATABASE_URL = BRANCH_URL;
    process.env.DB_DRIVER = 'postgres';

    db = await import('@/lib/db');
    ({ confirmPayment } = await import('./confirm'));
  });


  /** An unpaid order that has items, never one a previous test already used. */
  const used = new Set<string>();

  async function freshUnpaidOrder() {
    const [orders, items] = await Promise.all([db.readAll('orders'), db.readAll('order-items')]);

    const order = orders.find(
      (candidate) =>
        candidate.status === 'AWAITING_PAYMENT' &&
        !used.has(candidate.id) &&
        items.some((item) => item.order_id === candidate.id),
    );

    if (order) used.add(order.id);
    return order ?? null;
  }

  async function openAttempt(orderId: string, amount: number, reference: string, status: 'STARTED' | 'FAILED' = 'STARTED') {
    const [id] = await db.nextIds('payments', 'pmt', 1);
    await db.insert('payments', {
      id,
      order_id: orderId,
      provider: 'MOCK',
      provider_reference: reference,
      status,
      amount,
      amount_matches: false,
      created_at: new Date().toISOString(),
      confirmed_at: null,
      failure_reason: status === 'FAILED' ? 'Card declined by issuer' : null,
      note: null,
    });
    return id;
  }

  it('raises exactly one supplier order and one payable per supplier when two confirmations overlap', async () => {
    // Arrange: an unpaid order that already has items, plus an open attempt for it.
    const orders = await db.readAll('orders');
    const items = await db.readAll('order-items');

    const target = orders.find(
      (order) =>
        order.status === 'AWAITING_PAYMENT' && items.some((item) => item.order_id === order.id),
    );

    expect(target, 'the branch needs a seeded AWAITING_PAYMENT order with items').toBeDefined();
    if (!target) return;

    const suppliers = new Set(
      items.filter((item) => item.order_id === target.id).map((item) => item.supplier_id),
    );

    const reference = `IT-${Date.now()}`;
    const [paymentId] = await db.nextIds('payments', 'pmt', 1);
    await db.insert('payments', {
      id: paymentId,
      order_id: target.id,
      provider: 'MOCK',
      provider_reference: reference,
      status: 'STARTED',
      amount: target.total,
      amount_matches: false,
      created_at: new Date().toISOString(),
      confirmed_at: null,
      failure_reason: null,
      note: null,
    });

    // Act: four callers race, exactly as a retrying gateway would.
    const confirm = () =>
      confirmPayment({
        orderId: target.id,
        provider: 'MOCK',
        providerReference: reference,
        amount: target.total,
        actor: { id: 'system:test', name: 'Integration test' },
      }).catch((error) => ({ ok: false as const, reason: String(error) }));

    await Promise.all([confirm(), confirm(), confirm(), confirm()]);

    // Assert: one leg per supplier, one payable per leg, one confirmed payment.
    const legs = (await db.readAll('supplier-orders')).filter((leg) => leg.order_id === target.id);
    const payables = (await db.readAll('supplier-payables')).filter(
      (entry) => entry.order_id === target.id,
    );
    const confirmed = (await db.readAll('payments')).filter(
      (row) => row.order_id === target.id && row.status === 'CONFIRMED',
    );

    expect(legs).toHaveLength(suppliers.size);
    expect(new Set(legs.map((leg) => leg.supplier_id)).size).toBe(suppliers.size);
    expect(payables).toHaveLength(legs.length);
    expect(confirmed).toHaveLength(1);

    const finished = await db.findById('orders', target.id);
    expect(finished?.status).toBe('PROCESSING');
  }, 120_000);

  /**
   * Review finding: after a 23505 the old `findConfirmed` matched only on provider
   * and reference, never the order. So a reference already confirmed on order A
   * would hand order A's payment back to a confirmation aimed at order B, and
   * order B got raised and marked paid on money that was never for it.
   *
   * Reachable by a finance admin typing a bank reference they already used.
   */
  it('refuses a reference that is already confirmed on a different order', async () => {
    const first = await freshUnpaidOrder();
    const second = await freshUnpaidOrder();
    expect(first && second, 'needs two untouched unpaid orders').toBeTruthy();
    if (!first || !second) return;

    const shared = `IT-REUSED-${Date.now()}`;
    await openAttempt(first.id, first.total, shared);

    const paid = await confirmPayment({
      orderId: first.id,
      provider: 'MOCK',
      providerReference: shared,
      amount: first.total,
      actor: { id: 'system:test', name: 'Integration test' },
    });
    expect(paid.ok).toBe(true);

    // Now the same reference, aimed at a different order.
    const reused = await confirmPayment({
      orderId: second.id,
      provider: 'MOCK',
      providerReference: shared,
      amount: second.total,
      actor: { id: 'system:test', name: 'Integration test' },
    }).catch((error) => ({ ok: false as const, reason: `threw: ${String(error)}` }));

    expect(reused.ok, 'a reused reference must not mark a second order paid').toBe(false);

    const after = await db.findById('orders', second.id);
    expect(after?.status, 'the second order must stay unpaid').toBe('AWAITING_PAYMENT');

    const legs = (await db.readAll('supplier-orders')).filter((leg) => leg.order_id === second.id);
    expect(legs, 'no supplier may be told to prepare goods for it').toHaveLength(0);
  }, 180_000);

  /**
   * Review finding: the claim only ever flipped a STARTED row, so a confirmation
   * for a reference already recorded as FAILED tried to insert a duplicate, the
   * unique index fired, and `findConfirmed` found nothing because the row was
   * FAILED rather than CONFIRMED. The error rethrew as a 500, on every retry,
   * forever.
   *
   * A provider reporting a payment failed and then settling the same transaction
   * is a real sequence, and it must not become a permanent dead end.
   */
  it('confirms a payment whose reference was previously recorded as failed', async () => {
    const order = await freshUnpaidOrder();
    expect(order, 'needs an untouched unpaid order').toBeTruthy();
    if (!order) return;

    const reference = `IT-AFTER-FAIL-${Date.now()}`;
    await openAttempt(order.id, order.total, reference, 'FAILED');

    const settled = await confirmPayment({
      orderId: order.id,
      provider: 'MOCK',
      providerReference: reference,
      amount: order.total,
      actor: { id: 'system:test', name: 'Integration test' },
    }).catch((error) => ({ ok: false as const, reason: `threw: ${String(error)}` }));

    expect(settled.ok, 'a late success on a failed reference must not be a permanent error').toBe(true);

    const after = await db.findById('orders', order.id);
    expect(after?.status).toBe('PROCESSING');

    const confirmed = (await db.readAll('payments')).filter(
      (row) => row.order_id === order.id && row.status === 'CONFIRMED',
    );
    expect(confirmed, 'exactly one confirmed payment, not a duplicate row').toHaveLength(1);
  }, 180_000);

});
