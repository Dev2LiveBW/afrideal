import { z } from 'zod';

import { fail, guard, handled, ok } from '@/lib/api';
import { executeRefund } from '@/lib/refunds';

export const dynamic = 'force-dynamic';

const RefundSchema = z.object({
  order_id: z.string().min(1, 'Order ID is required.'),
  amount: z.number().positive('Refund amount must be positive.').optional(),
  gateway_reference: z.string().max(120).optional(),
  reason: z.string().max(500).optional(),
});

/**
 * POST /api/payables/refund
 *
 * Finance admin / Super admin records an external gateway refund.
 * Transitions order to REFUNDED, reverses or credits supplier payables,
 * writes to immutable audit log, and notifies stakeholders.
 */
export const POST = handled(async (request: Request) => {
  const { actor, response } = await guard(['FINANCE_ADMIN', 'SUPER_ADMIN']);
  if (response) return response;

  const body = await request.json().catch(() => ({}));
  const parsed = RefundSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? 'Invalid refund request.', 422);
  }

  const result = await executeRefund({
    orderId: parsed.data.order_id,
    amount: parsed.data.amount,
    gatewayReference: parsed.data.gateway_reference,
    reason: parsed.data.reason,
    actor: {
      id: actor.id,
      name: actor.name,
      role: actor.role,
    },
  });

  if (!result.ok) {
    return fail(result.reason ?? 'Failed to execute refund.', 409);
  }

  return ok({
    order: result.order,
    payables_adjusted: result.payablesAdjusted,
    credit_notes_created: result.creditNotesCreated,
  });
});
