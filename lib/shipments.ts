import { findById, insert, nextId, readAll, update } from '@/lib/db';
import { EVENTS, audit, notifyMany } from '@/lib/notifications';
import type { Order, Shipment, SupplierOrder } from '@/types';

/**
 * The hand-off from supplier to runner.
 *
 * A supplier marking their part of an order "ready for collection" opens a
 * runner job (a shipment with no runner) that every runner sees in their
 * pool; the runner picking it up marks the part collected and, once every
 * part of the order is on its way, the order in transit. Delivery is handled
 * in app/api/shipments/[id]/route.ts.
 */

type Actor = { id: string; name: string };

/**
 * What a runner earns for one pickup: the buyer's flat delivery fee, split
 * evenly across the order's pickups (BWP 45 for a one-supplier order, 22.50
 * each for two). AfriDeal keeps nothing on delivery. Product owner decision,
 * 2026-10-06.
 */
export function runnerPayout(order: Pick<Order, 'delivery_fee'>, pickups: number): number {
  return Math.round((order.delivery_fee / Math.max(1, pickups)) * 100) / 100;
}

/**
 * Open the runner job for a supplier's part of an order, once. Returns the
 * existing job if one is already open for this part.
 */
export async function openJobForLeg(leg: SupplierOrder, actor: Actor): Promise<Shipment | null> {
  const existing = (await readAll('shipments')).find((shipment) => shipment.supplier_order_id === leg.id);
  if (existing) return existing;

  const [order, supplier, legs] = await Promise.all([
    findById('orders', leg.order_id),
    findById('suppliers', leg.supplier_id),
    readAll('supplier-orders'),
  ]);
  if (!order || !supplier) return null;

  const pickups = legs.filter((other) => other.order_id === order.id && other.status !== 'CANCELLED').length;
  const payout = runnerPayout(order, pickups);

  const job = await insert('shipments', {
    id: await nextId('shipments', 'sh'),
    order_id: order.id,
    supplier_order_id: leg.id,
    runner_id: null,
    status: 'UNASSIGNED',
    pickup_name: supplier.name,
    pickup_address: `${supplier.city} depot`,
    dropoff_name: order.customer_name,
    dropoff_address: `${order.delivery_address}, ${order.delivery_city}`,
    // Not measured yet: there is no geocoding. The runner screens hide a 0.
    distance_km: 0,
    payout,
    created_at: new Date().toISOString(),
    delivered_at: null,
  });

  const online = (await readAll('runners')).filter((runner) => runner.online);
  await notifyMany(
    online.map((runner) => runner.user_id),
    { title: 'New job available', body: `Pickup at ${supplier.name}, ${job.pickup_address}, for ${order.reference}.`, kind: 'ORDER' },
  );
  await audit({
    actorId: actor.id,
    actorName: actor.name,
    action: EVENTS.SHIPMENT_CREATED,
    entity: 'shipment',
    entityId: job.id,
    detail: `${order.reference} ready for collection at ${supplier.name}; pays BWP ${payout.toFixed(2)}.`,
  });

  return job;
}

/**
 * A runner has picked up a supplier's part of an order: mark the part
 * collected, and the order collected and in transit once every part is.
 */
export async function markCollected(shipment: Shipment, actor: Actor): Promise<void> {
  const leg = await findById('supplier-orders', shipment.supplier_order_id);
  if (leg && leg.status === 'READY_FOR_COLLECTION') {
    await update('supplier-orders', leg.id, { status: 'COLLECTED' });
  }

  const order = await findById('orders', shipment.order_id);
  if (!order || order.status === 'DISPUTED' || order.status === 'CANCELLED' || order.status === 'IN_TRANSIT') return;

  const legs = (await readAll('supplier-orders')).filter((other) => other.order_id === order.id && other.status !== 'CANCELLED');
  if (!legs.every((other) => other.status === 'COLLECTED' || other.status === 'DELIVERED')) return;

  const now = new Date().toISOString();
  await update('orders', order.id, {
    status: 'IN_TRANSIT',
    updated_at: now,
    timeline: [
      ...order.timeline,
      { status: 'COLLECTED', label: 'Collected by the runner', at: now, actor: actor.name },
      { status: 'IN_TRANSIT', label: 'Out for delivery', at: now, actor: actor.name },
    ],
  });
  await notifyMany([order.customer_id], {
    title: 'On the way',
    body: `${order.reference} has been collected and is on its way to you.`,
    kind: 'ORDER',
  });
}
