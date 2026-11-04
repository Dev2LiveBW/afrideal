import type { Metadata } from 'next';
import Link from 'next/link';
import { LogIn } from 'lucide-react';

import { ActionButton } from '@/components/brand/ActionButton';
import { EmptyState } from '@/components/brand/Panel';
import { AccountSidebar } from '@/components/storefront/AccountPanels';
import { inBookOrder } from '@/lib/addresses';
import { auth } from '@/lib/auth';
import { activeCountries } from '@/lib/countries';
import { readAll } from '@/lib/db';

import { AddressBook } from './AddressBook';

export const metadata: Metadata = { title: 'Your addresses' };
export const dynamic = 'force-dynamic';

export default async function AddressesPage() {
  const session = await auth();

  if (!session?.user) {
    return (
      <div className="mx-auto max-w-market px-6 pb-24 pt-28">
        <EmptyState
          icon={<LogIn size={22} strokeWidth={1.5} />}
          title="Sign in to see your addresses"
          description="Save the places you send to, and pick one at checkout."
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

  const [rows, countries] = await Promise.all([readAll('addresses'), activeCountries()]);

  return (
    <div className="mx-auto max-w-market px-4 pb-24 pt-20 sm:px-6 sm:pt-28">
      <div className="flex flex-col gap-10 lg:flex-row lg:gap-12">
        <AccountSidebar
          name={session.user.name ?? 'You'}
          avatar={session.user.avatar}
          active="Addresses"
        />

        <div className="min-w-0 flex-1">
          <h1 className="font-display text-headline-lg font-semibold text-ink">Your addresses</h1>
          <p className="measure mt-2 text-[14px] leading-6 text-body">
            Save the places you send to, in any country we deliver to, and pick one at checkout.
            Changing an address here never changes an order you have already placed.
          </p>

          <AddressBook
            addresses={inBookOrder(rows.filter((row) => row.user_id === session.user.id))}
            countries={countries}
          />
        </div>
      </div>
    </div>
  );
}
