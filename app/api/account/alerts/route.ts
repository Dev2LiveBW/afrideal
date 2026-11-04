import { z } from 'zod';

import { alertPrefsOf, applyAlertChange } from '@/lib/alert-prefs';
import { fail, guard, handled, ok } from '@/lib/api';
import { mutate } from '@/lib/db';
import { EVENTS, audit } from '@/lib/notifications';
import type { AlertPrefs } from '@/types';

export const dynamic = 'force-dynamic';

const ChangeSchema = z
  .object({
    order_email: z.boolean().optional(),
    order_sms: z.boolean().optional(),
    marketing: z.boolean().optional(),
  })
  .strict()
  .refine((change) => Object.keys(change).length > 0, 'Choose a setting to change.');

type Outcome = { prefs: AlertPrefs; consent: 'ON' | 'OFF' | null } | null;

/**
 * Spec 0011, AC-17 and AC-18: change the signed in buyer's alert settings. The
 * owner comes from the session, and the read and the write sit under one lock, so
 * a consent date cannot be worked out from a stale copy of the row.
 */
export const PATCH = handled(async (request: Request) => {
  const { actor, response } = await guard(['CUSTOMER']);
  if (response) return response;

  const parsed = ChangeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Check the setting.', 422);

  const now = new Date().toISOString();
  const outcome = await mutate<'users', Outcome>('users', (rows) => {
    const row = rows.find((entry) => entry.id === actor.id);
    if (!row) return { rows, result: null };

    const change = applyAlertChange(alertPrefsOf(row), parsed.data, now);
    return {
      rows: rows.map((entry) => (entry.id === row.id ? { ...entry, alert_prefs: change.prefs } : entry)),
      result: change,
    };
  });

  if (!outcome) return fail('We could not find your account.', 404);

  if (outcome.consent) {
    await audit({
      actorId: actor.id,
      actorName: actor.name,
      action: outcome.consent === 'ON' ? EVENTS.MARKETING_CONSENT_ON : EVENTS.MARKETING_CONSENT_OFF,
      entity: 'user',
      entityId: actor.id,
      detail: outcome.consent === 'ON' ? 'Turned on offers and news' : 'Turned off offers and news',
    });
  }

  return ok(outcome.prefs);
});
