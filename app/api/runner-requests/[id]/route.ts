import { z } from 'zod';

import { fail, guard, handled, ok } from '@/lib/api';
import { findById, readAll, update } from '@/lib/db';
import { EVENTS, audit, notify } from '@/lib/notifications';
import { RequestTransitionError, advance, quoteTotal } from '@/lib/runner-requests';
import type { RunnerRequestStatus } from '@/types';

export const dynamic = 'force-dynamic';

const PatchSchema = z.object({
  status: z.enum([
    'ACCEPTED',
    'SOURCING',
    'QUOTED',
    'APPROVED',
    'DELIVERING',
    'CONFIRMED',
    'CANCELLED',
  ]),
  /** Required when moving to QUOTED. */
  unit_price: z.coerce.number().min(1).optional(),
  found_at: z.string().max(160).optional(),
  condition: z.string().max(160).optional(),
  note: z.string().max(600).optional(),
});

/**
 * Which side of the conversation may make each move.
 *
 * The split matters more here than in an ordinary order. A runner can say what
 * something costs but cannot agree to it on the buyer's behalf, and a buyer can
 * approve a price but cannot declare that the goods were found. Each party can
 * only assert what they are actually in a position to know.
 */
const RUNNER_MOVES: RunnerRequestStatus[] = ['ACCEPTED', 'SOURCING', 'QUOTED', 'DELIVERING'];
const CUSTOMER_MOVES: RunnerRequestStatus[] = ['APPROVED', 'CONFIRMED', 'CANCELLED'];

export const PATCH = handled(async (request: Request, { params }: { params: { id: string } }) => {
  const { actor, response } = await guard();
  if (response) return response;

  const parsed = PatchSchema.safeParse(await request.json());
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid update.', 422);

  const record = await findById('runner-requests', params.id);
  if (!record) return fail('Request not found.', 404);

  const target = parsed.data.status;
  const isStaff = ['SUPER_ADMIN', 'OPERATIONS_ADMIN'].includes(actor.role);

  if (actor.role === 'RUNNER') {
    if (!RUNNER_MOVES.includes(target)) return fail('A runner cannot make that move.', 403);
    if (record.runner_id != null && record.runner_id !== actor.runnerId) {
      return fail('Another runner is already on this request.', 403);
    }
  } else if (actor.role === 'CUSTOMER') {
    if (record.customer_id !== actor.id) return fail('Not your request.', 403);
    if (!CUSTOMER_MOVES.includes(target)) return fail('Only a runner can do that.', 403);
  } else if (!isStaff) {
    return fail('Your role cannot perform that action.', 403);
  }

  // A quote is a real figure or it is nothing.
  if (target === 'QUOTED' && parsed.data.unit_price == null) {
    return fail('Give the price you found before sending it for approval.', 422);
  }

  const patch: Parameters<typeof advance>[3] = {};

  if (target === 'ACCEPTED' && actor.role === 'RUNNER') {
    const runners = await readAll('runners');
    const runner = runners.find((entry) => entry.id === actor.runnerId);
    patch.runner_id = actor.runnerId;
    patch.runner_name = runner?.name ?? actor.name;
  }

  if (target === 'QUOTED') {
    const unitPrice = parsed.data.unit_price as number;
    const { serviceFee, total } = quoteTotal(unitPrice, record.quantity);
    patch.quote = {
      unit_price: unitPrice,
      service_fee: serviceFee,
      total,
      found_at: parsed.data.found_at ?? 'Sourced locally',
      condition: parsed.data.condition ?? 'New',
      note: parsed.data.note ?? '',
    };
  }

  let updated;
  try {
    updated = advance(record, target, actor.name, patch, parsed.data.note);
  } catch (error) {
    if (error instanceof RequestTransitionError) return fail(error.message, 409);
    throw error;
  }

  await update('runner-requests', record.id, updated);

  // Tell whichever side is now waiting on the other.
  if (RUNNER_MOVES.includes(target)) {
    await notify({
      userId: record.customer_id,
      title:
        target === 'QUOTED'
          ? `${record.reference} has a price`
          : `${record.reference} moved to ${target.toLowerCase()}`,
      body:
        target === 'QUOTED' && updated.quote
          ? `${updated.runner_name ?? 'Your runner'} found it. BWP ${updated.quote.total.toFixed(2)} all in, including the sourcing fee. Approve it and they will buy it.`
          : `${updated.runner_name ?? 'A runner'} has updated your request.`,
      kind: 'ORDER',
    });
  } else if (updated.runner_id) {
    const users = await readAll('users');
    const runnerUser = users.find((user) => user.runner_id === updated.runner_id);
    if (runnerUser) {
      await notify({
        userId: runnerUser.id,
        title: `${record.reference} — ${target.toLowerCase()}`,
        body:
          target === 'APPROVED'
            ? 'The customer approved your price. Go ahead and buy it.'
            : `The customer marked this request ${target.toLowerCase()}.`,
        kind: 'ORDER',
      });
    }
  }

  await audit({
    actorId: actor.id,
    actorName: actor.name,
    action:
      target === 'ACCEPTED'
        ? EVENTS.SOURCING_ACCEPTED
        : target === 'QUOTED'
          ? EVENTS.SOURCING_QUOTED
          : EVENTS.SOURCING_ADVANCED,
    entity: 'runner-request',
    entityId: record.id,
    detail: `${record.status} → ${target} on ${record.reference}.`,
  });

  return ok(updated);
});
