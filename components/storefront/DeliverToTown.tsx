'use client';

import { useEffect, useState } from 'react';

import { DEFAULT_DELIVER_TO, useAfriDealStore } from '@/store/useAfriDealStore';

/**
 * The town the shopper chose in "Deliver to" (spec 0009), for server-rendered
 * panels that quote delivery. Read after hydration, like the header, so the
 * server's first paint and the persisted choice never disagree.
 */
export function DeliverToTown() {
  const deliverTo = useAfriDealStore((state) => state.deliverTo);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return <>{mounted ? deliverTo.city : DEFAULT_DELIVER_TO.city}</>;
}
