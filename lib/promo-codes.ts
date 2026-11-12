import 'server-only';

import { z } from 'zod';

import { readAll } from '@/lib/db';
import type { BuiltLines, OrderLane } from '@/lib/order-lines';
import { allAsDisplayed } from '@/lib/payments/status';
import { evaluatePromo, normaliseCode, paidUsesOf, usedByBuyer } from '@/lib/promo.mjs';

/**
 * A promo date, always stored in UTC. Dates are compared as text against the clock,
 * which only holds if they share one format, so an offset is resolved on the way in.
 */
export const PromoDate = z.string().datetime({ offset: true }).transform((value) => new Date(value).toISOString());

/**
 * A code checked against a priced order, for the quote and the order route.
 *
 * Reads orders as displayed, which is allowed here because this decides nothing
 * about those orders, only whether a new one may use the code. It stays out of
 * `confirmPayment()` (spec 0003).
 */
export async function evaluateCode(input: { code: string; buyerId: string; built: BuiltLines; lane: OrderLane }) {
  const code = normaliseCode(input.code);
  const [promos, orders, payments] = await Promise.all([
    readAll('promo-codes'),
    readAll('orders'),
    readAll('payments'),
  ]);
  const displayed = allAsDisplayed(orders, payments);
  const promo = promos.find((entry) => entry.code === code);

  return {
    code,
    promo,
    payments,
    result: evaluatePromo({
      promo,
      now: new Date().toISOString(),
      paidUses: paidUsesOf(displayed, code),
      usedByBuyer: usedByBuyer(displayed, code, input.buyerId),
      grossPula: input.built.grossPula,
      landedPula: input.built.landedPula,
      rate: input.lane.rate,
      subtotal: input.built.subtotal,
      currency: input.lane.currency,
    }),
  };
}
