import type { Metadata } from 'next';
export const fetchCache = 'force-no-store';
import { notFound } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';

import { ActionButton } from '@/components/brand/ActionButton';
import { readAll } from '@/lib/db';
import { mockGatewayAvailable } from '@/lib/payments/adapters';

import { submitMockCard } from './actions';

export const metadata: Metadata = { title: 'Mock payment gateway' };
export const dynamic = 'force-dynamic';

/**
 * A stand-in for DPO Pay's hosted card page while gateway approval is
 * outstanding (scope feature 4). Answers 404 unless PAYMENTS_PROVIDER=mock and
 * the server is not a production build. No card data is stored or sent anywhere:
 * the number field exists only so the journey looks like the real one.
 */
export default async function MockGatewayPage({
  searchParams,
}: {
  searchParams: { reference?: string };
}) {
  if (!mockGatewayAvailable()) {
    throw new Error(`mockGatewayAvailable is false. PAYMENTS_PROVIDER=${process.env.PAYMENTS_PROVIDER} NODE_ENV=${process.env.NODE_ENV}`);
  }

  const reference = searchParams.reference ?? '';
  const payments = await readAll('payments');
  const attempt = payments.find(
    (row) => row.provider === 'MOCK' && row.provider_reference === reference,
  );
  if (!attempt) {
    notFound();
  }

  const amount = `BWP ${attempt.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <main className="mx-auto max-w-md px-6 pb-24 pt-20">
      <div className="rounded-xl border border-hairline bg-surface-raised p-8">
        <div className="flex items-center gap-2">
          <ShieldCheck size={24} strokeWidth={1.5} aria-hidden />
          <h1 className="text-[18px] font-semibold text-ink">Mock payment gateway</h1>
        </div>
        <p className="mt-2 text-[12.5px] text-body">
          Test mode. No money moves and nothing you type here is stored.
        </p>

        <p className="mt-6 text-[13px] text-body">
          Amount to pay <span className="font-semibold text-ink tabular-nums">{amount}</span>
        </p>

        <form action={submitMockCard} className="mt-6 space-y-5">
          <input type="hidden" name="reference" value={reference} />
          <div>
            <label htmlFor="card" className="mb-1.5 block text-[13px] font-medium text-ink">
              Card number
            </label>
            <input
              id="card"
              inputMode="numeric"
              autoComplete="off"
              placeholder="4242 4242 4242 4242"
              className="w-full rounded-md border border-hairline px-3 py-2 text-[14px]"
            />
          </div>
          <div className="flex gap-3">
            <ActionButton type="submit" name="outcome" value="CONFIRMED" size="md" className="flex-1">
              Pay
            </ActionButton>
            <ActionButton type="submit" name="outcome" value="FAILED" size="md" variant="ghost">
              Decline
            </ActionButton>
          </div>
        </form>
      </div>
    </main>
  );
}
