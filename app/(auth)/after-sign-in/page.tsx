import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import { landingFor } from '@/lib/roles';

/**
 * Where Clerk sends a signed-in user when nothing more specific was asked for.
 * Each role has its own landing (admin console, supplier portal, runner app,
 * storefront), and only the server knows the role - so this one hop decides.
 */
export const dynamic = 'force-dynamic';

export default async function AfterSignInPage() {
  const session = await auth();
  redirect(session?.user ? landingFor(session.user.role) : '/');
}
