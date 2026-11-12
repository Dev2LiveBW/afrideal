import { describe, expect, it } from 'vitest';

import {
  legForSupplier,
  orderDetailForCustomer,
  orderDetailForSupplier,
  orderForCustomer,
  orderForSupplier,
} from '@/lib/order-privacy';
import type { OrderDetail } from '@/lib/queries';
import type { Order, SupplierOrder } from '@/types';

const order = {
  id: 'o1',
  reference: 'AFD-24810',
  customer_id: 'u1',
  customer_name: 'Mma Dithebe',
  status: 'READY_FOR_COLLECTION',
  subtotal: 137,
  delivery_fee: 45,
  total: 168.3,
  payment_method: 'CARD',
  payment_reference: 'cs_test_123',
  recipient_name: 'Mma Dithebe',
  delivery_phone: '+266 2231 2345',
  delivery_instructions: 'Blue gate',
  delivery_address: 'Plot 12',
  delivery_city: 'Maseru',
  promo_code: 'WELCOME10',
  promo_discount: 13.7,
  promo_discount_pula: 13.7,
  internal_notes: 'Buyer called twice about the gate',
  timeline: [
    { status: 'READY_FOR_COLLECTION', label: 'Ready for collection at locker', at: '2026-11-12T08:00:00.000Z', actor: 'Kabelo', note: 'Locker PIN: 4471' },
  ],
} as unknown as Order;

const leg = (supplierId: string) =>
  ({
    id: `leg-${supplierId}`,
    supplier_id: supplierId,
    status: 'DELIVERED',
    item_ids: [`i-${supplierId}`],
    supplier_subtotal: 82,
    platform_margin: 41.3,
    promo_discount: 13.7,
    supplier: { id: supplierId, contact_email: 'owner@supplier.test', registration_no: 'BW-123' },
    items: [{ id: `i-${supplierId}`, supplier_id: supplierId, unit_price: 168.3, line_total: 168.3, supplier_cost: 82 }],
    payable: { id: `p-${supplierId}`, amount: 137 },
  }) as unknown as OrderDetail['legs'][number];

const detail = {
  order,
  items: [
    { id: 'i-s1', supplier_id: 's1', unit_price: 168.3, line_total: 168.3, supplier_cost: 82, fx_rate: 1, supplier_cost_currency: 'BWP' },
    { id: 'i-s2', supplier_id: 's2', unit_price: 50, line_total: 50, supplier_cost: 20 },
  ],
  payables: [{ id: 'p-s1', supplier_id: 's1' }, { id: 'p-s2', supplier_id: 's2' }],
  payments: [{ id: 'pmt1', amount: 168.3, status: 'CONFIRMED', amount_matches: true, note: 'Matched on the FNB statement' }],
  legs: [leg('s1'), leg('s2')],
} as unknown as OrderDetail;

// ── Suppliers ────────────────────────────────────────────────────────────────

describe('orderForSupplier', () => {
  const seen = orderForSupplier(order);

  it('keeps which order it is, where it is going and how far it has got', () => {
    expect(seen).toMatchObject({ id: 'o1', reference: 'AFD-24810', status: 'READY_FOR_COLLECTION', delivery_city: 'Maseru' });
  });

  it('removes who receives it, how to reach them and everything about the promo', () => {
    for (const key of ['recipient_name', 'delivery_phone', 'delivery_instructions', 'promo_code', 'promo_discount', 'promo_discount_pula']) {
      expect(seen).not.toHaveProperty(key);
    }
  });

  it('shows no customer price and no payment (scope feature 31)', () => {
    for (const key of ['subtotal', 'delivery_fee', 'total', 'payment_method', 'payment_reference']) {
      expect(seen).not.toHaveProperty(key);
    }
  });

  it("removes the team's notes and the buyer's id", () => {
    expect(seen).not.toHaveProperty('internal_notes');
    expect(seen).not.toHaveProperty('customer_id');
  });

  it('keeps the steps but not their notes, which can hold the locker PIN', () => {
    expect(seen.timeline).toEqual([{ status: 'READY_FOR_COLLECTION', label: 'Ready for collection at locker', at: '2026-11-12T08:00:00.000Z' }]);
    expect(JSON.stringify(seen)).not.toContain('4471');
  });

  it('lets no new field through: anything not on the allow list stays private', () => {
    const withExtra = { ...order, some_future_field: 'secret' } as unknown as Order;
    expect(orderForSupplier(withExtra)).not.toHaveProperty('some_future_field');
  });
});

