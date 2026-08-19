import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import { landingFor } from '@/lib/roles';

import { LoginClient } from './LoginClient';

export const metadata: Metadata = { title: 'Sign in' };
export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const session = await auth();

  // Already signed in: send them where they belong rather than showing a form
  // they do not need.
  if (session?.user) redirect(landingFor(session.user.role));

  return <LoginClient />;
}
