import type { Metadata } from 'next';
import Link from 'next/link';
import { LogIn } from 'lucide-react';

import { ActionButton } from '@/components/brand/ActionButton';
import { EmptyState } from '@/components/brand/Panel';
import { AccountSidebar } from '@/components/storefront/AccountPanels';
import { alertPrefsOf } from '@/lib/alert-prefs';
import { auth } from '@/lib/auth';
import { findById } from '@/lib/db';

import { AlertSettings } from './AlertSettings';

export const metadata: Metadata = { title: 'Account settings' };
export const dynamic = 'force-dynamic';

export default async function AccountSettingsPage() {
  const session = await auth();

  if (!session?.user) {
    return (
      <div className="mx-auto max-w-market px-6 pb-24 pt-28">
        <EmptyState
          icon={<LogIn size={22} strokeWidth={1.5} />}
          title="Sign in to see your settings"
          description="Choose how we keep you up to date."
          action={
            <Link href="/sign-in">
              <ActionButton size="md" withArrow>
                Sign in
              </ActionButton>
            </Link>
          }
          className="rounded-md border border-hairline bg-surface-raised"
        />
      </div>
    );
  }

  const user = await findById('users', session.user.id);

  return (
    <div className="mx-auto max-w-market px-4 pb-24 pt-20 sm:px-6 sm:pt-28">
      <div className="flex flex-col gap-10 lg:flex-row lg:gap-12">
        <AccountSidebar
          name={session.user.name ?? 'You'}
          avatar={session.user.avatar}
          active="Account settings"
        />

        <div className="min-w-0 flex-1">
          <h1 className="font-display text-headline-lg font-semibold text-ink">Account settings</h1>
          <p className="measure mt-2 text-[14px] leading-6 text-body">
            Choose how we keep you up to date. Notices inside AfriDeal stay on, so you never lose
            track of an order.
          </p>

          <AlertSettings prefs={alertPrefsOf(user)} />
        </div>
      </div>
    </div>
  );
}
