/**
 * Promo code arithmetic and rules (spec 0011, AC-21 to AC-26).
 *
 * Pure, with no reads, so the quote and the order route work out one discount
 * between them and the two cannot disagree. Plain JS like `lib/currency.mjs`.
 *
 * Everything is decided in pula, from the same rounded figures the ledger books.
 * The discount in the order's currency is then the one true number, rounded down,
 * and the pula figure is always derived from it, so the buyer never gets more
 * than the cap.
 */

import { fromPula, moneyLong, toPula } from './currency.mjs';

export const CODE_PATTERN = /^[A-Z0-9]{4,20}$/;
export const MIN_PERCENT = 1;
export const MAX_PERCENT = 90;

/** One message for both, so codes cannot be probed by what the refusal says. */
export const REFUSED_INVALID = 'That code is not valid.';
export const REFUSED_NOT_STARTED = 'That code is not live yet.';
export const REFUSED_ENDED = 'That code has ended.';
export const REFUSED_USED_UP = 'That code has been used up.';
export const REFUSED_ALREADY_USED = 'You have already used this code.';
export const REFUSED_NO_MARGIN = 'That code cannot be used on this order.';

/** @param {string} code */
export const normaliseCode = (code) => code.trim().toUpperCase();

const nearestCent = (amount) => Math.round(amount * 100) / 100;

/** Rounds down, after clearing floating point noise so 12.3 does not become 12.29. */
const floorCent = (amount) => Math.floor(Math.round(amount * 1e6) / 1e4) / 100;

/**
 * The discount on an order, capped by the percent, the code's maximum and the
 * margin after customs (AC-22).
 *
 * `grossPula` is the booked gross of the whole order, `landedPula` its landed cost
 * including customs, `rate` pula per unit of the order's currency, and `subtotal`
 * the goods in that currency.
 *
 * @param {{ percent: number, maxDiscount: number, grossPula: number, landedPula: number, rate: number, subtotal: number }} input
 * @returns {{ discount: number, discountPula: number, capped: boolean }}
 */
export function promoDiscount({ percent, maxDiscount, grossPula, landedPula, rate, subtotal }) {
  const percentOff = (grossPula * percent) / 100;
  const margin = floorCent(grossPula - landedPula);
  const cap = Math.min(percentOff, maxDiscount, margin);
  const capped = cap < percentOff;

  if (cap <= 0) return { discount: 0, discountPula: 0, capped };

  let discount = Math.min(floorCent(cap / rate), subtotal);
  // Converting back rounds to the cent too, and may land just past the cap.
  if (toPula(discount, rate) > cap) discount = nearestCent(discount - 0.01);

  return { discount, discountPula: toPula(discount, rate), capped };
}

/**
 * Whether a code stands, and the first reason it does not (AC-23).
 *
 * @param {{
 *   promo: import('@/types').PromoCode | null | undefined,
 *   now: string,
 *   paidUses: number,
 *   usedByBuyer: boolean,
 *   grossPula: number,
 *   currency: string,
 * }} input
 * @returns {string | null}
 */
export function promoRefusal({ promo, now, paidUses, usedByBuyer, grossPula, currency }) {
  if (!promo || !promo.active) return REFUSED_INVALID;
  if (now < promo.starts_at) return REFUSED_NOT_STARTED;
  if (now >= promo.ends_at) return REFUSED_ENDED;
  if (promo.usage_limit !== null && paidUses >= promo.usage_limit) return REFUSED_USED_UP;
  if (usedByBuyer) return REFUSED_ALREADY_USED;
  if (grossPula < promo.min_order) {
    return `This code needs at least ${moneyLong(fromPula(promo.min_order, currency), currency)} of goods.`;
  }
  return null;
}

/**
 * The whole decision: refused with a reason, or the discount.
 *
 * @returns {{ ok: true, discount: number, discountPula: number, capped: boolean } | { ok: false, reason: string }}
 */
export function evaluatePromo(input) {
  const refusal = promoRefusal(input);
  if (refusal) return { ok: false, reason: refusal };

  const result = promoDiscount({
    percent: input.promo.percent,
    maxDiscount: input.promo.max_discount,
    grossPula: input.grossPula,
    landedPula: input.landedPula,
    rate: input.rate,
    subtotal: input.subtotal,
  });

  if (result.discount <= 0) return { ok: false, reason: REFUSED_NO_MARGIN };
  return { ok: true, ...result };
}

/**
 * Paid uses of a code (AC-25): orders on it past payment, refunded ones included.
 * Counted from orders rather than stored, so one that expires gives its use back
 * with no write to forget. Pass orders as displayed, so a window that has closed
 * unrecorded reads as cancelled.
 *
 * @param {{ promo_code?: string | null, status: string }[]} orders
 * @param {string} code
 */
export function paidUsesOf(orders, code) {
  return orders.filter(
    (order) => order.promo_code === code && order.status !== 'AWAITING_PAYMENT' && order.status !== 'CANCELLED',
  ).length;
}

/**
 * Whether this buyer has spent the code: a paid order, or one still waiting for
 * payment, which is what stops a second order while the first is open (AC-25).
 *
 * @param {{ promo_code?: string | null, status: string, customer_id: string }[]} orders
 * @param {string} code
 * @param {string} buyerId
 */
export function usedByBuyer(orders, code, buyerId) {
  return orders.some(
    (order) => order.promo_code === code && order.customer_id === buyerId && order.status !== 'CANCELLED',
  );
}

/**
 * What a code is right now, for the admin list. Derived, never stored.
 *
 * @param {import('@/types').PromoCode} promo
 * @param {number} paidUses
 * @param {string} now
 * @returns {'OFF' | 'SCHEDULED' | 'ENDED' | 'USED_UP' | 'LIVE'}
 */
export function promoState(promo, paidUses, now) {
  if (!promo.active) return 'OFF';
  if (now < promo.starts_at) return 'SCHEDULED';
  if (now >= promo.ends_at) return 'ENDED';
  if (promo.usage_limit !== null && paidUses >= promo.usage_limit) return 'USED_UP';
  return 'LIVE';
}

/**
 * The discount shared across an order's supplier legs by gross (AC-26).
 *
 * In order of supplier id, over every leg whether or not it exists yet, so a
 * resumed confirmation gets the same shares. Each rounds down and the last takes
 * the remainder, so they add up exactly and none goes negative.
 *
 * @param {number} discountPula
 * @param {{ supplierId: string, gross: number }[]} legs
 * @returns {Map<string, number>}
 */
export function promoShares(discountPula, legs) {
  const sorted = [...legs].sort((a, b) => a.supplierId.localeCompare(b.supplierId));
  const totalGross = sorted.reduce((sum, leg) => sum + leg.gross, 0);
  const shares = new Map();
  let given = 0;

  sorted.forEach((leg, index) => {
    const last = index === sorted.length - 1;
    const share = last
      ? nearestCent(discountPula - given)
      : totalGross === 0
        ? 0
        : floorCent((discountPula * leg.gross) / totalGross);
    shares.set(leg.supplierId, share);
    given = nearestCent(given + share);
  });

  return shares;
}
