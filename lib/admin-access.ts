import 'server-only';

import { redirect } from 'next/navigation';

import { auth, type Session } from '@/lib/auth';
import { ADMIN_ROLES, canAccessAdminPath, landingFor } from '@/lib/roles';

/**
 * The page-level check behind every /admin page.
 *
 * middleware.ts applies the same rule at the edge, but only when the Clerk
 * session token carries the `metadata` claim, a dashboard setting. The admin
 * layout cannot repeat it per page: a layout stays mounted across client-side
 * navigation, so it would not see a finance user click through to /admin/orders.
 * Each page calls this instead, with the role `auth()` resolves either way.
 *
 * `path` is the page's own route; a detail page passes its list's prefix.
 */
export async function requireAdminPage(path: string): Promise<Session> {
  const session = await auth();
  if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) redirect('/login');

  if (!canAccessAdminPath(session.user.role, path)) {
    redirect(`${landingFor(session.user.role)}?denied=${encodeURIComponent(path)}`);
  }

  return session;
}
