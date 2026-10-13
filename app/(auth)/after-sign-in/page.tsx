import Link from 'next/link';
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
  let landing: string;
  try {
    const session = await auth();
    landing = session?.user ? landingFor(session.user.role) : '/';
  } catch (error) {
    // Resolving the session failed (Clerk or the database out of reach for a
    // moment). Sending everyone to the storefront here used to drop a staff
    // member into the shop with no word of what went wrong; say so instead,
    // and let them try the hop again.
    console.error('[after-sign-in] could not resolve the session', error);
    return <CouldNotFinish />;
  }
  redirect(landing);
}

function CouldNotFinish() {
  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center gap-4 px-6 py-12">
      <h1 className="font-display text-[22px] font-semibold text-ink">We could not finish signing you in</h1>
      <p className="text-[14px] leading-6 text-body">
        You are signed in, but we could not reach our servers to find your account just now. This usually clears
        in a few seconds.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/after-sign-in"
          className="press inline-flex h-11 items-center rounded-full bg-forest px-6 text-[14px] font-medium text-white"
        >
          Try again
        </Link>
        <Link
          href="/"
          className="press-soft inline-flex h-11 items-center rounded-full px-6 text-[14px] font-medium text-ink ring-1 ring-inset ring-hairline-strong"
        >
          Go to the shop
        </Link>
      </div>
    </main>
  );
}
