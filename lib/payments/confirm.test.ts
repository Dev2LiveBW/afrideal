import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Order, OrderItem, Payment, Supplier, SupplierOffer } from '@/types';

import { confirmPayment, failPayment } from './confirm';

/*
 * confirmPayment and failPayment (spec 0003) against an in-memory store.
 *
 * The store is the boundary: `mutate` here applies the callback to one
 * collection the way lib/db.ts does under its lock. What the Postgres unique
 * index adds (a reference already confirmed on another order) needs the real
 * database, and lives in confirm.integration.test.ts.
 */

const store: Record<string, { id: string }[]> = {};
const audits: { action: string; detail: string }[] = [];
const notices: { userId: string; title: string }[] = [];

vi.mock('@/lib/db', () => {
  let counter = 100;
  return {
    readAll: async (collection: string) => structuredClone(store[collection] ?? []),
    findById: async (collection: string, id: string) =>
      structuredClone((store[collection] ?? []).find((row) => row.id === id) ?? null),
    nextIds: async (_collection: string, prefix: string, count: number) =>
      Array.from({ length: count }, () => `${prefix}${counter++}`),
    mutate: async (
      collection: string,
      fn: (rows: { id: string }[]) => { rows: { id: string }[]; result: unknown },
    ) => {
      const { rows, result } = await fn(structuredClone(store[collection] ?? []));
      store[collection] = rows;
      return result;
    },
  };
});

vi.mock('@/lib/notifications', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/notifications')>();
  return {
    ...actual,
    audit: async (entry: { action: string; detail: string }) => {
      audits.push({ action: entry.action, detail: entry.detail });
    },
    notify: async (entry: { userId: string; title: string }) => {
      notices.push({ userId: entry.userId, title: entry.title });
    },
  };
});

const HOUR = 60 * 60 * 1000;
const inAnHour = () => new Date(Date.now() + HOUR).toISOString();
const anHourAgo = () => new Date(Date.now() - HOUR).toISOString();

function order(overrides: Partial<Order> = {}): Order {
  return {
    id: 'o1',
    reference: 'AFD-1',
    customer_id: 'u-buyer',
    customer_name: 'Buyer',
    status: 'AWAITING_PAYMENT',
    currency: 'BWP',
    subtotal: 300,
    delivery_fee: 0,
    total: 300,
    payment_method: 'CARD',
    payment_reference: null,
    payment_expires_at: inAnHour(),
    timeline: [{ status: 'AWAITING_PAYMENT', label: 'Order placed, waiting for payment', at: anHourAgo() }],
    ...overrides,
  } as Order;
}

function item(id: string, supplierId: string, productId: string, overrides: Partial<OrderItem> = {}): OrderItem {
  return {
    id,
    order_id: 'o1',
    product_id: productId,
    variant_id: `${productId}v1`,
    product_name: productId,
    variant_label: 'One',
    emoji: '',
    qty: 1,
    unit_price: 150,
    line_total: 150,
    supplier_id: supplierId,
    supplier_cost: 100,
    fx_rate: 1,
    ...overrides,
  } as OrderItem;
}

const supplier = (id: string, overrides: Partial<Supplier> = {}): Supplier =>
  ({ id, name: id, country: 'BW', city: 'Gaborone', status: 'VERIFIED', rating: 4, reliability_score: 80, ...overrides }) as Supplier;

const offer = (supplierId: string, productId: string, overrides: Partial<SupplierOffer> = {}): SupplierOffer => ({
  id: `of-${supplierId}-${productId}`,
  product_id: productId,
  supplier_id: supplierId,
  supplier_cost: 100,
  stock: 50,
  fulfilment_days: 3,
  moq: 1,
  last_updated: '2026-10-01T00:00:00.000Z',
  active: true,
  ...overrides,
});

function attempt(overrides: Partial<Payment> = {}): Payment {
  return {
    id: 'pmt1',
    order_id: 'o1',
    provider: 'MOCK',
    provider_reference: 'REF-1',
    status: 'STARTED',
    amount: 300,
    amount_matches: null,
    created_at: anHourAgo(),
    confirmed_at: null,
    failure_reason: null,
    note: null,
    ...overrides,
  } as Payment;
}

const actor = { id: 'system:payments', name: 'Payment callback' };
const confirm = (overrides: Partial<Parameters<typeof confirmPayment>[0]> = {}) =>
  confirmPayment({ orderId: 'o1', provider: 'MOCK', providerReference: 'REF-1', amount: 300, actor, ...overrides });

const rows = <T>(collection: string) => (store[collection] ?? []) as unknown as T[];
const auditsOf = (action: string) => audits.filter((entry) => entry.action === action);

