import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';

import { RunnerTabBar, RunnerTopbar } from '@/components/layout/RunnerNav';
import { auth } from '@/lib/auth';

/**
 * Runner Portal shell — mobile-first.
 *
 * A runner uses this one-handed, in a vehicle, in daylight: a fixed top bar,
 * a single centred column capped at `max-w-lg`, and a fixed bottom tab bar.
 * `pb-24` on the content keeps the tab bar from ever covering the last card.
 */
export default async function RunnerLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'RUNNER' && session.user.role !== 'SUPER_ADMIN') redirect('/');

  return (
    <div className="min-h-screen bg-surface">
      <RunnerTopbar name={session.user.name ?? 'Runner'} avatar={session.user.avatar ?? 'R'} />
      <main className="mx-auto max-w-lg px-4 pb-24 pt-5">{children}</main>
      <RunnerTabBar />
    </div>
  );
}
