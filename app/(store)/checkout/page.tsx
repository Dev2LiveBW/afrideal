import type { Metadata } from 'next';
import Link from 'next/link';
import { LogIn } from 'lucide-react';

import { GoldButton } from '@/components/brand/GoldButton';
import { EmptyState } from '@/components/brand/Panel';
import { auth } from '@/lib/auth';

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
          description="Checkout needs an account so the order, the escrow record and the delivery can be tied to you. Your cart is saved and will still be here."
          action={
            <Link href="/login">
              <GoldButton variant="gold" size="md" withArrow>
                Sign in
              </GoldButton>
            </Link>
          }
          className="rounded-md border border-hairline bg-surface-raised"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-market px-6 pb-24 pt-28">
      <CheckoutClient
        customerName={session.user.name ?? 'Customer'}
        customerEmail={session.user.email ?? ''}
      />
    </div>
  );
}
