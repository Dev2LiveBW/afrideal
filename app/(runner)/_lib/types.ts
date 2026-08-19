import type { Order, Shipment, Supplier } from '@/types';

/**
 * The shape `getRunnerWorkspace` decorates a shipment into. Declared here
 * against `@/types` directly — rather than derived from `lib/queries.ts`,
 * which is `server-only` — so client components can import this type without
 * any risk of pulling the JSON-store module into the browser bundle.
 */
export interface DecoratedShipment extends Shipment {
  order: Order | null;
  supplier: Supplier | null;
}
