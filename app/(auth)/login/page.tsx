import { redirect } from 'next/navigation';

/**
 * The old NextAuth sign-in URL. Clerk's page lives at /sign-in; this keeps
 * every `/login` link and bookmark in the app working and carries the `next`
 * destination across as Clerk's `redirect_url`.
 */
export const dynamic = 'force-dynamic';

export default function LoginPage({ searchParams }: { searchParams: { next?: string } }) {
  const next = searchParams.next;
  redirect(next ? `/sign-in?redirect_url=${encodeURIComponent(next)}` : '/sign-in');
}
