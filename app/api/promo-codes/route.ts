import { z } from 'zod';

import { fail, guard, handled, ok } from '@/lib/api';
import { mutate, nextIds, readAll } from '@/lib/db';
import { EVENTS, audit } from '@/lib/notifications';
import { allAsDisplayed } from '@/lib/payments/status';
import { PromoDate } from '@/lib/promo-codes';
import { CODE_PATTERN, MAX_PERCENT, MIN_PERCENT, normaliseCode, paidUsesOf, promoState } from '@/lib/promo.mjs';
import type { PromoCode } from '@/types';

export const dynamic = 'force-dynamic';

const CreateSchema = z
  .object({
    code: z.string().transform(normaliseCode).pipe(z.string().regex(CODE_PATTERN, 'Use 4 to 20 letters and digits.')),
    percent: z.number().int().min(MIN_PERCENT).max(MAX_PERCENT),
    max_discount: z.number().positive('Set a maximum discount above zero.'),
    min_order: z.number().min(0),
    starts_at: PromoDate,
    ends_at: PromoDate,
    usage_limit: z.number().int().positive().nullable().optional(),
  })
  .refine((promo) => promo.ends_at > promo.starts_at, { message: 'The end date must be after the start date.' });

/** Spec 0011, AC-28: every code with its state and paid uses. Finance and super admin only. */
export const GET = handled(async () => {
  const { response } = await guard(['FINANCE_ADMIN', 'SUPER_ADMIN']);
  if (response) return response;

  const [promos, orders, payments] = await Promise.all([
    readAll('promo-codes'),
    readAll('orders'),
    readAll('payments'),
  ]);
  const displayed = allAsDisplayed(orders, payments);
  const now = new Date().toISOString();

  return ok(
    promos.map((promo) => {
      const paidUses = paidUsesOf(displayed, promo.code);
      return { ...promo, paid_uses: paidUses, state: promoState(promo, paidUses, now) };
    }),
  );
});

/** Spec 0011, AC-20: create a code. The code and percent never change afterwards. */
export const POST = handled(async (request: Request) => {
  const { actor, response } = await guard(['FINANCE_ADMIN', 'SUPER_ADMIN']);
  if (response) return response;

  const parsed = CreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Check the code.', 422);

  const [id] = await nextIds('promo-codes', 'prm', 1);
  const now = new Date().toISOString();
  const promo: PromoCode = {
    id,
    ...parsed.data,
    usage_limit: parsed.data.usage_limit ?? null,
    active: true,
    created_by: actor.id,
    created_at: now,
    updated_at: now,
  };

  // Under the lock, so two people creating one code cannot both succeed.
  const created = await mutate<'promo-codes', boolean>('promo-codes', (rows) =>
    rows.some((row) => row.code === promo.code)
      ? { rows, result: false }
      : { rows: [...rows, promo], result: true },
  );
  if (!created) return fail('That code already exists.', 409);

  await audit({
    actorId: actor.id,
    actorName: actor.name,
    action: EVENTS.PROMO_CREATED,
    entity: 'promo-code',
    entityId: id,
    detail: `${promo.code} created: ${promo.percent}% off, up to BWP ${promo.max_discount}.`,
  });

  return ok(promo, { status: 201 });
});
