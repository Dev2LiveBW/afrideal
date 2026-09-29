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
  try {
    const session = await auth();
    redirect(session?.user ? landingFor(session.user.role) : '/');
  } catch (err: unknown) {
    // Next.js redirect() works by throwing — must be re-thrown.
    // Any other error (e.g. missing DATABASE_URL on Vercel) falls back to home.
    const isRedirect =
      typeof err === 'object' && err !== null && 'digest' in err &&
      typeof (err as { digest?: unknown }).digest === 'string' &&
      (err as { digest: string }).digest.startsWith('NEXT_REDIRECT');
    if (isRedirect) throw err;
    redirect('/');
  }
}