beforeEach(() => {
  for (const key of Object.keys(store)) delete store[key];
  audits.length = 0;
  notices.length = 0;
  store.orders = [order()];
  store['order-items'] = [item('i1', 's1', 'p1'), item('i2', 's2', 'p2')];
  store.payments = [attempt()];
  store.suppliers = [supplier('s1'), supplier('s2'), supplier('s3', { reliability_score: 99, rating: 5 })];
  store['supplier-offers'] = [offer('s1', 'p1'), offer('s3', 'p1'), offer('s2', 'p2')];
  store['supplier-orders'] = [];
  store['supplier-payables'] = [];
  store.users = [
    { id: 'u-finance', role: 'FINANCE_ADMIN' },
    { id: 'u-s1', role: 'SUPPLIER', supplier_id: 's1' },
  ] as unknown as { id: string }[];
});

describe('confirmPayment', () => {
  // covers: AC-3
  it('raises one supplier order and one payable per supplier, and moves the order to processing', async () => {
    const outcome = await confirm();

    expect(outcome).toMatchObject({ ok: true, replayed: false, late: false });
    expect(rows<Order>('orders')[0].status).toBe('PROCESSING');
    expect(rows<{ supplier_id: string }>('supplier-orders').map((leg) => leg.supplier_id).sort()).toEqual(['s1', 's2']);
    expect(rows('supplier-payables')).toHaveLength(2);
    expect(rows<Payment>('payments')).toEqual([expect.objectContaining({ id: 'pmt1', status: 'CONFIRMED' })]);
  });

  it('tells the buyer and each supplier, and audits the confirmation once', async () => {
    await confirm();

    expect(auditsOf('PAYMENT_CONFIRMED')).toHaveLength(1);
    expect(notices.map((notice) => notice.userId)).toEqual(expect.arrayContaining(['u-buyer', 'u-s1']));
  });

  // covers: AC-4
  it('treats a second confirmation with the same reference as a replay that adds nothing', async () => {
    await confirm();
    const again = await confirm();

    expect(again).toMatchObject({ ok: true, replayed: true });
    expect(rows('supplier-orders')).toHaveLength(2);
    expect(rows('supplier-payables')).toHaveLength(2);
    expect(rows('payments')).toHaveLength(1);
    expect(auditsOf('PAYMENT_CONFIRMED')).toHaveLength(1);
  });

  // covers: AC-4
  it('finishes the work an interrupted confirmation left behind when it is retried', async () => {
    // Claimed and one leg raised, then the process died before the payables.
    store.payments = [attempt({ status: 'CONFIRMED', confirmed_at: new Date().toISOString() })];
    store['supplier-orders'] = [
      { id: 'sup1', order_id: 'o1', supplier_id: 's1', supplier_subtotal: 100, platform_margin: 50 },
    ] as unknown as { id: string }[];

    const retried = await confirm();

    expect(retried).toMatchObject({ ok: true, replayed: true });
    expect(rows<Order>('orders')[0].status).toBe('PROCESSING');
    expect(rows('supplier-orders')).toHaveLength(2);
    expect(rows('supplier-payables')).toHaveLength(2);
  });

  it('refuses a second, different payment on a paid order as a double charge and tells finance', async () => {
    await confirm();
    const second = await confirm({ providerReference: 'REF-2' });

    expect(second).toEqual({ ok: false, reason: 'ALREADY_PAID_DIFFERENTLY' });
    expect(rows('supplier-orders')).toHaveLength(2);
    expect(auditsOf('PAYMENT_REFUSED')).toHaveLength(1);
    expect(notices.map((notice) => notice.userId)).toContain('u-finance');
  });

  // covers: AC-7
  it('reopens an order whose window closed before the payment arrived, and says so', async () => {
    store.orders = [order({ payment_expires_at: anHourAgo() })];

    const outcome = await confirm();

    expect(outcome).toMatchObject({ ok: true, late: true });
    const reopened = rows<Order>('orders')[0];
    expect(reopened.status).toBe('PROCESSING');
    expect(reopened.timeline.map((entry) => entry.label)).toEqual([
      'Order placed, waiting for payment',
      'Cancelled, payment window closed',
      'Payment confirmed late, order reopened',
      'Sourcing from supplier',
    ]);
    expect(auditsOf('PAYMENT_CONFIRMED')[0].detail).toContain('Confirmed after the payment window closed');
  });

  // covers: AC-7
  it('reopens an order the clock already marked cancelled', async () => {
    store.orders = [order({ status: 'CANCELLED', cancel_reason: 'EXPIRED', payment_expires_at: anHourAgo() })];

    const outcome = await confirm();

    expect(outcome).toMatchObject({ ok: true, late: true });
    expect(rows<Order>('orders')[0]).toMatchObject({ status: 'PROCESSING', cancel_reason: null });
  });

  // covers: AC-7
  it('never reopens an order a person cancelled, and sends the money to finance instead', async () => {
    store.orders = [order({ status: 'CANCELLED', cancel_reason: 'CUSTOMER' })];

    const outcome = await confirm();

    expect(outcome).toEqual({ ok: false, reason: 'CANCELLED_BY_PERSON' });
    expect(rows<Order>('orders')[0].status).toBe('CANCELLED');
    expect(rows('supplier-orders')).toHaveLength(0);
    expect(auditsOf('PAYMENT_REFUSED')).toHaveLength(1);
  });

  // covers: AC-9
  it('keeps the supplier chosen at checkout while they can still fulfil', async () => {
    // s3 now outranks s1 on p1, but s1 was chosen at checkout and still can ship.
    await confirm();

    expect(rows<{ supplier_id: string }>('supplier-orders').map((leg) => leg.supplier_id)).toContain('s1');
    expect(rows<{ supplier_id: string }>('supplier-orders').map((leg) => leg.supplier_id)).not.toContain('s3');
  });

  // covers: AC-9
  it('routes to another supplier only when the chosen one can no longer fulfil', async () => {
    store['supplier-offers'] = [offer('s1', 'p1', { stock: 0 }), offer('s3', 'p1'), offer('s2', 'p2')];

    await confirm();

    expect(rows<{ supplier_id: string }>('supplier-orders').map((leg) => leg.supplier_id).sort()).toEqual(['s2', 's3']);
    // The buyer's price is a promise: the line keeps what it was charged.
    expect(rows<OrderItem>('order-items').map((line) => line.line_total)).toEqual([150, 150]);
  });

  // covers: AC-11
  it('confirms a payment of the wrong amount but flags it for finance', async () => {
    const outcome = await confirm({ amount: 250 });

    expect(outcome).toMatchObject({ ok: true });
    expect(rows<Payment>('payments')[0].amount_matches).toBe(false);
    expect(auditsOf('PAYMENT_CONFIRMED')[0].detail).toContain('needs finance');
  });

  it('treats a payment in another currency than the order as a mismatch', async () => {
    await confirm({ currency: 'ZAR' });

    expect(rows<Payment>('payments')[0].amount_matches).toBe(false);
  });

  // Review 2026-11-03: the ledgers book in pula whatever the buyer paid in.
  it('books the supplier legs in pula at the rates the order and its lines were priced at', async () => {
    store.orders = [order({ currency: 'ZAR', buyer_fx_rate: 0.8 })];
    store['order-items'] = [item('i1', 's1', 'p1', { line_total: 200, supplier_cost: 100, fx_rate: 0.5 })];

    await confirm();

    // Gross 200 rand at 0.8 is 160 pula; cost 100 at 0.5 is 50 pula.
    expect(rows('supplier-orders')[0]).toMatchObject({ supplier_subtotal: 50, platform_margin: 110 });
    expect(rows('supplier-payables')[0]).toMatchObject({ amount: 160 });
  });

  it('reports an unknown order without touching anything', async () => {
    expect(await confirm({ orderId: 'nope' })).toEqual({ ok: false, reason: 'NOT_FOUND' });
    expect(rows('supplier-orders')).toHaveLength(0);
  });
});

