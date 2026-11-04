import { findCollectionPoint } from '@/lib/collection-points';
import type { Order } from '@/types';

/**
 * Where an order is going, as a link to Google Maps (spec 0011, AC-13).
 *
 * The public search URL, which needs no key and sends nothing until the buyer
 * taps it. A locker's address is public. A home is not: a doorstep order stops
 * at the town and country, so `delivery_address` never goes into a link. That
 * field is not even accepted here, which is what keeps the promise.
 */
export function orderMapLink(
  order: Pick<Order, 'delivery_method' | 'collection_point' | 'delivery_city'>,
  countryName: string,
): string {
  const point = order.delivery_method === 'COLLECTION_POINT' ? findCollectionPoint(order.collection_point) : null;
  const query = point
    ? `${point.name}, ${point.address}, ${point.city}, ${countryName}`
    : `${order.delivery_city}, ${countryName}`;

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
