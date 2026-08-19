import { z } from 'zod';

import { fail, handled, ok } from '@/lib/api';
import { toPublicUser } from '@/lib/auth';
import { mutate } from '@/lib/db';
import type { User } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * Buyer self-registration.
 *
 * Deliberately narrow: this creates a CUSTOMER on the RETAIL tier and nothing
 * else. Supplier, runner and staff accounts carry commercial consequences — a
 * supplier can be routed real orders, a runner can mark a delivery complete —
 * so those stay behind admin creation and verification. Letting a signup form
 * mint them would make §8 verification decorative.
 *
 * The password is stored in plain text, matching the rest of this demo's user
 * store, and that is the one thing here that must change before real users:
 * hash on write, and compare with a constant-time check in `lib/auth.ts`. The
 * two changes are the same edit and belong together.
 */

const SignupSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name.').max(80, 'That name is too long.'),
  email: z.string().trim().email('That is not a valid email address.'),
  password: z
    .string()
    .min(8, 'Use at least 8 characters.')
    .max(128, 'That password is too long.')
    .regex(/[A-Za-z]/, 'Include at least one letter.')
    .regex(/[0-9]/, 'Include at least one number.'),
});

/**
 * Either the address was taken, or an account was created. Named because the
 * generic on `mutate` is otherwise inferred from whichever branch it sees
 * first, which narrows `conflict` to a literal `true` and rejects the other.
 */
type SignupResult = { conflict: true } | { conflict: false; user: User };

/**
 * Next free user id, derived from the rows already held by `mutate`.
 *
 * `nextId` in lib/db re-reads the file, which inside a mutate callback means a
 * second read of state we are already holding. Scanning the ids we have avoids
 * that and cannot disagree with what is about to be written.
 */
function nextUserId(rows: { id: string }[]): string {
  const highest = rows.reduce((max, row) => {
    const n = Number.parseInt(row.id.slice(1), 10);
    return row.id.startsWith('u') && Number.isFinite(n) && n > max ? n : max;
  }, 0);

  return `u${String(highest + 1).padStart(3, '0')}`;
}

/** "Thabo Modise" → "TM"; the avatar is initials, as with the seeded accounts. */
function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  const letters = parts.length >= 2 ? [parts[0][0], parts[parts.length - 1][0]] : [parts[0][0]];
  return letters.join('').toUpperCase();
}

export const POST = handled(async (request: Request) => {
  const body = await request.json().catch(() => null);
  const parsed = SignupSchema.safeParse(body);

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? 'Check the details and try again.', 422);
  }

  const email = parsed.data.email.toLowerCase();

  /*
   * The duplicate check and the insert share one `mutate` pass, so two
   * simultaneous signups on the same address cannot both find it free and both
   * write. Checking with a separate read first would leave exactly that gap:
   * `readAll` is an await, and an await is a yield point.
   */
  const result = await mutate<'users', SignupResult>('users', (rows) => {
    if (rows.some((row) => row.email.toLowerCase() === email)) {
      return { rows, result: { conflict: true } };
    }

    const user: User = {
      id: nextUserId(rows),
      name: parsed.data.name,
      email,
      password: parsed.data.password,
      role: 'CUSTOMER',
      avatar: initials(parsed.data.name),
      status: 'ACTIVE',
      customer_type: 'RETAIL',
    };

    return { rows: [...rows, user], result: { conflict: false, user } };
  });

  if (result.conflict) {
    return fail('An account already exists for that email address.', 409);
  }

  // The client signs in with the same credentials straight after; the password
  // never comes back out of here.
  return ok(toPublicUser(result.user), { status: 201 });
});
