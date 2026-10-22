/**
 * The collection point lockers a buyer can choose at checkout (scope feature 10).
 *
 * One list, read by both checkout (to show the fee) and the orders API (to charge
 * it). They used to keep their own copies, and the copies disagreed: checkout
 * showed BWP 30 for Francistown and BWP 35 for Maun while the server charged BWP 25
 * for every locker, so a buyer approved one total and was charged another.
 *
 * Plain data with no server imports, so the client component can use it too.
 * The lockers and fees are placeholders until the client confirms the real list.
 */

export type CollectionPoint = {
  id: string;
  name: string;
  address: string;
  city: string;
  /** The locker's country (spec 0009): an order collected here is delivered to it. */
  country: string;
  /** Delivery fee in BWP for an order collected here. */
  fee: number;
  blurb: string;
};

export const COLLECTION_POINTS: readonly CollectionPoint[] = [
  {
    id: 'gaborone-central-locker',
    name: 'Gaborone Central Locker',
    address: 'Station Mall, Plot 4931',
    city: 'Gaborone',
    country: 'BW',
    fee: 25,
    blurb: '24/7 Smart Locker pickup (BWP 25.00)',
  },
  {
    id: 'francistown-main-mall',
    name: 'Francistown Main Mall Locker',
    address: 'Blue Jacket St, Main Mall',
    city: 'Francistown',
    country: 'BW',
    fee: 30,
    blurb: '24/7 Smart Locker pickup (BWP 30.00)',
  },
  {
    id: 'maun-airport-locker',
    name: 'Maun Airport Locker',
    address: 'Airport Road',
    city: 'Maun',
    country: 'BW',
    fee: 35,
    blurb: 'Smart Locker pickup 06:00 - 22:00 (BWP 35.00)',
  },
];

/** The locker a request names, by name or id. Null when it is not on the list. */
export function findCollectionPoint(nameOrId: string | null | undefined): CollectionPoint | null {
  if (!nameOrId) return null;
  return COLLECTION_POINTS.find((point) => point.name === nameOrId || point.id === nameOrId) ?? null;
}
