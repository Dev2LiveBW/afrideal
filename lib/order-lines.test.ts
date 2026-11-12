import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { buildOrderLines } from '@/lib/order-lines';
import type { CustomerPrice, Product, Supplier, SupplierOffer } from '@/types';

vi.mock('@/lib/db', () => ({ readAll: async () => [] }));
vi.mock('@/lib/countries', () => ({ activeCountries: async () => [] }));

const seed = <T,>(name: string): T[] =>
  JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', `${name}.json`), 'utf8'));

const catalogue = () => ({
  products: seed<Product>('products'),
  offers: seed<SupplierOffer>('supplier-offers'),
  suppliers: seed<Supplier>('suppliers'),
  bands: seed<CustomerPrice>('customer-prices'),
  customerType: 'RETAIL' as const,
});

const SHEA = { product_id: 'p001', variant_id: 'p001v1', qty: 1 };
const LOCAL = { currency: 'BWP', rate: 1, deliveryCountry: 'BW' };

describe('buildOrderLines', () => {
  it('books the goods and their landed cost for the discount to be worked from', () => {
    const built = buildOrderLines({ ...catalogue(), lines: [SHEA], lane: LOCAL });
    expect(built).toMatchObject({ ok: true, subtotal: 137, grossPula: 137, landedPula: 82 });
  });

  it('counts customs in the landed cost, whatever the rate is set to', () => {
    const built = buildOrderLines({ ...catalogue(), lines: [SHEA], lane: { ...LOCAL, deliveryCountry: 'LS' } });
    if (!built.ok) throw new Error(built.error);
    expect(built.landedPula).toBeCloseTo(82 + (built.lines[0]?.item.customs_amount ?? 0), 2);
  });

  it('charges in the buyer\'s currency and books the same goods back in pula', () => {
    const built = buildOrderLines({
      ...catalogue(),
      lines: [SHEA],
      lane: { currency: 'ZAR', rate: 0.8, deliveryCountry: 'BW' },
    });
    if (!built.ok) throw new Error(built.error);
    expect(built.grossPula).toBeCloseTo(built.subtotal * 0.8, 2);
  });

  it('adds a line\'s worth for each line', () => {
    const built = buildOrderLines({
      ...catalogue(),
      lines: [SHEA, { product_id: 'p006', variant_id: 'p006v3', qty: 2 }],
      lane: LOCAL,
    });
    if (!built.ok) throw new Error(built.error);
    expect(built.subtotal).toBe(built.lines[0].item.line_total + built.lines[1].item.line_total);
  });

  it('refuses a product that has gone', () => {
    const built = buildOrderLines({ ...catalogue(), lines: [{ ...SHEA, product_id: 'nope' }], lane: LOCAL });
    expect(built).toMatchObject({ ok: false, status: 422 });
  });

  it('refuses a quantity priced by quotation', () => {
    const built = buildOrderLines({
      ...catalogue(),
      lines: [{ product_id: 'p006', variant_id: 'p006v3', qty: 150 }],
      lane: LOCAL,
    });
    expect(built).toMatchObject({ ok: false, status: 409 });
  });
});
