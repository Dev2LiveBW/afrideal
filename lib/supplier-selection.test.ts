import { describe, expect, it } from 'vitest';

import type { Product, Supplier, SupplierOffer } from '@/types';

import { goodsCountries, goodsCountryOf, routeLine } from './supplier-selection';

const supplier = (id: string, country: string, overrides: Partial<Supplier> = {}): Supplier =>
  ({
    id,
    name: id,
    country,
    city: '',
    status: 'VERIFIED',
    rating: 4,
    reliability_score: 80,
    ...overrides,
  }) as Supplier;

const offer = (id: string, productId: string, supplierId: string, overrides: Partial<SupplierOffer> = {}): SupplierOffer => ({
  id,
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

const product = (id: string, overrides: Partial<Product> = {}): Product =>
  ({ id, name: id, category_id: 'c1', owner_type: 'AFRIDEAL', supplier_id: null, ...overrides }) as Product;

// Naledi holds stock in Gaborone; Joburg Hair is the stronger supplier on paper.
const NALEDI = supplier('naledi', 'BW');
const JOBURG = supplier('joburg', 'ZA', { reliability_score: 98, rating: 5 });
const PENDING = supplier('pending', 'LS', { status: 'PENDING', reliability_score: 100, rating: 5 });
const SUSPENDED = supplier('suspended', 'BW', { status: 'SUSPENDED' });
const SUPPLIERS = [NALEDI, JOBURG, PENDING, SUSPENDED];

describe('routeLine', () => {
  it('routes an AfriDeal product to the best ranked supplier', () => {
    const shea = product('p1');
    const offers = [offer('o1', 'p1', 'naledi'), offer('o2', 'p1', 'joburg')];

    expect(routeLine(shea, offers, SUPPLIERS)?.supplier.id).toBe('joburg');
  });

  it('keeps a supplier’s own product with that supplier even when another scores higher', () => {
    const own = product('p1', { owner_type: 'SUPPLIER', supplier_id: 'naledi' });
    const offers = [offer('o1', 'p1', 'naledi'), offer('o2', 'p1', 'joburg')];

    expect(routeLine(own, offers, SUPPLIERS)?.supplier.id).toBe('naledi');
  });

  it('keeps a supplier’s own product with its owner while the owner has an offer, even out of stock', () => {
    const own = product('p1', { owner_type: 'SUPPLIER', supplier_id: 'naledi' });
    const offers = [offer('o1', 'p1', 'naledi', { stock: 0 }), offer('o2', 'p1', 'joburg')];

    expect(routeLine(own, offers, SUPPLIERS, 5)?.supplier.id).toBe('naledi');
  });

  it('falls back to another supplier when the owner’s offer is inactive', () => {
    const own = product('p1', { owner_type: 'SUPPLIER', supplier_id: 'naledi' });
    const offers = [offer('o1', 'p1', 'naledi', { active: false }), offer('o2', 'p1', 'joburg')];

    expect(routeLine(own, offers, SUPPLIERS)?.supplier.id).toBe('joburg');
  });

  it('falls back to another supplier when the owner is suspended', () => {
    const own = product('p1', { owner_type: 'SUPPLIER', supplier_id: 'suspended' });
    const offers = [offer('o1', 'p1', 'suspended'), offer('o2', 'p1', 'naledi')];

    expect(routeLine(own, offers, SUPPLIERS)?.supplier.id).toBe('naledi');
  });

  it('prefers a lower ranked supplier that can cover the quantity over one that cannot', () => {
    const shea = product('p1');
    const offers = [offer('o1', 'p1', 'naledi', { stock: 20 }), offer('o2', 'p1', 'joburg', { stock: 3 })];

    expect(routeLine(shea, offers, SUPPLIERS, 10)?.supplier.id).toBe('naledi');
  });

  it('ignores offers for other products and from unverified suppliers', () => {
    const shea = product('p1');
    const offers = [offer('o1', 'p2', 'joburg'), offer('o2', 'p1', 'pending'), offer('o3', 'p1', 'naledi')];

    expect(routeLine(shea, offers, SUPPLIERS)?.supplier.id).toBe('naledi');
  });

  it('returns null when nobody can supply the product', () => {
    expect(routeLine(product('p1'), [offer('o1', 'p1', 'pending')], SUPPLIERS)).toBeNull();
    expect(routeLine(product('p1'), [], SUPPLIERS)).toBeNull();
  });
});

describe('goodsCountryOf', () => {
  // covers: AC-3 (the goods' country is where the supplier holds them, not where they were made)
  it('is the routed supplier’s country, not the product’s country of origin', () => {
    const shea = product('p1', { country_of_origin: 'ZA', owner_type: 'SUPPLIER', supplier_id: 'naledi' });
    const offers = [offer('o1', 'p1', 'naledi'), offer('o2', 'p1', 'joburg')];

    expect(goodsCountryOf(shea, offers, SUPPLIERS)).toBe('BW');
  });

  it('follows the quantity to the supplier that can ship it', () => {
    const shea = product('p1');
    const offers = [offer('o1', 'p1', 'naledi', { stock: 20 }), offer('o2', 'p1', 'joburg', { stock: 3 })];

    expect(goodsCountryOf(shea, offers, SUPPLIERS, 1)).toBe('ZA');
    expect(goodsCountryOf(shea, offers, SUPPLIERS, 10)).toBe('BW');
  });

  it('is null when nobody can supply the product', () => {
    expect(goodsCountryOf(product('p1'), [], SUPPLIERS)).toBeNull();
  });
});

describe('goodsCountries', () => {
  it('maps every product id to where its goods are held', () => {
    const products = [product('p1'), product('p2'), product('p3')];
    const offers = [offer('o1', 'p1', 'naledi'), offer('o2', 'p2', 'joburg')];

    expect(goodsCountries(products, offers, SUPPLIERS)).toEqual({ p1: 'BW', p2: 'ZA', p3: null });
  });

  it('is empty for an empty cart', () => {
    expect(goodsCountries([], [], SUPPLIERS)).toEqual({});
  });
});
