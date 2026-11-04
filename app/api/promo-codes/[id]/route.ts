import { z } from 'zod';

import { fail, guard, handled, ok } from '@/lib/api';
import { mutate, readAll } from '@/lib/db';
import { EVENTS, audit } from '@/lib/notifications';
import { allAsDisplayed } from '@/lib/payments/status';
import { paidUsesOf } from '@/lib/promo.mjs';
import type { PromoCode } from '@/types';

export const dynamic = 'force-dynamic';

/** `.strict()` is what keeps the code and percent fixed once created. */
const ChangeSchema = z
  .object({
    active: z.boolean().optional(),
    ends_at: z.string().datetime({ offset: true }).optional(),
    usage_limit: z.number().int().positive().nullable().optional(),
  })
  .strict()
  .refine((change) => Object.keys(change).length > 0, 'Choose something to change.');

type Outcome = { promo: PromoCode } | { refused: string; status: number };

/** Spec 0011, AC-20: switch a code off, or change its end date or limit. */
export const PATCH = handled(async (request: Request, { params }: { params: { id: string } }) => {
  const { actor, response } = await guard(['FINANCE_ADMIN', 'SUPER_ADMIN']);
  if (response) return response;

  const parsed = ChangeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Check the change.', 422);

  const [orders, payments] = await Promise.all([readAll('orders'), readAll('payments')]);
  const displayed = allAsDisplayed(orders, payments);
  const now = new Date().toISOString();

  const outcome = await mutate<'promo-codes', Outcome>('promo-codes', (rows) => {
    const row = rows.find((entry) => entry.id === params.id);
    if (!row) return { rows, result: { refused: 'That code does not exist.', status: 404 } };

    const { ends_at, usage_limit } = parsed.data;
    if (ends_at && ends_at <= row.starts_at) {
      return { rows, result: { refused: 'The end date must be after the start date.', status: 422 } };
    }
    if (typeof usage_limit === 'number' && usage_limit < paidUsesOf(displayed, row.code)) {
      return { rows, result: { refused: 'The limit cannot be below the uses already paid for.', status: 422 } };
    }

    const promo: PromoCode = { ...row, ...parsed.data, updated_at: now };
    return { rows: rows.map((entry) => (entry.id === row.id ? promo : entry)), result: { promo } };
  });

  if ('refused' in outcome) return fail(outcome.refused, outcome.status);

  await audit({
    actorId: actor.id,
    actorName: actor.name,
    action: EVENTS.PROMO_CHANGED,
    entity: 'promo-code',
    entityId: outcome.promo.id,
    detail: `${outcome.promo.code} changed: ${JSON.stringify(parsed.data)}.`,
  });

  return ok(outcome.promo);
});
