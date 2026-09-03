import { z } from 'zod';

import { fail, guard, handled, ok } from '@/lib/api';
import { insert, nextId, readAll } from '@/lib/db';
import { audit, notify } from '@/lib/notifications';
import type { RunnerRequest } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * Runner request intake.
 *
 * The second way to buy: a customer names something the catalogue does not
 * carry and a verified runner goes and gets it. Nothing is charged here — the
 * runner has to source and price it first, and the customer approves that
 * before any money moves, which is the whole point of the flow.
 */

const CreateSchema = z.object({
  title: z.string().min(3, 'Tell us what you are looking for.').max(160),
  details: z.string().max(2000).optional(),
  category_id: z.string().nullable().optional(),
  quantity: z.number().int().min(1, 'Enter how many you need.').max(9999),
  budget_per_unit: z.number().positive().nullable().optional(),
  delivery_location: z.string().min(2, 'Tell us where this is going.').max(120),
  needed_by: z.string().nullable().optional(),
  is_personal_task: z.boolean().optional(),
});

// ── GET /api/runner-requests ─────────────────────────────────────────────────

export const GET = handled(async () => {
  const { actor, response } = await guard();
  if (response) return response;

  const requests = await readAll('runner-requests');

  // A customer sees their own requests. A runner sees what is open to accept
  // plus anything already assigned to them. Staff see the queue.
  const visible =
    actor.role === 'CUSTOMER'
      ? requests.filter((request) => request.customer_id === actor.id)
      : actor.role === 'RUNNER'
        ? requests.filter(
            (request) => request.status === 'REQUESTED' || request.runner_id === actor.runnerId,
          )
        : requests;

  return ok([...visible].sort((a, b) => b.created_at.localeCompare(a.created_at)));
});

// ── POST /api/runner-requests ────────────────────────────────────────────────

export const POST = handled(async (request: Request) => {
  const { actor, response } = await guard();
  if (response) return response;

  const parsed = CreateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? 'Invalid runner request.', 422);
  }

  const now = new Date().toISOString();
  const existing = await readAll('runner-requests');

  const runnerRequest: RunnerRequest = {
    id: await nextId('runner-requests', 'rr'),
    reference: `RUN-${4100 + existing.length}`,
    customer_id: actor.id,
    customer_name: actor.name,
    title: parsed.data.title.trim(),
    details: parsed.data.details?.trim() ?? '',
    category_id: parsed.data.category_id ?? null,
    quantity: parsed.data.quantity,
    budget_per_unit: parsed.data.budget_per_unit ?? null,
    delivery_location: parsed.data.delivery_location.trim(),
    needed_by: parsed.data.needed_by ?? null,
    is_personal_task: parsed.data.is_personal_task ?? false,
    status: 'REQUESTED',
    runner_id: null,
    created_at: now,
    updated_at: now,
  };

  await insert('runner-requests', runnerRequest);

  // Every runner who is online gets told, plus operations, who match a request
  // to a runner when nobody picks it up.
  const [runners, users] = await Promise.all([readAll('runners'), readAll('users')]);

  const available = runners.filter((runner) => runner.online);

  for (const runner of available) {
    const account = users.find((user) => user.id === runner.user_id);
    if (!account) continue;

    await notify({
      userId: account.id,
      title: 'New runner request',
      body: `${runnerRequest.reference} — ${runnerRequest.title} (${runnerRequest.quantity}) to ${runnerRequest.delivery_location}.`,
      kind: 'ORDER',
    });
  }

  for (const member of users.filter((user) =>
    ['SUPER_ADMIN', 'OPERATIONS_ADMIN'].includes(user.role),
  )) {
    await notify({
      userId: member.id,
      title: 'Runner request to assign',
      body: `${runnerRequest.reference} from ${actor.name} — ${runnerRequest.title}.`,
      kind: 'ORDER',
    });
  }

  await audit({
    actorId: actor.id,
    actorName: actor.name,
    action: 'RUNNER_REQUEST_SUBMITTED',
    entity: 'runner-request',
    entityId: runnerRequest.id,
    detail: `${runnerRequest.reference} — ${runnerRequest.title}, ${available.length} runner(s) notified.`,
  });

  return ok({ request: runnerRequest, notified: available.length }, { status: 201 });
});
