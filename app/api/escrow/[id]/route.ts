import { z } from 'zod';

import { fail, guard, handled, ok } from '@/lib/api';
import { findById, readAll, update } from '@/lib/db';
import { EscrowTransitionError, applyTransition } from '@/lib/escrow';
import { EVENTS, audit, notify } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

const PatchSchema = z.object({
  status: z.enum(['RELEASED', 'REFUNDED', 'DISPUTED']),
  note: z.string().max(400).optional(),
});

/** PATCH /api/escrow/:id — move one escrow record through the state machine. */
export const PATCH = handled(async (request: Request, { params }: { params: { id: string } }) => {
  const { actor, response } = await guard(['SUPER_ADMIN', 'OPERATIONS_ADMIN', 'FINANCE_ADMIN', 'CUSTOMER']);
  if (response) return response;

  const parsed = PatchSchema.safeParse(await request.json());
  if (!parsed.success) return fail('Invalid escrow update.', 422);

  const record = await findById('escrow', params.id);
  if (!record) return fail('Escrow record not found.', 404);

  // A customer may raise a dispute on their own order and nothing else.
  if (actor.role === 'CUSTOMER') {
    const order = await findById('orders', record.order_id);
    if (!order || order.customer_id !== actor.id) return fail('Not your order.', 403);
    if (parsed.data.status !== 'DISPUTED') return fail('You can only raise a dispute here.', 403);
  }

  let updated;
  try {
    updated = applyTransition(
      record,
      parsed.data.status,
      actor.name,
      parsed.data.note ?? `Moved to ${parsed.data.status}.`,
    );
  } catch (error) {
    if (error instanceof EscrowTransitionError) return fail(error.message, 409);
    throw error;
  }

  await update('escrow', record.id, updated);

  // Keep the order in step with its escrow legs.
  const legs = (await readAll('escrow')).filter((leg) => leg.order_id === record.order_id);
  const allSettled = legs.every((leg) => leg.status === 'RELEASED' || leg.status === 'REFUNDED');
  const anyDisputed = legs.some((leg) => leg.status === 'DISPUTED');

  if (anyDisputed) {
    await update('orders', record.order_id, { status: 'DISPUTED', updated_at: new Date().toISOString() });
  } else if (allSettled && legs.every((leg) => leg.status === 'RELEASED')) {
    await update('orders', record.order_id, { status: 'DELIVERED', updated_at: new Date().toISOString() });
  }

  const users = await readAll('users');
  const owner = users.find((user) => user.supplier_id === record.supplier_id);
  if (owner && parsed.data.status === 'RELEASED') {
    await notify({
      userId: owner.id,
      title: 'Escrow released',
      body: `BWP ${record.amount.toFixed(2)} has been released to you.`,
      kind: 'ESCROW',
    });
  }

  await audit({
    actorId: actor.id,
    actorName: actor.name,
    action:
      parsed.data.status === 'RELEASED'
        ? EVENTS.ESCROW_RELEASED
        : parsed.data.status === 'REFUNDED'
          ? EVENTS.ESCROW_REFUNDED
          : EVENTS.DISPUTE_OPENED,
    entity: 'escrow',
    entityId: record.id,
    detail: `${record.status} → ${parsed.data.status} on BWP ${record.amount.toFixed(2)}.`,
  });

  return ok(updated);
});
