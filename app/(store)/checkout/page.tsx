import type { Metadata } from 'next';
import Link from 'next/link';
import { LogIn } from 'lucide-react';

import { ActionButton } from '@/components/brand/ActionButton';
import { EmptyState } from '@/components/brand/Panel';
import { auth } from '@/lib/auth';
import { activeCountries } from '@/lib/countries';
import { readAll } from '@/lib/db';
import { availablePaymentMethods } from '@/lib/payments/adapters';

import { CheckoutClient } from './CheckoutClient';

export const metadata: Metadata = { title: 'Checkout' };
export const dynamic = 'force-dynamic';

export default async function CheckoutPage() {
  const session = await auth();

  if (!session?.user) {
    return (
      <div className="mx-auto max-w-market px-6 pb-24 pt-28">
        <EmptyState
          icon={<LogIn size={22} strokeWidth={1.5} />}
          title="Sign in to complete this order"
          description="Checkout needs an account so the order, the invoice and the delivery can be tied to you. Your cart is saved and will still be here."
          action={
            <Link href="/login">
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

  /*
   * The summary has to quote the same figures the orders route will charge, so
   * the ladder is resolved here rather than trusting the price frozen onto each
   * cart line when it was added.
   */
  const [bands, products, countries, couriers] = await Promise.all([
    readAll('customer-prices'),
    readAll('products'),
    activeCountries(),
    readAll('couriers'),
  ]);

  return (
    <div className="mx-auto max-w-market px-4 pb-36 pt-20 sm:px-6 sm:pb-24 sm:pt-28">
      <CheckoutClient
        customerName={session.user.name ?? 'Customer'}
        customerEmail={session.user.email ?? ''}
        bands={bands}
        products={products}
        customerType={session.user.customer_type ?? 'RETAIL'}
        methods={availablePaymentMethods()}
        countries={countries}
        couriers={couriers.filter((courier) => courier.active)}
      />
    </div>
  );
}
