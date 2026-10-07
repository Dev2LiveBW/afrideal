import { describe, expect, it } from 'vitest';

import { asDisplayed, effectiveOrderStatus, hasExpired, isBillable } from './status';
import type { Order, Payment } from '@/types';

/**
 * What a reader is shown, and what counts as revenue (spec 0003, AC-5).
 *
 * The third clause of the expiry rule is the reason this file exists. An order can
 * hold a CONFIRMED payment while still sitting at AWAITING_PAYMENT, because
 * confirmPayment() flips the order last as its completion marker. If a passed
 * deadline were enough on its own, a genuinely paid order would read as cancelled.
 */

const NOW = new Date('2026-10-06T12:00:00.000Z');

function order(over: Partial<Order> = {}): Order {
  return {
    id: 'o001',
    reference: 'AFD-24810',
    customer_id: 'u006',
    customer_name: 'Thabo Modise',
    status: 'AWAITING_PAYMENT',
    subtotal: 284,
    delivery_fee: 45,
    total: 329,
    payment_method: 'DPO_PAY',
    payment_reference: null,
    payment_expires_at: '2026-10-06T11:00:00.000Z',
    cancel_reason: null,
    delivery_address: 'Plot 1',
    delivery_city: 'Gaborone',
    placed_at: '2026-10-06T10:30:00.000Z',
    updated_at: '2026-10-06T10:30:00.000Z',
    timeline: [],
    internal_notes: '',
    ...over,
  };
}

function payment(over: Partial<Payment> = {}): Payment {
  return {
    id: 'pmt001',
    order_id: 'o001',
    provider: 'MOCK',
    provider_reference: 'MOCK-o001-abc',
    status: 'CONFIRMED',
    amount: 329,
    amount_matches: true,
    created_at: '2026-10-06T10:30:00.000Z',
    confirmed_at: '2026-10-06T10:35:00.000Z',
    failure_reason: null,
    note: null,
    ...over,
  };
}

describe('hasExpired', () => {
  it('is true for an unpaid order past its deadline · covers AC-5', () => {
    expect(hasExpired(order(), [], NOW)).toBe(true);
  });

  it('is false for an unpaid order still inside its window · covers AC-5', () => {
    expect(hasExpired(order({ payment_expires_at: '2026-10-06T13:00:00.000Z' }), [], NOW)).toBe(false);
  });

  // The clause that stops a paid order reading as dead. confirmPayment() writes
  // the payment before it moves the order, so this state is reachable in reality.
  it('is false when a confirmed payment exists, even past the deadline · covers AC-5', () => {
    expect(hasExpired(order(), [payment()], NOW)).toBe(false);
  });

  it('ignores a confirmed payment belonging to a different order · covers AC-5', () => {
    expect(hasExpired(order(), [payment({ order_id: 'o999' })], NOW)).toBe(true);
  });

  it('is not rescued by a started or failed attempt, because neither is money · covers AC-5', () => {
    expect(hasExpired(order(), [payment({ status: 'STARTED' })], NOW)).toBe(true);
    expect(hasExpired(order(), [payment({ status: 'FAILED' })], NOW)).toBe(true);
  });

  it('never calls an order expired once it has moved past awaiting payment · covers AC-5', () => {
    for (const status of ['PROCESSING', 'IN_TRANSIT', 'DELIVERED', 'DISPUTED', 'CANCELLED'] as const) {
      expect(hasExpired(order({ status }), [], NOW)).toBe(false);
    }
  });
});

describe('effectiveOrderStatus', () => {
  it('reports CANCELLED for an expired order without touching the stored row · covers AC-5', () => {
    const stored = order();

    expect(effectiveOrderStatus(stored, [], NOW)).toBe('CANCELLED');
    expect(stored.status).toBe('AWAITING_PAYMENT');
  });

  it('passes every other status through unchanged · covers AC-5', () => {
    expect(effectiveOrderStatus(order({ status: 'DELIVERED' }), [], NOW)).toBe('DELIVERED');
  });
});

describe('asDisplayed', () => {
  it('marks an expired order as cancelled by the clock, not by a person · covers AC-5', () => {
    const shown = asDisplayed(order(), [], NOW);

    expect(shown.status).toBe('CANCELLED');
    expect(shown.cancel_reason).toBe('EXPIRED');
  });

  // Identity matters: callers map whole lists through this, and copying every row
  // on every read would be waste.
  it('returns the very same object when nothing changed', () => {
    const stored = order({ status: 'DELIVERED' });

    expect(asDisplayed(stored, [], NOW)).toBe(stored);
  });
});

describe('isBillable', () => {
  it('counts an order that is being fulfilled', () => {
    expect(isBillable(order({ status: 'PROCESSING' }), [], NOW)).toBe(true);
  });

  // The bug a second model found: billable excluded CANCELLED but not
  // AWAITING_PAYMENT, so every abandoned checkout inflated GMV and margin.
  it('does not count an order that is still waiting for payment · covers AC-5', () => {
    const inWindow = order({ payment_expires_at: '2026-10-06T13:00:00.000Z' });

    expect(isBillable(inWindow, [], NOW)).toBe(false);
  });

  it('does not count an expired order · covers AC-5', () => {
    expect(isBillable(order(), [], NOW)).toBe(false);
  });

  it('does not count a cancelled order', () => {
    expect(isBillable(order({ status: 'CANCELLED' }), [], NOW)).toBe(false);
  });

  it('counts an order whose payment confirmed but whose status has not caught up · covers AC-5', () => {
    expect(isBillable(order({ status: 'PROCESSING' }), [payment()], NOW)).toBe(true);
  });
});