describe('legForSupplier', () => {
  it('removes the margin as well as the share, because each gives away the other', () => {
    const seen = legForSupplier({ id: 'l', supplier_subtotal: 82, platform_margin: 41.3, promo_discount: 13.7 } as SupplierOrder);
    expect(seen).not.toHaveProperty('promo_discount');
    expect(seen).not.toHaveProperty('platform_margin');
    expect(seen).toHaveProperty('supplier_subtotal', 82);
  });
});

describe('orderDetailForSupplier', () => {
  const seen = orderDetailForSupplier(detail, 's1');

  it('keeps only their own lines, leg and payable', () => {
    expect(seen.items.map((item) => item.id)).toEqual(['i-s1']);
    expect(seen.payables.map((record) => record.id)).toEqual(['p-s1']);
    expect(seen.legs.map((entry) => entry.id)).toEqual(['leg-s1']);
  });

  it('sends no payment, which would show what the buyer paid', () => {
    expect(seen.payments).toEqual([]);
  });

  it('shows their lines at their cost, not at what the buyer was charged', () => {
    expect(seen.items[0]).toHaveProperty('supplier_cost', 82);
    expect(seen.items[0]).not.toHaveProperty('unit_price');
    expect(seen.legs[0].items[0]).not.toHaveProperty('unit_price');
  });

  it('leaves no promo figure, margin, buyer price or staff note anywhere in what goes out', () => {
    const body = JSON.stringify(seen);
    for (const text of ['promo', 'platform_margin', '168.3', 'Blue gate', 'called twice', '4471']) expect(body).not.toContain(text);
  });
});

// ── Buyers ───────────────────────────────────────────────────────────────────

describe('orderForCustomer', () => {
  it("keeps the buyer's own order but not the team's notes about it", () => {
    const seen = orderForCustomer(order);
    expect(seen).toHaveProperty('total', 168.3);
    expect(seen).toHaveProperty('recipient_name', 'Mma Dithebe');
    expect(seen).not.toHaveProperty('internal_notes');
  });
});

describe('orderDetailForCustomer', () => {
  const seen = orderDetailForCustomer(detail);

  it('shows every line at the price paid, without who supplies it or at what cost', () => {
    expect(seen.items.map((item) => item.id)).toEqual(['i-s1', 'i-s2']);
    for (const item of seen.items) {
      expect(item).toHaveProperty('unit_price');
      for (const key of ['supplier_id', 'supplier_cost', 'supplier_cost_currency', 'fx_rate']) expect(item).not.toHaveProperty(key);
    }
  });

  it('reduces each leg to how far it has got', () => {
    expect(seen.legs).toEqual([
      { id: 'leg-s1', status: 'DELIVERED', item_ids: ['i-s1'] },
      { id: 'leg-s2', status: 'DELIVERED', item_ids: ['i-s2'] },
    ]);
  });

  it('sends no supplier invoice', () => {
    expect(seen.payables).toEqual([]);
  });

  it("keeps the buyer's payments but not finance's note or its match flag", () => {
    expect(seen.payments[0]).toMatchObject({ id: 'pmt1', amount: 168.3, status: 'CONFIRMED' });
    expect(seen.payments[0]).not.toHaveProperty('note');
    expect(seen.payments[0]).not.toHaveProperty('amount_matches');
  });

  it('leaves no margin, supplier cost, supplier record or staff note in what goes out', () => {
    const body = JSON.stringify(seen);
    for (const text of ['platform_margin', 'supplier_subtotal', 'supplier_cost', 'owner@supplier.test', 'BW-123', 'called twice', 'FNB statement']) {
      expect(body).not.toContain(text);
    }
  });
});
