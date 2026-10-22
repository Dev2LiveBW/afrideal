/**
 * The buyer's currency (spec 0009, answer 1): buyers in Botswana pay in pula;
 * buyers in South Africa, Lesotho and Eswatini pay in rand. Every stored price
 * is pula (the base); a buyer sees and is charged the converted figure.
 *
 * The rate is spec 0007's `FX_RATES` (pula per unit of a currency), still the
 * owner's temporary 1:1, so today the figures match and only the currency
 * changes. When the rate moves, this is the one place conversion happens.
 *
 * Plain JS so the order route, the storefront and the seed share it.
 */

import { FX_RATES } from './pricing-formula.mjs';

/** The currency every price is stored and every supplier is paid in. */
export const BASE_CURRENCY = 'BWP';

/** The shelf-tag symbol per currency; others fall back to their code. */
const SYMBOL = { BWP: 'P', ZAR: 'R' };

/**
 * A pula amount in another currency, rounded up to the cent so a rounding
 * error never undercharges.
 *
 * @param {number} amountPula
 * @param {string | null | undefined} currency
 * @returns {number}
 */
export function fromPula(amountPula, currency) {
  if (!currency || currency === BASE_CURRENCY) return amountPula;
  const pulaPerUnit = FX_RATES[currency] ?? 1;
  return Math.ceil(Math.round((amountPula / pulaPerUnit) * 1e6) / 1e4) / 100;
}

const number = new Intl.NumberFormat('en-BW', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * `BWP 420.00`, `ZAR 420.00`: the long form used in summaries and ledgers.
 *
 * @param {number} amount  already in `currency`
 * @param {string} [currency]
 */
export function moneyLong(amount, currency = BASE_CURRENCY) {
  const body = `${currency} ${number.format(Math.abs(amount))}`;
  return amount < 0 ? `-${body}` : body;
}

/**
 * `P420`, `R1,299.50`: the shelf tag.
 *
 * @param {number} amount  already in `currency`
 * @param {string} [currency]
 */
export function moneyTag(amount, currency = BASE_CURRENCY) {
  const symbol = SYMBOL[currency] ?? `${currency} `;
  return `${symbol}${amount.toLocaleString('en-BW', {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}
