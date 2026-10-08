import 'server-only';

import { windowHasClosed } from '@/lib/payments/policy';
import type { Order, OrderStatus, Payment } from '@/types';

/**
 * What an order's status looks like to a reader (spec 0003, AC-5).
 *
 * An unpaid order past its deadline is cancelled in substance before anything has
 * written that down. Rather than have every GET perform a write, one helper
 * decides and every display surface asks it. The cancellation is persisted later,
 * the first time a payment path touches the order.
 *
 * ## Why reads must not write
 *
 * There are about sixteen places that read an order. Making each of them a writer
 * would mean a page render could block on a lock, and two concurrent readers would
 * race to cancel the same order and write two timeline entries.
 *
 * ## Why this must never be used in a write path
 *
 * `confirmPayment()` tells an order the clock cancelled apart from one a person
 * cancelled, and it does that from the stored `status` and `cancel_reason`. If a
 * write path saw the effective status instead, an expired order that has not been
 * persisted yet would look CANCELLED with no reason, be read as a deliberate
 * cancellation, and have a real payment refused. Display only.
 */

/**
 * Whether an order is effectively expired: unpaid, past its deadline, and with no
 * confirmed payment behind it.
 *
 * The last clause matters more than it looks. `confirmPayment()` flips the order
 * to PROCESSING last, as its completion marker, so a run interrupted part way
 * leaves a CONFIRMED payment on an order still at AWAITING_PAYMENT. Without this
 * check a passed deadline would show that order as cancelled when it is paid for.
 */
export function hasExpired(order: Order, payments: Payment[], now = new Date()): boolean {
  if (order.status !== 'AWAITING_PAYMENT') return false;
  if (!windowHasClosed(order, now)) return false;
  return !payments.some((row) => row.order_id === order.id && row.status === 'CONFIRMED');
}

/** The status a reader should be shown. Identical to the stored one unless expired. */
export function effectiveOrderStatus(
  order: Order,
  payments: Payment[],
  now = new Date(),
): OrderStatus {
  return hasExpired(order, payments, now) ? 'CANCELLED' : order.status;
}

/**
 * The order as a reader should see it.
 *
 * Returns the same object when nothing changed, so a caller can rely on identity
 * and nothing is copied needlessly.
 */
export function asDisplayed(order: Order, payments: Payment[], now = new Date()): Order {
  if (!hasExpired(order, payments, now)) return order;
  return { ...order, status: 'CANCELLED', cancel_reason: 'EXPIRED' };
}

/** The whole list as readers should see it. */
export function allAsDisplayed(orders: Order[], payments: Payment[], now = new Date()): Order[] {
  return orders.map((order) => asDisplayed(order, payments, now));
}

/**
 * Whether an order counts towards revenue.
 *
 * Cancelled orders were already excluded. Unpaid ones were not, which meant an
 * abandoned checkout inflated GMV, margin and the average order value until
 * somebody cancelled it by hand. An order earns its place in the numbers when its
 * money has arrived, not when its basket was submitted.
 */
export function isBillable(order: Order, payments: Payment[], now = new Date()): boolean {
  const status = effectiveOrderStatus(order, payments, now);
  return status !== 'CANCELLED' && status !== 'AWAITING_PAYMENT';
}

/** Revenue bearing orders out of a list, in one call. */
export function billableOnly(orders: Order[], payments: Payment[], now = new Date()): Order[] {
  return orders.filter((order) => isBillable(order, payments, now));
}
