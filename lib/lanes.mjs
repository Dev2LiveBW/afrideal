/**
 * Lanes (spec 0009): every order line travels from where the goods are to
 * where the buyer wants them. The market is any-to-any, so "imported" never
 * means "not from Botswana"; it means the goods' country differs from the
 * delivery country. A Gaborone buyer ordering from Gaborone is on a domestic
 * lane; a Maseru buyer ordering from Johannesburg is on a cross-border one.
 *
 * Plain JS so `scripts/seed.mjs` and the app share it, like the price formula.
 */

/**
 * Where an order goes when the buyer has not said. Every buyer is in Botswana
 * until the header's "Deliver to" carries a country (spec 0009, build step 3);
 * this constant is the only place that assumption lives.
 */
export const DEFAULT_DELIVERY_COUNTRY = 'BW';

/** Upper-cased code, or null when there is none to compare. */
function normalise(code) {
  return typeof code === 'string' && code.trim() !== '' ? code.trim().toUpperCase() : null;
}

/**
 * The lane for goods held in one country and delivered to another.
 *
 * A missing goods country is treated as domestic: without it there is nothing
 * to say the goods cross a border, and claiming customs on a guess would be
 * worse than staying quiet.
 *
 * @param {string | null | undefined} goodsCountry  where the goods are
 * @param {string | null | undefined} [deliveryCountry]  where they are going
 * @returns {{ from: string | null, to: string, crossBorder: boolean }}
 */
export function laneFor(goodsCountry, deliveryCountry = DEFAULT_DELIVERY_COUNTRY) {
  const from = normalise(goodsCountry);
  const to = normalise(deliveryCountry) ?? DEFAULT_DELIVERY_COUNTRY;
  return { from, to, crossBorder: from !== null && from !== to };
}

/**
 * Whether goods cross a border on their way to the buyer.
 *
 * @param {string | null | undefined} goodsCountry
 * @param {string | null | undefined} [deliveryCountry]
 * @returns {boolean}
 */
export function isCrossBorder(goodsCountry, deliveryCountry) {
  return laneFor(goodsCountry, deliveryCountry).crossBorder;
}
