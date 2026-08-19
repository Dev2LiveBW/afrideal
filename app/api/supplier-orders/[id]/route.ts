import { z } from 'zod';

import { fail, guard, handled, ok } from '@/lib/api';
import { findById, readAll, update } from '@/lib/db';
import { EVENTS, audit, notify } from '@/lib/notifications';
import { selectSupplier } from '@/lib/supplier-selection';
import type { OrderStatus, SupplierOrderStatus } from '@/types';

export const dynamic = 'force-dynamic';

const PatchSchema = z.object({
  status: z
    .enum(['CONFIRMED', 'PREPARING', 'READY_FOR_COLLECTION', 'COLLECTED', 'DELIVERED', 'CANCELLED'])
    .optional(),
  /** Admin override — reassign this leg to a different supplier. */
  supplier_id: z.string().optional(),
});

/** The forward-only path a supplier order may take. */
const NEXT: Record<SupplierOrderStatus, SupplierOrderStatus[]> = {
  AWAITING_CONFIRMATION: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY_FOR_COLLECTION', 'CANCELLED'],
  READY_FOR_COLLECTION: ['COLLECTED'],
  COLLECTED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

const ORDER_STATUS_FOR: Partial<Record<SupplierOrderStatus, OrderStatus>> = {
  CONFIRMED: 'PROCESSING',
  PREPARING: 'PROCESSING',
  READY_FOR_COLLECTION: 'PROCESSING',
  COLLECTED: 'IN_TRANSIT',
  DELIVERED: 'DELIVERED',
};

export const PATCH = handled(async (request: Request, { params }: { params: { id: string } }) => {
  const { actor, response } = await guard(['SUPER_ADMIN', 'OPERATIONS_ADMIN', 'SUPPLIER_OWNER']);
  if (response) return response;

  const parsed = PatchSchema.safeParse(await request.json());
  if (!parsed.success) return fail('Invalid supplier order update.', 422);

  const leg = await findById('supplier-orders', params.id);
  if (!leg) return fail('Supplier order not found.', 404);

  // A supplier can only touch their own legs.
  if (actor.role === 'SUPPLIER_OWNER' && leg.supplier_id !== actor.supplierId) {
    return fail('That order belongs to another supplier.', 403);
  }

  // ── Reassign (admin only) ─────────────────────────────────────────────
  if (parsed.data.supplier_id) {
    if (actor.role === 'SUPPLIER_OWNER') return fail('Suppliers cannot reassign routing.', 403);

    const target = await findById('suppliers', parsed.data.supplier_id);
    if (!target) return fail('Target supplier not found.', 404);
    if (target.status !== 'VERIFIED') return fail('Only verified suppliers can be routed orders.', 409);

    const items = (await readAll('order-items')).filter((item) => leg.item_ids.includes(item.id));
    const offers = await readAll('supplier-offers');

    const newCost = items.reduce((sum, item) => {
      const offer = offers.find(
        (candidate) => candidate.product_id === item.product_id && candidate.supplier_id === target.id,
      );
      return sum + (offer?.supplier_cost ?? item.supplier_cost) * item.qty;
    }, 0);

    const gross = items.reduce((sum, item) => sum + item.line_total, 0);

    const updated = await update('supplier-orders', params.id, {
      supplier_id: target.id,
      supplier_subtotal: newCost,
      platform_margin: gross - newCost,
      auto_selected: false,
      selection_reason: `Manually routed to ${target.name} by ${actor.name}.`,
    });

    // The escrow leg follows the supplier it belongs to.
    const escrowLeg = (await readAll('escrow')).find((record) => record.supplier_order_id === params.id);
    if (escrowLeg) await update('escrow', escrowLeg.id, { supplier_id: target.id });

    for (const item of items) {
      await update('order-items', item.id, { supplier_id: target.id });
    }

    await audit({
      actorId: actor.id,
      actorName: actor.name,
      action: EVENTS.SUPPLIER_OVERRIDDEN,
      entity: 'supplier-order',
      entityId: params.id,
      detail: `Routing moved to ${target.name}.`,
    });

    return ok(updated);
  }

  // ── Advance status ────────────────────────────────────────────────────
  if (!parsed.data.status) return fail('Nothing to update.', 422);

  if (!NEXT[leg.status].includes(parsed.data.status)) {
    return fail(
      `A ${leg.status.toLowerCase().replace(/_/g, ' ')} order cannot move to ${parsed.data.status
        .toLowerCase()
        .replace(/_/g, ' ')}.`,
      409,
    );
  }

  const updated = await update('supplier-orders', params.id, { status: parsed.data.status });

  // Reflect onto the parent order once every leg agrees.
  const siblings = (await readAll('supplier-orders')).filter((sibling) => sibling.order_id === leg.order_id);
  const mapped = ORDER_STATUS_FOR[parsed.data.status];

  if (mapped && siblings.every((sibling) => sibling.status === parsed.data.status)) {
    const order = await findById('orders', leg.order_id);
    if (order && order.status !== 'DISPUTED' && order.status !== 'CANCELLED') {
      const now = new Date().toISOString();
      await update('orders', leg.order_id, {
        status: mapped,
        updated_at: now,
        timeline: [
          ...order.timeline,
          {
            status: parsed.data.status!,
            label: `Supplier marked ${parsed.data.status!.toLowerCase().replace(/_/g, ' ')}`,
            at: now,
            actor: actor.name,
          },
        ],
      });

      await notify({
        userId: order.customer_id,
        title: 'Order update',
        body: `${order.reference} is now ${mapped.toLowerCase().replace(/_/g, ' ')}.`,
        kind: 'ORDER',
      });
    }
  }

  return ok(updated);
});
