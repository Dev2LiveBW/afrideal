'use client';

import { useDeliverTo } from '@/components/brand/BuyerCurrency';

/**
 * The town the shopper chose in "Deliver to" (spec 0009), for server-rendered
 * panels that quote delivery. The server's first paint already has it from
 * the cookie, so the town never switches after the page loads.
 */
export function DeliverToTown() {
  return <>{useDeliverTo().city}</>;
}
