import 'server-only';

import type { Order, PaymentMethod } from '@/types';

/**
 * How long an order stays payable, per spec 0003.
 *
 * Card and wallet sessions live in minutes, so 30 minutes outlives a hosted
 * gateway session rather than firing before it. A Botswana interbank transfer
 * clears in one to three working days, so 7 days covers a weekend plus a public
 * holiday. One window cannot serve both, which is why this is keyed by method.
 */
const WINDOW_MINUTES: Record<PaymentMethod, number> = {
  DPO_PAY: 30,
  PAYGATE: 30,
  ORANGE_MONEY: 30,
  EFT: 7 * 24 * 60,
};

/**
 * Test only shortcut so the expiry criteria are reachable from `npm run verify`,
 * which talks HTTP and cannot edit a row to backdate it.
 *
 * Ignored in production on purpose: a short window there would expire real
 * orders while their money was still in flight.
 */
function overrideSeconds(): number | null {
  if (process.env.NODE_ENV === 'production') return null;
  const raw = process.env.PAYMENT_WINDOW_SECONDS;
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/** The deadline an order placed at `placedAt` paying by `method` should carry. */
export function paymentExpiresAt(placedAt: string, method: PaymentMethod): string {
  const override = overrideSeconds();
  const ms = override !== null ? override * 1000 : WINDOW_MINUTES[method] * 60 * 1000;
  return new Date(new Date(placedAt).getTime() + ms).toISOString();
}

/**
 * Whether an order's payment window has closed.
 *
 * Deliberately says nothing about payments: a caller that has already loaded
 * them decides what a closed window means, because an order with a confirmed
 * payment is paid whatever its deadline says.
 */
export function windowHasClosed(order: Pick<Order, 'payment_expires_at'>, now = new Date()): boolean {
  return now.getTime() >= new Date(order.payment_expires_at).getTime();
}

/**
 * Whether a payment was claimed after its order's window closed (AC-7).
 *
 * Judged from when the money was claimed, not from when the order is finished:
 * a confirmation interrupted before the deadline and resumed after it is still on
 * time, and one that lands at minute 35 is late even though nothing had written
 * the expiry down yet.
 */
export function claimedAfterWindow(
  order: Pick<Order, 'status' | 'payment_expires_at'>,
  payment: { confirmed_at: string | null },
  now = new Date(),
): boolean {
  if (order.status !== 'AWAITING_PAYMENT') return false;
  const claimedAt = payment.confirmed_at ? new Date(payment.confirmed_at) : now;
  return windowHasClosed(order, claimedAt);
}

/**
 * Whether a production build may use the mock anyway.
 *
 * CI and the Playwright run start `next start`, which is NODE_ENV=production, so
 * without an escape hatch nothing automated could pay at all. The hatch is a
 * deliberate, separately named switch rather than NODE_ENV, and it is ignored on
 * Vercel whatever its value: a deployed site must never be able to mark orders
 * paid through a mock, even if someone copies the variable across.
 */
export function mockAllowedInProduction(): boolean {
  if (process.env.VERCEL) return false;
  return process.env.ALLOW_MOCK_PAYMENTS === '1';
}
