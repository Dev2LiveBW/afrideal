import { z } from 'zod';

import { fail, guard, handled, ok } from '@/lib/api';
import { findById, readAll, update } from '@/lib/db';
import { EVENTS, audit, notify } from '@/lib/notifications';
import { markCollected } from '@/lib/shipments';
import type { ShipmentStatus } from '@/types';

export const dynamic = 'force-dynamic';

const PatchSchema = z.object({
  status: z.enum(['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'FAILED']),
  runner_id: z.string().optional(),
  locker_code: z.string().optional(),
});

const NEXT: Record<ShipmentStatus, ShipmentStatus[]> = {
  UNASSIGNED: ['ASSIGNED'],
  ASSIGNED: ['PICKED_UP', 'FAILED'],
  PICKED_UP: ['IN_TRANSIT', 'FAILED'],
  IN_TRANSIT: ['DELIVERED', 'FAILED'],
  DELIVERED: [],
  FAILED: [],
};

/** PATCH /api/shipments/:id - accept a job, then move it through to delivered. */
export const PATCH = handled(async (request: Request, { params }: { params: { id: string } }) => {
  const { actor, response } = await guard(['RUNNER', 'SUPER_ADMIN', 'OPERATIONS_ADMIN']);
  if (response) return response;

  const parsed = PatchSchema.safeParse(await request.json());
  if (!parsed.success) return fail('Invalid shipment update.', 422);

  const shipment = await findById('shipments', params.id);
  if (!shipment) return fail('Shipment not found.', 404);

  if (actor.role === 'RUNNER' && shipment.runner_id && shipment.runner_id !== actor.runnerId) {
    return fail('That job is assigned to another runner.', 403);
  }

  if (!NEXT[shipment.status].includes(parsed.data.status)) {
    return fail(`A ${shipment.status.toLowerCase()} job cannot move to ${parsed.data.status.toLowerCase()}.`, 409);
  }

  // A collection point drop off must carry the locker's real code: it is the PIN
  // the buyer is sent to open the locker. Checked before anything is written.
  const lockerCode = parsed.data.locker_code?.trim() ?? '';
  if (parsed.data.status === 'DELIVERED' && !lockerCode) {
    const target = await findById('orders', shipment.order_id);
    if (target?.delivery_method === 'COLLECTION_POINT') {
      return fail('Enter the locker code before dropping off at a collection point.', 422);
    }
  }

  const now = new Date().toISOString();
  const updated = await update('shipments', params.id, {
    status: parsed.data.status,
    runner_id: parsed.data.runner_id ?? shipment.runner_id ?? actor.runnerId,
    delivered_at: parsed.data.status === 'DELIVERED' ? now : shipment.delivered_at,
  });

  if (parsed.data.status === 'PICKED_UP') {
    await markCollected(shipment, actor);
  }

  if (parsed.data.status === 'DELIVERED') {
    // Pay the runner and advance the supplier leg.
    const runnerId = updated?.runner_id;
    if (runnerId) {
      const runner = await findById('runners', runnerId);
      if (runner) {
        await update('runners', runnerId, {
          deliveries_completed: runner.deliveries_completed + 1,
          earnings_mtd: runner.earnings_mtd + shipment.payout,
          earnings_total: runner.earnings_total + shipment.payout,
        });
      }
    }

    await update('supplier-orders', shipment.supplier_order_id, { status: 'DELIVERED' });

    const order = await findById('orders', shipment.order_id);
    if (order && order.status !== 'DISPUTED') {
      const legs = (await readAll('supplier-orders')).filter((leg) => leg.order_id === order.id);
      if (legs.every((leg) => leg.status === 'DELIVERED')) {
        const isCollectionPoint = order.delivery_method === 'COLLECTION_POINT';
        const targetStatus = isCollectionPoint ? 'READY_FOR_COLLECTION' : 'DELIVERED';
        const note = isCollectionPoint
          ? `Locker PIN: ${lockerCode}`
          : undefined;

        await update('orders', order.id, {
          status: targetStatus,
          updated_at: now,
          timeline: [
            ...order.timeline,
            {
              status: targetStatus,
              label: isCollectionPoint ? 'Ready for collection at locker' : 'Delivered',
              at: now,
              actor: actor.name,
              ...(note ? { note } : {}),
            },
          ],
        });
      }

      const isCollectionPoint = order.delivery_method === 'COLLECTION_POINT';
      await notify({
        userId: order.customer_id,
        title: isCollectionPoint ? 'Ready for collection' : 'Delivered',
        body: isCollectionPoint
          ? `${order.reference} is ready for collection at ${order.collection_point || 'your locker'}. Locker PIN: ${lockerCode}.`
          : `${order.reference} was delivered. Confirm receipt to close the order.`,
        kind: 'ORDER',
      });
    }

    await audit({
      actorId: actor.id,
      actorName: actor.name,
      action: EVENTS.SHIPMENT_DELIVERED,
      entity: 'shipment',
      entityId: params.id,
      detail: `Delivered to ${shipment.dropoff_name}.`,
    });
  }

  return ok(updated);
});
