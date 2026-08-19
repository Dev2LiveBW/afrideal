import { handled, ok } from '@/lib/api';
import { readAll } from '@/lib/db';
import { toPublicUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * Powers the quick-login cards. Passwords are stripped here — the demo
 * credentials are documented in the README, not served from an endpoint.
 */
export const GET = handled(async () => {
  const users = await readAll('users');
  return ok(users.map(toPublicUser));
});
