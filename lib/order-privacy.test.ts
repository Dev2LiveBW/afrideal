import { describe, expect, it } from 'vitest';

import { legForSupplier, orderDetailForSupplier, orderForSupplier } from '@/lib/order-privacy';
import type { OrderDetail } from '@/lib/queries';
import type { Order, SupplierOrder } from '@/types';

const order = {
  id: 'o1',
  subtotal: 137,
  delivery_fee: 45,
  total: 168.3,
  recipient_name: 'Mma Dithebe',
  delivery_phone: '+266 2231 2345',
  delivery_instructions: 'Blue gate',
  promo_code: 'WELCOME10',
  promo_discount: 13.7,
  promo_discount_pula: 13.7,
} as Order;

const leg = (supplierId: string) =>
  ({ id: `leg-${supplierId}`, supplier_id: supplierId, supplier_subtotal: 82, platform_margin: 41.3, promo_discount: 13.7 }) as SupplierOrder;

const FORBIDDEN = ['recipient_name', 'delivery_phone', 'delivery_instructions', 'promo_code', 'promo_discount', 'promo_discount_pula'];

describe('orderForSupplier', () => {
  it('removes who it is for and everything about the promo', () => {
    const seen = orderForSupplier(order);
    for (const key of FORBIDDEN) expect(seen).not.toHaveProperty(key);
  });

  it('shows the total as it would have been, so it does not give the discount away', () => {
    expect(orderForSupplier(order).total).toBe(182);
  });

  it('leaves the total of an order with no code alone', () => {
    expect(orderForSupplier({ ...order, promo_code: undefined, total: 182 }).total).toBe(182);
  });
});

describe('legForSupplier', () => {
  it('removes the margin as well as the share, because each gives away the other', () => {
    const seen = legForSupplier(leg('s1'));
    expect(seen).not.toHaveProperty('promo_discount');
    expect(seen).not.toHaveProperty('platform_margin');
    expect(seen).toHaveProperty('supplier_subtotal', 82);
  });
});

describe('orderDetailForSupplier', () => {
  const detail = {
    order,
    items: [{ id: 'i1', supplier_id: 's1' }, { id: 'i2', supplier_id: 's2' }],
    payables: [{ id: 'p1', supplier_id: 's1' }, { id: 'p2', supplier_id: 's2' }],
    payments: [{ id: 'pmt1', amount: 168.3 }],
    legs: [leg('s1'), leg('s2')],
  } as unknown as OrderDetail;

  it('keeps only their own lines, leg and payable', () => {
    const seen = orderDetailForSupplier(detail, 's1');
    expect(seen.items.map((item) => item.id)).toEqual(['i1']);
    expect(seen.payables.map((record) => record.id)).toEqual(['p1']);
    expect(seen.legs.map((entry) => entry.id)).toEqual(['leg-s1']);
  });

  it('sends no payment, which would show what the buyer paid', () => {
    expect(orderDetailForSupplier(detail, 's1').payments).toEqual([]);
  });

  it('leaves no promo figure anywhere in what goes out', () => {
    const body = JSON.stringify(orderDetailForSupplier(detail, 's1'));
    for (const text of ['promo', 'platform_margin', '168.3', 'Dithebe']) expect(body).not.toContain(text);
  });
});
