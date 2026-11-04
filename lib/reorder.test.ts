import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { priceLine } from '@/lib/pricing-tiers';
import { reorderLines } from '@/lib/reorder';
import type { CustomerPrice, OrderItem, Product, Supplier, SupplierOffer } from '@/types';

const seed = <T,>(name: string): T[] =>
  JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', `${name}.json`), 'utf8'));

/** A fresh copy of the seed catalogue, so a test can change it freely. */
function world() {
  return {
    products: seed<Product>('products'),
    offers: seed<SupplierOffer>('supplier-offers'),
    suppliers: seed<Supplier>('suppliers'),
    bands: seed<CustomerPrice>('customer-prices'),
    customerType: 'RETAIL' as const,
  };
}

/** A delivered line, with an old price that must never come back. */
const line = (productId: string, variantId: string, qty = 1): OrderItem =>
  ({
    id: `oi-${productId}`,
    product_id: productId,
    variant_id: variantId,
    product_name: `Old name of ${productId}`,
    variant_label: 'Old label',
    emoji: '📦',
    qty,
    unit_price: 1,
    line_total: qty,
  }) as OrderItem;

const MAIZE = line('p008', 'p008v2', 4);
const PAPER = line('p010', 'p010v1', 5);

describe('reorderLines', () => {
  it('prices every line today, never from the old order', () => {
    const base = world();
    const { lines, skipped } = reorderLines({ ...base, items: [MAIZE, PAPER] });

    expect(skipped).toEqual([]);
    expect(lines).toHaveLength(2);

    const product = base.products.find((entry) => entry.id === 'p008')!;
    const today = priceLine(
      base.bands.filter((band) => band.product_id === 'p008'),
      product,
      'p008v2',
      4,
      'RETAIL',
    );
    expect(lines[0]).toMatchObject({ product_id: 'p008', variant_id: 'p008v2', qty: 4, unit_price: today.unit_price });
    expect(lines[0].unit_price).not.toBe(MAIZE.unit_price);
  });

  it('uses the product as it is named today, and routes to a real supplier', () => {
    const base = world();
    const { lines } = reorderLines({ ...base, items: [MAIZE] });
    const product = base.products.find((entry) => entry.id === 'p008')!;
    expect(lines[0].name).toBe(product.name);
    expect(base.suppliers.map((supplier) => supplier.id)).toContain(lines[0].supplier_id);
  });

  it('passes the photograph through when there is one', () => {
    const { lines } = reorderLines({ ...world(), items: [MAIZE], imageUrlOf: (id) => `/photos/${id}.jpg` });
    expect(lines[0].image_url).toBe('/photos/p008.jpg');
  });

  it('leaves out a product no longer sold, and names it', () => {
    const base = world();
    base.products.find((entry) => entry.id === 'p008')!.status = 'ARCHIVED';
    const { lines, skipped } = reorderLines({ ...base, items: [MAIZE, PAPER] });
    expect(lines.map((entry) => entry.product_id)).toEqual(['p010']);
    expect(skipped).toEqual([{ product_id: 'p008', name: 'Old name of p008', note: 'no longer sold' }]);
  });

  it('leaves out a product that has gone from the catalogue', () => {
    const base = world();
    const products = base.products.filter((entry) => entry.id !== 'p008');
    expect(reorderLines({ ...base, products, items: [MAIZE] }).skipped[0].note).toBe('no longer sold');
  });

  it('leaves out a variant that has gone', () => {
    expect(reorderLines({ ...world(), items: [line('p008', 'p008v99')] }).skipped[0].note).toBe('no longer sold');
  });

  it('leaves out a line no offer can hold, though the router would still pick one', () => {
    const base = world();
    base.offers.filter((offer) => offer.product_id === 'p008').forEach((offer) => (offer.stock = 3));
    const { lines, skipped } = reorderLines({ ...base, items: [MAIZE] });
    expect(lines).toEqual([]);
    expect(skipped[0].note).toBe('not in stock for 4');
  });

  it('leaves out a line whose offers are all switched off', () => {
    const base = world();
    base.offers.filter((offer) => offer.product_id === 'p008').forEach((offer) => (offer.active = false));
    expect(reorderLines({ ...base, items: [MAIZE] }).skipped[0].note).toBe('not in stock for 4');
  });

  it('leaves out a supplier product below a raised minimum', () => {
    const base = world();
    const product = base.products.find((entry) => entry.id === 'p008')!;
    product.owner_type = 'SUPPLIER';
    product.moq = 10;
    expect(reorderLines({ ...base, items: [MAIZE] }).skipped[0].note).toBe('now has a minimum order of 10');
  });

  it('leaves out a line now priced by quotation', () => {
    const base = world();
    const { lines, skipped } = reorderLines({ ...base, items: [line('p006', 'p006v3', 150)] });
    expect(lines).toEqual([]);
    expect(skipped[0].note).toBe('now priced by quotation');
  });
});
