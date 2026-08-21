import { z } from 'zod';

import { fail, guard, handled, ok } from '@/lib/api';
import { findById, readAll, update } from '@/lib/db';
import { PayableTransitionError, applyTransition } from '@/lib/payables';
import { EVENTS, audit, notify } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

const PatchSchema = z.object({
  status: z.enum(['SETTLED', 'CANCELLED', 'ON_HOLD']),
  note: z.string().max(400).optional(),
});

/** PATCH /api/payables/:id — move one supplier invoice through the state machine. */
export const PATCH = handled(async (request: Request, { params }: { params: { id: string } }) => {
  const { actor, response } = await guard([
    'SUPER_ADMIN',
    'OPERATIONS_ADMIN',
    'FINANCE_ADMIN',
    'CUSTOMER',
  ]);
  if (response) return response;

  const parsed = PatchSchema.safeParse(await request.json());
  if (!parsed.success) return fail('Invalid update.', 422);

  const record = await findById('supplier-payables', params.id);
  if (!record) return fail('Supplier invoice not found.', 404);

  // A customer may raise a claim on their own order and nothing else.
  if (actor.role === 'CUSTOMER') {
    const order = await findById('orders', record.order_id);
    if (!order || order.customer_id !== actor.id) return fail('Not your order.', 403);
    if (parsed.data.status !== 'ON_HOLD') return fail('You can only raise a claim here.', 403);
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
    if (error instanceof PayableTransitionError) return fail(error.message, 409);
    throw error;
  }

  await update('supplier-payables', record.id, updated);

  // Keep the order in step with the legs it was split across.
  const legs = (await readAll('supplier-payables')).filter(
    (leg) => leg.order_id === record.order_id,
  );
  const anyOnHold = legs.some((leg) => leg.status === 'ON_HOLD');
  const allSettled = legs.every((leg) => leg.status === 'SETTLED');

  if (anyOnHold) {
    await update('orders', record.order_id, {
      status: 'DISPUTED',
      updated_at: new Date().toISOString(),
    });
  } else if (allSettled) {
    await update('orders', record.order_id, {
      status: 'DELIVERED',
      updated_at: new Date().toISOString(),
    });
  }

  const users = await readAll('users');
  const owner = users.find((user) => user.supplier_id === record.supplier_id);
  if (owner && parsed.data.status === 'SETTLED') {
    await notify({
      userId: owner.id,
      title: 'Invoice settled',
      body: `BWP ${record.amount.toFixed(2)} has been paid out to you.`,
      kind: 'PAYMENT',
    });
  }

  await audit({
    actorId: actor.id,
    actorName: actor.name,
    action:
      parsed.data.status === 'SETTLED'
        ? EVENTS.PAYABLE_SETTLED
        : parsed.data.status === 'CANCELLED'
          ? EVENTS.PAYABLE_CANCELLED
          : EVENTS.DISPUTE_OPENED,
    entity: 'supplier-payable',
    entityId: record.id,
    detail: `${record.status} → ${parsed.data.status} on BWP ${record.amount.toFixed(2)}.`,
  });

  return ok(updated);
});
