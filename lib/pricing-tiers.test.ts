import { describe, expect, it, vi } from 'vitest';

import type { CustomerPrice, MarginRule, Product, Supplier, SupplierOffer } from '@/types';

import { findMarginAlerts, offerLandedCost } from './pricing-tiers';

// Customs is 0% in production for now (CUSTOMS_RATE), which would make a
// cross-border line and a domestic one cost the same. A 10% rate here makes the
// difference visible, so these tests prove who pays customs, not the rate.
vi.mock('./pricing-formula.mjs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./pricing-formula.mjs')>();
  return {
    ...actual,
    landedCost: (args: Parameters<typeof actual.landedCost>[0]) => actual.landedCost({ ...args, customsRate: 0.1 }),
  };
});

const offer = (supplierId: string, overrides: Partial<SupplierOffer> = {}): SupplierOffer => ({
  id: `o-${supplierId}`,
  product_id: 'p1',
  supplier_id: supplierId,
  supplier_cost: 85,
  stock: 50,
  fulfilment_days: 3,
  moq: 1,
  last_updated: '2026-10-01T00:00:00.000Z',
  active: true,
  ...overrides,
});

describe('offerLandedCost', () => {
  it('adds customs when the goods cross a border', () => {
    expect(offerLandedCost(offer('s1'), null, true)).toEqual({ cost: 85, customs: 8.5, landed: 93.5 });
  });

  it('adds no customs when the goods stay in the buyer’s country', () => {
    expect(offerLandedCost(offer('s1'), null, false)).toEqual({ cost: 85, customs: 0, landed: 85 });
  });

  it('costs the band’s length where the offer prices lengths separately', () => {
    const wig = offer('s1', { variant_costs: [{ variant_id: 'v22', cost: 120 }] });

    expect(offerLandedCost(wig, 'v22', false).cost).toBe(120);
    expect(offerLandedCost(wig, 'v-unknown', false).cost).toBe(85);
  });
});

describe('findMarginAlerts', () => {
  const NOW = new Date('2026-11-01T00:00:00.000Z');
  const product = { id: 'p1', name: 'Shea butter', category_id: 'c1' } as Product;
  const band = {
    id: 'cp1',
    product_id: 'p1',
    variant_id: null,
    customer_type: 'RETAIL',
    pricing_tier: 'RETAIL',
    minimum_quantity: 1,
    maximum_quantity: null,
    unit_price: 100,
    status: 'ACTIVE',
    effective_from: '2026-01-01T00:00:00.000Z',
    effective_to: null,
  } as CustomerPrice;
  const rule = {
    id: 'r1',
    category_id: 'c1',
    customer_type: 'RETAIL',
    pricing_tier: 'RETAIL',
    logistics_cost: 0,
    gateway_rate: 0,
    minimum_margin_pct: 15,
    active: true,
  } as MarginRule;
  const supplier = (id: string, country: string) => ({ id, country }) as Supplier;

  // covers: AC-3 (customs follows the supplier's country, against the pula ladder's Botswana lane)
  it('raises no alert for a Botswana supplier, whose goods pay no customs to a Botswana buyer', () => {
    const alerts = findMarginAlerts([band], [offer('gab')], [product], [rule], [supplier('gab', 'BW')], NOW);

    expect(alerts).toEqual([]);
  });

  it('raises an alert when customs on a foreign supplier’s goods takes the margin under the floor', () => {
    const alerts = findMarginAlerts([band], [offer('jhb')], [product], [rule], [supplier('jhb', 'ZA')], NOW);

    expect(alerts).toHaveLength(1);
    expect(alerts[0].actual_margin_pct).toBeCloseTo(6.5);
    expect(alerts[0].supplier_cost).toBe(85);
  });

  it('treats an offer whose supplier is unknown as domestic rather than guessing a border', () => {
    const alerts = findMarginAlerts([band], [offer('gone')], [product], [rule], [], NOW);

    expect(alerts).toEqual([]);
  });

  it('judges a product by its most expensive landed offer', () => {
    const offers = [offer('gab'), offer('jhb')];
    const suppliers = [supplier('gab', 'BW'), supplier('jhb', 'ZA')];

    expect(findMarginAlerts([band], offers, [product], [rule], suppliers, NOW)).toHaveLength(1);
  });
});
