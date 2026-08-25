import { z } from 'zod';

import { fail, guard, handled, ok } from '@/lib/api';
import { readAll, update } from '@/lib/db';
import { PayableTransitionError, applyTransition, summarise } from '@/lib/payables';
import { EVENTS, audit } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

/** GET /api/payables - the creditors queue, plus its summary strip. */
export const GET = handled(async (request: Request) => {
  const { actor, response } = await guard(['SUPER_ADMIN', 'OPERATIONS_ADMIN', 'FINANCE_ADMIN']);
  if (response) return response;

  const records = await readAll('supplier-payables');
  const status = new URL(request.url).searchParams.get('status');
  const filtered = status ? records.filter((record) => record.status === status) : records;

  return ok({ records: filtered, summary: summarise(records), actor: actor.role });
});

const BatchSchema = z.object({
  ids: z.array(z.string()).min(1, 'Select at least one supplier invoice.'),
  status: z.enum(['SETTLED', 'CANCELLED']),
  note: z.string().max(400).optional(),
});

/**
 * POST /api/payables - settle or cancel a batch of supplier invoices.
 *
 * Partial success is reported rather than hidden: invoices that could not move
 * come back with their reason, so the operator knows exactly what did and did
 * not happen.
 */
export const POST = handled(async (request: Request) => {
  const { actor, response } = await guard(['SUPER_ADMIN', 'OPERATIONS_ADMIN', 'FINANCE_ADMIN']);
  if (response) return response;

  const parsed = BatchSchema.safeParse(await request.json());
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid batch.', 422);

  const records = await readAll('supplier-payables');
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
        parsed.data.note ?? 'Batch action from the supplier payables queue.',
      );
      await update('supplier-payables', id, updated);
      moved.push(id);
    } catch (error) {
      skipped.push({
        id,
        reason: error instanceof PayableTransitionError ? `Already ${record.status}` : 'Failed',
      });
    }
  }

  if (moved.length > 0) {
    await audit({
      actorId: actor.id,
      actorName: actor.name,
      action:
        parsed.data.status === 'SETTLED' ? EVENTS.PAYABLE_SETTLED : EVENTS.PAYABLE_CANCELLED,
      entity: 'supplier-payable',
      entityId: moved.join(','),
      detail: `Batch ${parsed.data.status.toLowerCase()} of ${moved.length} invoice(s).`,
    });
  }

  return ok({ moved, skipped });
});
