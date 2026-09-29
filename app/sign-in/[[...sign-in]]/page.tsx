import type { Metadata } from 'next';
import Link from 'next/link';
import { SignIn } from '@clerk/nextjs';

import { AfriDealLogo } from '@/components/brand/AfriDealLogo';

import { DemoAccounts } from '../DemoAccounts';

export const metadata: Metadata = { title: 'Sign in' };

/**
 * Clerk's sign-in form on the left, the eight demo accounts on the right.
 * `/login` redirects here, carrying `?next=` across as Clerk's `redirect_url`.
 */
export default function SignInPage() {
  return (
    <div className="mx-auto grid min-h-[100dvh] max-w-market gap-12 px-6 py-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16 lg:py-16">
      <div className="flex flex-col items-start gap-8">
        <Link href="/" className="w-fit">
          <AfriDealLogo variant="light" size="md" />
        </Link>
        <SignIn fallbackRedirectUrl="/after-sign-in" signUpUrl="/sign-up" />
      </div>

      <div className="lg:pt-16">
        <DemoAccounts />
      </div>
    </div>
  );
}
