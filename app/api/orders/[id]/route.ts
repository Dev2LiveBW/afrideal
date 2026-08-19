import { z } from 'zod';

import { fail, guard, handled, ok } from '@/lib/api';
import { findById, insert, nextId, readAll, update } from '@/lib/db';
import { applyTransition } from '@/lib/escrow';
import { EVENTS, audit, notify } from '@/lib/notifications';
import { getOrderDetail } from '@/lib/queries';
import type { Dispute } from '@/types';

export const dynamic = 'force-dynamic';

export const GET = handled(async (_request: Request, { params }: { params: { id: string } }) => {
  const { actor, response } = await guard();
  if (response) return response;

  const detail = await getOrderDetail(params.id);
  if (!detail) return fail('Order not found.', 404);

  if (actor.role === 'CUSTOMER' && detail.order.customer_id !== actor.id) {
    return fail('Not your order.', 403);
  }

  if (actor.role === 'SUPPLIER_OWNER') {
    const mine = detail.legs.some((leg) => leg.supplier_id === actor.supplierId);
    if (!mine) return fail('That order does not include your goods.', 403);

    // A supplier sees only their own leg of a split order.
    return ok({ ...detail, legs: detail.legs.filter((leg) => leg.supplier_id === actor.supplierId) });
  }

  return ok(detail);
});

const PatchSchema = z.object({
  action: z.enum(['CONFIRM_DELIVERY', 'RAISE_DISPUTE', 'CANCEL', 'ADD_NOTE']),
  reason: z.string().max(120).optional(),
  detail: z.string().max(1000).optional(),
  note: z.string().max(2000).optional(),
});

export const PATCH = handled(async (request: Request, { params }: { params: { id: string } }) => {
  const { actor, response } = await guard();
  if (response) return response;

  const parsed = PatchSchema.safeParse(await request.json());
  if (!parsed.success) return fail('Invalid order action.', 422);

  const order = await findById('orders', params.id);
  if (!order) return fail('Order not found.', 404);

  const isOwner = order.customer_id === actor.id;
  const isStaff = ['SUPER_ADMIN', 'OPERATIONS_ADMIN', 'FINANCE_ADMIN'].includes(actor.role);
  if (!isOwner && !isStaff) return fail('Not your order.', 403);

  const now = new Date().toISOString();
  const legs = (await readAll('escrow')).filter((record) => record.order_id === params.id);

  switch (parsed.data.action) {
    // ── Customer confirms receipt → every held leg releases ──────────────
    case 'CONFIRM_DELIVERY': {
      for (const leg of legs) {
        if (leg.status !== 'HELD') continue;
        await update(
          'escrow',
          leg.id,
          applyTransition(leg, 'RELEASED', actor.name, 'Customer confirmed delivery.'),
        );
      }

      const updated = await update('orders', params.id, {
        status: 'DELIVERED',
        updated_at: now,
        timeline: [
          ...order.timeline,
          { status: 'DELIVERED', label: 'Delivery confirmed by customer', at: now, actor: actor.name },
          { status: 'RELEASED', label: 'Escrow released to supplier', at: now },
        ],
      });

      await audit({
        actorId: actor.id,
        actorName: actor.name,
        action: EVENTS.ESCROW_RELEASED,
        entity: 'order',
        entityId: params.id,
        detail: `${order.reference} confirmed delivered; ${legs.length} escrow leg(s) released.`,
      });

      return ok(updated);
    }

    // ── Customer raises a dispute → legs freeze ──────────────────────────
    case 'RAISE_DISPUTE': {
      if (!parsed.data.reason) return fail('Tell us what went wrong.', 422);

      const frozen = [];
      for (const leg of legs) {
        if (leg.status !== 'HELD') continue;
        await update(
          'escrow',
          leg.id,
          applyTransition(leg, 'DISPUTED', actor.name, parsed.data.reason),
        );
        frozen.push(leg);
      }

      if (frozen.length === 0) return fail('This order has no funds left in escrow to dispute.', 409);

      const dispute: Dispute = {
        id: await nextId('disputes', 'dp'),
        order_id: params.id,
        escrow_id: frozen[0].id,
        customer_id: order.customer_id,
        customer_name: order.customer_name,
        supplier_id: frozen[0].supplier_id,
        reason: parsed.data.reason,
        detail: parsed.data.detail ?? '',
        status: 'OPEN',
        opened_at: now,
        sla_due_at: new Date(Date.now() + 5 * 86_400_000).toISOString(),
        resolved_at: null,
        resolution_note: null,
      };

      await insert('disputes', dispute);

      await update('orders', params.id, {
        status: 'DISPUTED',
        updated_at: now,
        timeline: [
          ...order.timeline,
          { status: 'DISPUTED', label: 'Dispute raised — escrow frozen', at: now, actor: actor.name },
        ],
      });

      const staff = (await readAll('users')).filter((user) =>
        ['SUPER_ADMIN', 'OPERATIONS_ADMIN'].includes(user.role),
      );
      for (const member of staff) {
        await notify({
          userId: member.id,
          title: 'New dispute raised',
          body: `${order.reference} — ${parsed.data.reason}. Five-day SLA clock started.`,
          kind: 'DISPUTE',
        });
      }

      return ok(dispute, { status: 201 });
    }

    case 'CANCEL': {
      if (order.status !== 'PENDING') {
        return fail('Only an unconfirmed order can be cancelled here.', 409);
      }

      for (const leg of legs) {
        if (leg.status !== 'HELD') continue;
        await update('escrow', leg.id, applyTransition(leg, 'REFUNDED', actor.name, 'Order cancelled.'));
      }

      const updated = await update('orders', params.id, {
        status: 'CANCELLED',
        updated_at: now,
        timeline: [...order.timeline, { status: 'CANCELLED', label: 'Cancelled', at: now, actor: actor.name }],
      });

      return ok(updated);
    }

    case 'ADD_NOTE': {
      if (!isStaff) return fail('Internal notes are staff-only.', 403);
      return ok(await update('orders', params.id, { internal_notes: parsed.data.note ?? '' }));
    }
  }
});
