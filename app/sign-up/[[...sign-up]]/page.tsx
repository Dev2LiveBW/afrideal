import type { Metadata } from 'next';
import { SignUp } from '@clerk/nextjs';

export const metadata: Metadata = {
  title: 'Create an account',
  description:
    'Open an AfriDeal buyer account. Published prices at every quantity, verified suppliers, and delivery you can follow.',
};

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f5f3] px-4 py-10">
      <SignUp fallbackRedirectUrl="/after-sign-in" signInUrl="/sign-in" />
    </div>
  );
}
