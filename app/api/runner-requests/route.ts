import { z } from 'zod';

import { fail, guard, handled, ok } from '@/lib/api';
import { insert, nextId, readAll } from '@/lib/db';
import { EVENTS, audit, notify, notifyMany } from '@/lib/notifications';
import type { RunnerRequest } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/runner-requests — scoped by who is asking.
 *
 * A customer sees their own. A runner sees the open pool plus whatever they
 * have taken. Staff see everything. The scoping happens here rather than in the
 * page, so a runner cannot read another runner's job by calling the API directly.
 */
export const GET = handled(async () => {
  const { actor, response } = await guard();
  if (response) return response;

  const requests = await readAll('runner-requests');

  if (actor.role === 'CUSTOMER') {
    return ok(requests.filter((request) => request.customer_id === actor.id));
  }

  if (actor.role === 'RUNNER') {
    return ok(
      requests.filter(
        (request) => request.status === 'REQUESTED' || request.runner_id === actor.runnerId,
      ),
    );
  }

  return ok(requests);
});

const CreateSchema = z.object({
  item: z.string().min(4, 'Tell us what you are looking for.').max(160),
  detail: z.string().max(1200).optional(),
  quantity: z.coerce.number().int().min(1, 'At least one.').max(10_000),
  budget_per_unit: z.coerce.number().min(0).nullable().optional(),
  delivery_city: z.string().min(2, 'We need a town or city.').max(80),
  delivery_address: z.string().min(4, 'We need somewhere to deliver to.').max(240),
  needed_by: z.string().max(40).nullable().optional(),
});

/**
 * POST /api/runner-requests — a buyer asks for something the catalogue does not
 * carry.
 *
 * Nothing is charged and no order is raised. The request enters the pool at
 * REQUESTED, every runner who is online is told, and the buyer commits to
 * nothing until a runner comes back with a real figure they can approve.
 */
export const POST = handled(async (request: Request) => {
  const { actor, response } = await guard(['CUSTOMER', 'SUPER_ADMIN']);
  if (response) return response;

  const parsed = CreateSchema.safeParse(await request.json());
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Check the form.', 422);

  const now = new Date().toISOString();
  const id = await nextId('runner-requests', 'rr');
  const existing = await readAll('runner-requests');

  const record: RunnerRequest = {
    id,
    reference: `RUN-${24810 + existing.length}`,
    customer_id: actor.id,
    customer_name: actor.name,
    item: parsed.data.item,
    detail: parsed.data.detail ?? '',
    quantity: parsed.data.quantity,
    budget_per_unit: parsed.data.budget_per_unit ?? null,
    delivery_city: parsed.data.delivery_city,
    delivery_address: parsed.data.delivery_address,
    needed_by: parsed.data.needed_by || null,
    status: 'REQUESTED',
    runner_id: null,
    runner_name: null,
    quote: null,
    created_at: now,
    updated_at: now,
    timeline: [
      { status: 'REQUESTED', label: 'Request submitted', at: now, actor: actor.name },
    ],
  };

  await insert('runner-requests', record);

  // Every runner who is online gets told there is something in the pool.
  const [runners, users] = await Promise.all([readAll('runners'), readAll('users')]);
  const onlineRunnerUserIds = users
    .filter(
      (user) =>
        user.role === 'RUNNER' &&
        runners.some((runner) => runner.id === user.runner_id && runner.online),
    )
    .map((user) => user.id);

  if (onlineRunnerUserIds.length > 0) {
    await notifyMany(onlineRunnerUserIds, {
      title: 'New sourcing request',
      body: `${record.reference}: ${record.item} in ${record.delivery_city}.`,
      kind: 'ORDER',
    });
  }

  await notify({
    userId: actor.id,
    title: 'Request received',
    body: `${record.reference} is with our runners. You will hear back with a price before anything is bought.`,
    kind: 'ORDER',
  });

  await audit({
    actorId: actor.id,
    actorName: actor.name,
    action: EVENTS.SOURCING_REQUESTED,
    entity: 'runner-request',
    entityId: record.id,
    detail: `${record.reference}: ${record.item} × ${record.quantity} to ${record.delivery_city}.`,
  });

  return ok(record, { status: 201 });
});
