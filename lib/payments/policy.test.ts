import { afterEach, describe, expect, it, vi } from 'vitest';

import { paymentExpiresAt, windowHasClosed } from './policy';

/**
 * The payment window (spec 0003, AC-1).
 *
 * These are the cases `npm run verify` cannot reach. It drives real HTTP, so it
 * can see that an order carries a deadline, but not that the arithmetic per method
 * is right, and not that the test shortcut refuses to apply in production.
 */

const PLACED = '2026-10-06T08:00:00.000Z';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('paymentExpiresAt', () => {
  it('gives a card payment thirty minutes, so our deadline outlives the gateway session · covers AC-1', () => {
    expect(paymentExpiresAt(PLACED, 'DPO_PAY')).toBe('2026-10-06T08:30:00.000Z');
  });

  it('gives PayGate the same thirty minutes · covers AC-1', () => {
    expect(paymentExpiresAt(PLACED, 'PAYGATE')).toBe('2026-10-06T08:30:00.000Z');
  });

  it('treats a wallet like a card, because a wallet prompt also lives in minutes · covers AC-1', () => {
    expect(paymentExpiresAt(PLACED, 'ORANGE_MONEY')).toBe('2026-10-06T08:30:00.000Z');
  });

  it('gives a bank transfer seven days, since a Botswana interbank clear takes days · covers AC-1', () => {
    expect(paymentExpiresAt(PLACED, 'EFT')).toBe('2026-10-13T08:00:00.000Z');
  });

  it('never gives a bank transfer the card window, which would expire real money in flight · covers AC-1', () => {
    expect(paymentExpiresAt(PLACED, 'EFT')).not.toBe(paymentExpiresAt(PLACED, 'DPO_PAY'));
  });
});

describe('the PAYMENT_WINDOW_SECONDS override', () => {
  it('shortens the window outside production, which is what makes expiry testable', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('PAYMENT_WINDOW_SECONDS', '1');

    expect(paymentExpiresAt(PLACED, 'EFT')).toBe('2026-10-06T08:00:01.000Z');
  });

  // The important one. A short window leaking into production would cancel real
  // orders while their money was still on its way.
  it('is ignored in production even when it is set', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('PAYMENT_WINDOW_SECONDS', '1');

    expect(paymentExpiresAt(PLACED, 'EFT')).toBe('2026-10-13T08:00:00.000Z');
  });

  it('ignores a value that is not a positive number rather than producing a bad date', () => {
    vi.stubEnv('NODE_ENV', 'development');

    for (const bad of ['0', '-5', 'soon', '']) {
      vi.stubEnv('PAYMENT_WINDOW_SECONDS', bad);
      expect(paymentExpiresAt(PLACED, 'DPO_PAY')).toBe('2026-10-06T08:30:00.000Z');
    }
  });
});

describe('windowHasClosed', () => {
  it('is false a moment before the deadline', () => {
    const order = { payment_expires_at: '2026-10-06T08:30:00.000Z' };

    expect(windowHasClosed(order, new Date('2026-10-06T08:29:59.999Z'))).toBe(false);
  });

  // Exactly on the boundary counts as closed, so an order cannot sit in a one
  // millisecond state where it is neither payable nor expired.
  it('is true exactly on the deadline', () => {
    const order = { payment_expires_at: '2026-10-06T08:30:00.000Z' };

    expect(windowHasClosed(order, new Date('2026-10-06T08:30:00.000Z'))).toBe(true);
  });

  it('is true after the deadline', () => {
    const order = { payment_expires_at: '2026-10-06T08:30:00.000Z' };

    expect(windowHasClosed(order, new Date('2026-10-06T09:00:00.000Z'))).toBe(true);
  });
});
