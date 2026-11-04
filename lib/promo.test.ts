import { describe, expect, it } from 'vitest';

import { toPula } from '@/lib/currency.mjs';
import {
  REFUSED_ALREADY_USED,
  REFUSED_ENDED,
  REFUSED_INVALID,
  REFUSED_NOT_STARTED,
  REFUSED_NO_MARGIN,
  REFUSED_USED_UP,
  evaluatePromo,
  normaliseCode,
  paidUsesOf,
  promoDiscount,
  promoRefusal,
  promoShares,
  promoState,
  usedByBuyer,
} from '@/lib/promo.mjs';
import type { PromoCode } from '@/types';

const NOW = '2026-11-04T08:00:00.000Z';

const code = (overrides: Partial<PromoCode> = {}): PromoCode => ({
  id: 'prm1',
  code: 'WELCOME10',
  percent: 10,
  max_discount: 50,
  min_order: 0,
  starts_at: '2026-01-01T00:00:00.000Z',
  ends_at: '2027-01-01T00:00:00.000Z',
  usage_limit: null,
  active: true,
  created_by: 'u1',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const order = { percent: 10, maxDiscount: 50, grossPula: 200, landedPula: 100, rate: 1, subtotal: 200 };

describe('promoDiscount', () => {
  it('takes the percent off the goods', () => {
    expect(promoDiscount(order)).toEqual({ discount: 20, discountPula: 20, capped: false });
  });

  it('stops at the maximum discount', () => {
    expect(promoDiscount({ ...order, maxDiscount: 15 })).toEqual({ discount: 15, discountPula: 15, capped: true });
  });

  it('stops at the margin, so no order sells below landed cost', () => {
    const result = promoDiscount({ ...order, percent: 90, maxDiscount: 1000, landedPula: 150 });
    expect(result).toEqual({ discount: 50, discountPula: 50, capped: true });
  });

  it('gives nothing when there is no margin, or a negative one', () => {
    expect(promoDiscount({ ...order, landedPula: 200 }).discount).toBe(0);
    expect(promoDiscount({ ...order, landedPula: 250 }).discount).toBe(0);
  });

  it('rounds the margin down, so half a cent never tips an order below cost', () => {
    const result = promoDiscount({ ...order, percent: 90, maxDiscount: 1000, grossPula: 10.01, landedPula: 10.004, subtotal: 10.01 });
    expect(result.discount).toBe(0);
  });

  it('never gives more than the goods', () => {
    expect(promoDiscount({ ...order, percent: 90, maxDiscount: 1000, landedPula: 0, subtotal: 100 }).discount).toBe(100);
  });

  it.each([0.8, 1.25, 0.97, 1.13, 3])('keeps the booked figure within the cap at a rate of %s', (rate) => {
    const grossPula = 123.45;
    const landedPula = 100;
    const subtotal = Math.ceil((grossPula / rate) * 100) / 100;

    const { discount, discountPula } = promoDiscount({ percent: 90, maxDiscount: 1000, grossPula, landedPula, rate, subtotal });

    expect(discount).toBeGreaterThan(0);
    expect(discountPula).toBe(toPula(discount, rate));
    expect(discountPula).toBeLessThanOrEqual(23.45);
  });

  it('converts at the rate: a rand buyer at 0.8 gets more rand for the same pula', () => {
    expect(promoDiscount({ ...order, rate: 0.8, subtotal: 250 })).toMatchObject({ discount: 25, discountPula: 20 });
  });
});

describe('promoRefusal', () => {
  const input = { promo: code(), now: NOW, paidUses: 0, usedByBuyer: false, grossPula: 200, currency: 'BWP' };

  it('passes a live code', () => {
    expect(promoRefusal(input)).toBeNull();
  });

  it('says the same for an unknown code and a switched off one', () => {
    expect(promoRefusal({ ...input, promo: undefined })).toBe(REFUSED_INVALID);
    expect(promoRefusal({ ...input, promo: code({ active: false }) })).toBe(REFUSED_INVALID);
  });

  it('refuses outside the dates, with the end itself counted as ended', () => {
    expect(promoRefusal({ ...input, promo: code({ starts_at: '2026-12-01T00:00:00.000Z' }) })).toBe(REFUSED_NOT_STARTED);
    expect(promoRefusal({ ...input, promo: code({ ends_at: NOW }) })).toBe(REFUSED_ENDED);
  });

  it('refuses at the total limit, and allows one below it', () => {
    expect(promoRefusal({ ...input, promo: code({ usage_limit: 3 }), paidUses: 3 })).toBe(REFUSED_USED_UP);
    expect(promoRefusal({ ...input, promo: code({ usage_limit: 3 }), paidUses: 2 })).toBeNull();
  });

  it('refuses a buyer who has used it', () => {
    expect(promoRefusal({ ...input, usedByBuyer: true })).toBe(REFUSED_ALREADY_USED);
  });

  it("names the minimum in the buyer's currency", () => {
    const refusal = promoRefusal({ ...input, promo: code({ min_order: 500 }), currency: 'ZAR' });
    expect(refusal).toContain('ZAR 500.00');
  });

  it('accepts an order exactly at the minimum', () => {
    expect(promoRefusal({ ...input, promo: code({ min_order: 200 }) })).toBeNull();
  });
});

describe('evaluatePromo', () => {
  const input = {
    promo: code({ percent: 90, max_discount: 1000 }),
    now: NOW,
    paidUses: 0,
    usedByBuyer: false,
    grossPula: 200,
    landedPula: 200,
    rate: 1,
    subtotal: 200,
    currency: 'BWP',
  };

  it('refuses a code the margin leaves nothing to give', () => {
    expect(evaluatePromo(input)).toEqual({ ok: false, reason: REFUSED_NO_MARGIN });
  });

  it('gives the capped discount otherwise', () => {
    expect(evaluatePromo({ ...input, landedPula: 150 })).toEqual({ ok: true, discount: 50, discountPula: 50, capped: true });
  });
});

describe('use counting', () => {
  const orders = [
    { promo_code: 'A', status: 'PROCESSING', customer_id: 'u1' },
    { promo_code: 'A', status: 'REFUNDED', customer_id: 'u2' },
    { promo_code: 'A', status: 'AWAITING_PAYMENT', customer_id: 'u3' },
    { promo_code: 'A', status: 'CANCELLED', customer_id: 'u4' },
    { promo_code: 'B', status: 'DELIVERED', customer_id: 'u5' },
  ];

  it('counts paid and refunded orders, not unpaid or cancelled ones', () => {
    expect(paidUsesOf(orders, 'A')).toBe(2);
  });

  it('holds a code against a buyer with an unpaid order, and gives it back on cancelling', () => {
    expect(usedByBuyer(orders, 'A', 'u3')).toBe(true);
    expect(usedByBuyer(orders, 'A', 'u4')).toBe(false);
    expect(usedByBuyer(orders, 'A', 'u5')).toBe(false);
  });
});

describe('promoState', () => {
  it('derives the state', () => {
    expect(promoState(code(), 0, NOW)).toBe('LIVE');
    expect(promoState(code({ active: false }), 0, NOW)).toBe('OFF');
    expect(promoState(code({ starts_at: '2026-12-01T00:00:00.000Z' }), 0, NOW)).toBe('SCHEDULED');
    expect(promoState(code({ ends_at: '2026-02-01T00:00:00.000Z' }), 0, NOW)).toBe('ENDED');
    expect(promoState(code({ usage_limit: 1 }), 1, NOW)).toBe('USED_UP');
  });
});

describe('promoShares', () => {
  const total = (shares: Map<string, number>) => [...shares.values()].reduce((sum, share) => sum + share, 0);

  it('shares by gross and adds up exactly', () => {
    const shares = promoShares(100, [
      { supplierId: 's2', gross: 200 },
      { supplierId: 's1', gross: 100 },
    ]);
    expect(shares.get('s1')).toBe(33.33);
    expect(shares.get('s2')).toBe(66.67);
    expect(total(shares)).toBeCloseTo(100, 10);
  });

  it('gives the same shares whatever order the legs arrive in', () => {
    const legs = [
      { supplierId: 's1', gross: 137 },
      { supplierId: 's2', gross: 411 },
      { supplierId: 's3', gross: 91 },
    ];
    expect([...promoShares(77.77, legs)].sort()).toEqual([...promoShares(77.77, [...legs].reverse())].sort());
  });

  it('never goes negative on a small discount over many legs', () => {
    const legs = Array.from({ length: 7 }, (_, index) => ({ supplierId: `s${index}`, gross: 100 }));
    const shares = promoShares(0.05, legs);
    expect(Math.min(...shares.values())).toBeGreaterThanOrEqual(0);
    expect(total(shares)).toBeCloseTo(0.05, 10);
  });

  it('gives a lone leg all of it', () => {
    expect(promoShares(12.34, [{ supplierId: 's1', gross: 50 }]).get('s1')).toBe(12.34);
  });
});

describe('normaliseCode', () => {
  it('trims and upper cases', () => {
    expect(normaliseCode('  welcome10 ')).toBe('WELCOME10');
  });
});