describe('failPayment', () => {
  const fail = () =>
    failPayment({ orderId: 'o1', provider: 'MOCK', providerReference: 'REF-1', reason: 'Card declined', actor });

  // covers: AC-10
  it('marks the attempt failed and leaves the order waiting for payment', async () => {
    const outcome = await fail();

    expect(outcome).toMatchObject({ ok: true, payment: { status: 'FAILED', failure_reason: 'Card declined' } });
    expect(rows<Order>('orders')[0].status).toBe('AWAITING_PAYMENT');
    expect(rows('supplier-orders')).toHaveLength(0);
    expect(notices).toContainEqual({ userId: 'u-buyer', title: 'Payment did not go through' });
  });

  it('never turns a confirmed payment into a failed one', async () => {
    await confirm();

    expect(await fail()).toEqual({ ok: false, reason: 'ALREADY_CONFIRMED' });
    expect(rows<Payment>('payments')[0].status).toBe('CONFIRMED');
  });

  it('lets the same transaction confirm after it was reported failed, without a duplicate row', async () => {
    await fail();
    const outcome = await confirm();

    expect(outcome).toMatchObject({ ok: true });
    expect(rows<Payment>('payments')).toEqual([expect.objectContaining({ id: 'pmt1', status: 'CONFIRMED' })]);
  });

  it('reports an attempt it cannot find', async () => {
    store.payments = [];

    expect(await fail()).toEqual({ ok: false, reason: 'NOT_FOUND' });
  });
});
