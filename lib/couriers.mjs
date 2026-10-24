/**
 * Couriers by route (spec 0008, generalised by spec 0009).
 *
 * A courier lists the routes it serves, each from a country (and, if it only
 * collects there, a town) to a destination town with its own fee rule. An
 * order's lane is offered the couriers whose routes cover it; nothing here
 * assumes a Botswana buyer or a South African origin.
 *
 * Plain JS so the seed and the app share it, like the price formula.
 */

/** @typedef {import('../types').Courier} Courier */
/** @typedef {import('../types').CourierRoute} CourierRoute */

const same = (a, b) =>
  typeof a === 'string' && typeof b === 'string' && a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * The route of one courier that covers a lane, or null.
 *
 * @param {Courier} courier
 * @param {{ fromCountry: string | null, fromCity?: string | null, toCountry: string, toCity: string }} lane
 * @returns {CourierRoute | null}
 */
export function routeFor(courier, lane) {
  if (!courier.active) return null;
  return (
    courier.routes.find(
      (route) =>
        same(route.from.country, lane.fromCountry) &&
        (route.from.city == null || same(route.from.city, lane.fromCity)) &&
        same(route.to.country, lane.toCountry) &&
        same(route.to.city, lane.toCity),
    ) ?? null
  );
}

/**
 * The active couriers that serve a lane, in their listed order, each with the
 * route that covers it.
 *
 * @param {Courier[]} couriers
 * @param {{ fromCountry: string | null, fromCity?: string | null, toCountry: string, toCity: string }} lane
 * @returns {{ courier: Courier, route: CourierRoute }[]}
 */
export function couriersForLane(couriers, lane) {
  return [...couriers]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((courier) => ({ courier, route: routeFor(courier, lane) }))
    .filter((entry) => entry.route !== null);
}

/**
 * The buyer's courier fee on a route for a goods subtotal, in pula.
 *
 * At or below the threshold: the flat fee, or the launch price while it lasts
 * (the difference is AfriDeal's subsidy). Above it: the percentage of the goods
 * subtotal, rounded up to the pula.
 *
 * @param {CourierRoute} route
 * @param {number} subtotal  goods only, in pula
 * @param {Date} [now]
 * @returns {{ fee: number, basis: 'FLAT' | 'PCT', subsidy: number }}
 */
export function courierFee(route, subtotal, now = new Date()) {
  const { threshold, flat, pct, launch_flat: launchFlat, launch_until: launchUntil } = route.fee;
  if (subtotal > threshold) {
    return { fee: Math.ceil(Math.round(subtotal * pct * 100) / 100), basis: 'PCT', subsidy: 0 };
  }
  const launchLive =
    launchFlat != null && (launchUntil == null || now.getTime() < new Date(launchUntil).getTime());
  const fee = launchLive ? launchFlat : flat;
  return { fee, basis: 'FLAT', subsidy: Math.max(0, flat - fee) };
}
