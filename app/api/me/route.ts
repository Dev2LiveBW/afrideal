import { fail, handled, ok } from '@/lib/api';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/me - the signed-in user as the app sees them.
 *
 * What the old NextAuth `/api/auth/session` used to answer: the profile and
 * role the session resolves to, never the Clerk account itself. Anonymous
 * callers get a 401 rather than an empty body, so a client can branch on
 * the status alone.
 */
export const GET = handled(async () => {
  const session = await auth();
  if (!session) return fail('You need to be signed in.', 401);
  return ok({ user: session.user });
});
