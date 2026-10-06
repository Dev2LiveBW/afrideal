import { z } from 'zod';

import { fail, guard, handled, ok } from '@/lib/api';
import { EVENTS, audit } from '@/lib/notifications';
import { checkoutIsPaused, setCheckoutPaused } from '@/lib/settings';

/**
 * The checkout pause switch (spec 0003, AC-8).
 *
 * Reading is open to any signed in account, because the storefront has to be able
 * to tell a buyer why they cannot check out. Flipping it is super admin only: it
 * stops the business taking money, which is not an operations or finance call.
 */
export const dynamic = 'force-dynamic';

const PauseSchema = z.object({ paused: z.boolean() });

export const GET = handled(async () => {
  const { response } = await guard();
  if (response) return response;

  return ok({ paused: await checkoutIsPaused() });
});

export const PATCH = handled(async (request: Request) => {
  // Not ADMIN_ROLES: operations and finance are deliberately excluded, matching
  // the existing restriction on /admin/settings.
  const { actor, response } = await guard(['SUPER_ADMIN']);
  if (response) return response;

  const parsed = PauseSchema.safeParse(await request.json());
  if (!parsed.success) return fail('Say whether checkout should be paused.', 422);

  const saved = await setCheckoutPaused(parsed.data.paused, actor.name);

  // Pausing checkout stops revenue, so who did it and when is worth recording.
  await audit({
    actorId: actor.id,
    actorName: actor.name,
    action: EVENTS.SETTINGS_CHANGED,
    entity: 'setting',
    entityId: 'checkout_paused',
    detail: parsed.data.paused
      ? 'Checkout paused storewide. No new orders can be placed.'
      : 'Checkout resumed. Orders can be placed again.',
  });

  return ok({ paused: saved.value.paused === true });
});
