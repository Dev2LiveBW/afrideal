import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import { landingFor } from '@/lib/roles';

import { SignupClient } from './SignupClient';

export const metadata: Metadata = {
  title: 'Create an account',
  description:
    'Open an AfriDeal buyer account. Every order is paid into escrow and held until you confirm delivery.',
};

export const dynamic = 'force-dynamic';

export default async function SignupPage() {
  const session = await auth();

  // Already signed in: the form would only sign them out of context. Mirrors
  // the same guard on /login.
  if (session?.user) redirect(landingFor(session.user.role));

  return <SignupClient />;
}
