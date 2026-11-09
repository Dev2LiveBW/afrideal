import { z } from 'zod';

import { AddressFieldsSchema, removeAddress, updateAddress, type AddressResult } from '@/lib/addresses';
import { fail, guard, handled, ok } from '@/lib/api';
import { activeCountries } from '@/lib/countries';
import { findById, mutate } from '@/lib/db';

export const dynamic = 'force-dynamic';

const PatchSchema = AddressFieldsSchema.partial().extend({ is_default: z.literal(true).optional() });

type Params = { params: { id: string } };

/** Who may touch this address, answered the same way for both verbs. */
async function ownedBy(id: string, userId: string) {
  const address = await findById('addresses', id);
  if (!address) return { refusal: fail('Address not found.', 404) };
  if (address.user_id !== userId) return { refusal: fail('That address is not yours.', 403) };
  return { address };
}

export const PATCH = handled(async (request: Request, { params }: Params) => {
  const { actor, response } = await guard(['CUSTOMER']);
  if (response) return response;

  const { refusal } = await ownedBy(params.id, actor.id);
  if (refusal) return refusal;

  const parsed = PatchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Check the address.', 422);

  const { is_default, ...fields } = parsed.data;
  if (fields.country && !(await activeCountries()).some((country) => country.code === fields.country)) {
    return fail('We do not deliver to that country yet.', 422);
  }

  const now = new Date().toISOString();
  const result = await mutate<'addresses', AddressResult>('addresses', (rows) =>
    updateAddress(rows, { id: params.id, userId: actor.id, fields, makeDefault: is_default, now }),
  );

  return result.ok ? ok(result.address) : fail('Address not found.', 404);
});

/**
 * Deleted outright (spec 0011): a buyer removing their data should mean it, and
 * each order holds its own copy of what fulfilment needed.
 */
export const DELETE = handled(async (_request: Request, { params }: Params) => {
  const { actor, response } = await guard(['CUSTOMER']);
  if (response) return response;

  const { refusal } = await ownedBy(params.id, actor.id);
  if (refusal) return refusal;

  await mutate<'addresses', { ok: boolean }>('addresses', (rows) =>
    removeAddress(rows, { id: params.id, userId: actor.id }),
  );
  return ok({ ok: true });
});
