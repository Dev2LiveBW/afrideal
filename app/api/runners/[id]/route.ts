import { z } from 'zod';

import { fail, guard, handled, ok } from '@/lib/api';
import { findById, update } from '@/lib/db';
import { EVENTS, audit } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

const PatchSchema = z.object({ online: z.boolean() });

/** PATCH /api/runners/:id — the online/offline toggle. */
export const PATCH = handled(async (request: Request, { params }: { params: { id: string } }) => {
  const { actor, response } = await guard(['RUNNER', 'SUPER_ADMIN', 'OPERATIONS_ADMIN']);
  if (response) return response;

  if (actor.role === 'RUNNER' && actor.runnerId !== params.id) {
    return fail('You can only change your own availability.', 403);
  }

  const parsed = PatchSchema.safeParse(await request.json());
  if (!parsed.success) return fail('Invalid runner update.', 422);

  const runner = await findById('runners', params.id);
  if (!runner) return fail('Runner not found.', 404);

  const updated = await update('runners', params.id, { online: parsed.data.online });

  await audit({
    actorId: actor.id,
    actorName: actor.name,
    action: EVENTS.RUNNER_STATUS_CHANGED,
    entity: 'runner',
    entityId: params.id,
    detail: `${runner.name} went ${parsed.data.online ? 'online' : 'offline'}.`,
  });

  return ok(updated);
});
