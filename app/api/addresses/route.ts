import { z } from 'zod';

import {
  AddressFieldsSchema,
  MAX_ADDRESSES,
  addAddress,
  inBookOrder,
  type AddressResult,
} from '@/lib/addresses';
import { fail, guard, handled, ok } from '@/lib/api';
import { activeCountries } from '@/lib/countries';
import { mutate, nextIds, readAll } from '@/lib/db';

export const dynamic = 'force-dynamic';

const CreateSchema = AddressFieldsSchema.extend({ is_default: z.boolean().optional() });

/** The signed in buyer's address book. Nobody else's is ever readable here. */
export const GET = handled(async () => {
  const { actor, response } = await guard(['CUSTOMER']);
  if (response) return response;

  const rows = await readAll('addresses');
  return ok(inBookOrder(rows.filter((row) => row.user_id === actor.id)));
});

/** Spec 0011, AC-1 and AC-2: add an address, up to the limit. */
export const POST = handled(async (request: Request) => {
  const { actor, response } = await guard(['CUSTOMER']);
  if (response) return response;

  const parsed = CreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Check the address.', 422);

  const { is_default, ...fields } = parsed.data;
  if (!(await activeCountries()).some((country) => country.code === fields.country)) {
    return fail('We do not deliver to that country yet.', 422);
  }

  const [id] = await nextIds('addresses', 'adr', 1);
  const now = new Date().toISOString();
  const result = await mutate<'addresses', AddressResult>('addresses', (rows) =>
    addAddress(rows, { id, userId: actor.id, fields, now, makeDefault: is_default }),
  );

  if (!result.ok) return fail(`You can keep up to ${MAX_ADDRESSES} addresses. Delete one to add another.`, 409);
  return ok(result.address, { status: 201 });
});
