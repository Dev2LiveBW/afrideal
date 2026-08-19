import { z } from 'zod';

import { fail, guard, handled, ok } from '@/lib/api';
import { findById, update } from '@/lib/db';
import { applyTransition } from '@/lib/escrow';
import { audit, notify } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

const PatchSchema = z.object({
  status: z.enum(['UNDER_REVIEW', 'RESOLVED_CUSTOMER', 'RESOLVED_SUPPLIER']),
  resolution_note: z.string().max(1000).optional(),
});

/**
 * PATCH /api/disputes/:id
 *
 * Resolving a dispute is the moment the frozen escrow moves: in the customer's
 * favour it refunds, in the supplier's it releases. Both happen here so the two
 * records can never disagree about who got the money.
 */
export const PATCH = handled(async (request: Request, { params }: { params: { id: string } }) => {
  const { actor, response } = await guard(['SUPER_ADMIN', 'OPERATIONS_ADMIN']);
  if (response) return response;

  const parsed = PatchSchema.safeParse(await request.json());
  if (!parsed.success) return fail('Invalid dispute update.', 422);

  const dispute = await findById('disputes', params.id);
  if (!dispute) return fail('Dispute not found.', 404);
  if (dispute.status.startsWith('RESOLVED')) return fail('That dispute is already resolved.', 409);

  const now = new Date().toISOString();
  const resolving = parsed.data.status !== 'UNDER_REVIEW';

  if (resolving) {
    const escrowRecord = await findById('escrow', dispute.escrow_id);
    if (escrowRecord && escrowRecord.status === 'DISPUTED') {
      const outcome = parsed.data.status === 'RESOLVED_CUSTOMER' ? 'REFUNDED' : 'RELEASED';
      await update(
        'escrow',
        escrowRecord.id,
        applyTransition(
          escrowRecord,
          outcome,
          actor.name,
          parsed.data.resolution_note ?? `Dispute resolved in the ${
            parsed.data.status === 'RESOLVED_CUSTOMER' ? 'customer' : 'supplier'
          }'s favour.`,
        ),
      );
    }

    await update('orders', dispute.order_id, {
      status: parsed.data.status === 'RESOLVED_CUSTOMER' ? 'CANCELLED' : 'DELIVERED',
      updated_at: now,
    });

    await notify({
      userId: dispute.customer_id,
      title: 'Dispute resolved',
      body:
        parsed.data.status === 'RESOLVED_CUSTOMER'
          ? 'Your dispute was upheld and the funds have been refunded to you.'
          : 'After review the order was found to have been fulfilled and the supplier has been paid.',
      kind: 'DISPUTE',
    });
  }

  const updated = await update('disputes', params.id, {
    status: parsed.data.status,
    resolved_at: resolving ? now : null,
    resolution_note: parsed.data.resolution_note ?? null,
  });

  await audit({
    actorId: actor.id,
    actorName: actor.name,
    action: 'DISPUTE_UPDATED',
    entity: 'dispute',
    entityId: params.id,
    detail: `${dispute.status} → ${parsed.data.status}.`,
  });

  return ok(updated);
});
