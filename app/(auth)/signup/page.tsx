import { redirect } from 'next/navigation';

/** The old sign-up URL. Clerk's page lives at /sign-up. */
export const dynamic = 'force-dynamic';

export default function SignupPage({ searchParams }: { searchParams: { next?: string } }) {
  const next = searchParams.next;
  redirect(next ? `/sign-up?redirect_url=${encodeURIComponent(next)}` : '/sign-up');
}
