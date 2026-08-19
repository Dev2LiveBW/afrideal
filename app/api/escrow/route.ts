import { z } from 'zod';

import { fail, guard, handled, ok } from '@/lib/api';
import { readAll, update } from '@/lib/db';
import { EscrowTransitionError, applyTransition, summarise } from '@/lib/escrow';
import { EVENTS, audit } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

/** GET /api/escrow — the queue, plus its summary strip. */
export const GET = handled(async (request: Request) => {
  const { actor, response } = await guard(['SUPER_ADMIN', 'OPERATIONS_ADMIN', 'FINANCE_ADMIN']);
  if (response) return response;

  const records = await readAll('escrow');
  const status = new URL(request.url).searchParams.get('status');
  const filtered = status ? records.filter((record) => record.status === status) : records;

  return ok({ records: filtered, summary: summarise(records), actor: actor.role });
});

const BatchSchema = z.object({
  ids: z.array(z.string()).min(1, 'Select at least one escrow record.'),
  status: z.enum(['RELEASED', 'REFUNDED']),
  note: z.string().max(400).optional(),
});

/**
 * POST /api/escrow — batch release or refund.
 *
 * Partial success is reported rather than hidden: records that could not move
 * come back with their reason so the operator knows exactly what did and did
 * not happen.
 */
export const POST = handled(async (request: Request) => {
  const { actor, response } = await guard(['SUPER_ADMIN', 'OPERATIONS_ADMIN', 'FINANCE_ADMIN']);
  if (response) return response;

  const parsed = BatchSchema.safeParse(await request.json());
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid batch.', 422);

  const records = await readAll('escrow');
  const moved: string[] = [];
  const skipped: { id: string; reason: string }[] = [];

  for (const id of parsed.data.ids) {
    const record = records.find((candidate) => candidate.id === id);
    if (!record) {
      skipped.push({ id, reason: 'Not found' });
      continue;
    }

    try {
      const updated = applyTransition(
        record,
        parsed.data.status,
        actor.name,
        parsed.data.note ?? 'Batch action from the escrow queue.',
      );
      await update('escrow', id, updated);
      moved.push(id);
    } catch (error) {
      skipped.push({
        id,
        reason: error instanceof EscrowTransitionError ? `Already ${record.status}` : 'Failed',
      });
    }
  }

  if (moved.length > 0) {
    await audit({
      actorId: actor.id,
      actorName: actor.name,
      action: parsed.data.status === 'RELEASED' ? EVENTS.ESCROW_RELEASED : EVENTS.ESCROW_REFUNDED,
      entity: 'escrow',
      entityId: moved.join(','),
      detail: `Batch ${parsed.data.status.toLowerCase()} of ${moved.length} record(s).`,
    });
  }

  return ok({ moved, skipped });
});
