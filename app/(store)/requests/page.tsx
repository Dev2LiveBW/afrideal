import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PackageSearch } from 'lucide-react';

import { GoldButton } from '@/components/brand/GoldButton';
import { MoneyText } from '@/components/brand/MoneyText';
import { EmptyState } from '@/components/brand/Panel';
import { AccountSidebar } from '@/components/storefront/AccountPanels';
import { RequestProgress } from '@/components/storefront/RequestProgress';
import { auth } from '@/lib/auth';
import { readAll } from '@/lib/db';
import { dateTime } from '@/lib/format';

import { RequestActions } from './RequestActions';

export const metadata: Metadata = {
  title: 'Your runner requests',
  description: 'Things you have asked an AfriDeal runner to find, and where each one has got to.',
};

export const dynamic = 'force-dynamic';

export default async function RequestsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login?next=/requests');

  const all = await readAll('runner-requests');
  const requests = all
    .filter((request) => request.customer_id === session.user.id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <div className="mx-auto max-w-market px-6 pb-24 pt-28">
      <div className="flex flex-col gap-10 lg:flex-row lg:gap-12">
        <AccountSidebar
          name={session.user.name ?? 'You'}
          avatar={session.user.avatar}
          active="Runner requests"
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <h1 className="font-display text-headline-lg font-semibold text-ink">
                Runner requests
              </h1>
              <p className="measure mt-2 text-[14px] leading-6 text-body">
                Things you have asked a runner to go and find. Nothing is bought until you approve
                the price they come back with.
              </p>
            </div>

            <Link href="/request-a-runner" className="shrink-0">
              <GoldButton variant="gold" size="md" withArrow>
                New request
              </GoldButton>
            </Link>
          </div>

          {requests.length === 0 ? (
            <EmptyState
              icon={<PackageSearch size={20} strokeWidth={1.5} />}
              title="No requests yet"
              description="When you ask a runner to find something, it will appear here with its price and progress."
              action={
                <Link href="/request-a-runner">
                  <GoldButton variant="gold" size="md" withArrow>
                    Request a runner
                  </GoldButton>
                </Link>
              }
              className="mt-8 rounded-md border border-hairline bg-surface-raised"
            />
          ) : (
            <ul className="mt-8 space-y-4">
              {requests.map((request) => (
                <li
                  key={request.id}
                  className="rounded-md border border-hairline bg-surface-raised p-5 shadow-card sm:p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
                    <div className="min-w-0">
                      <p className="font-mono text-[11.5px] tabular-nums text-muted">
                        {request.reference}
                      </p>
                      <h2 className="mt-1 text-[16px] font-semibold leading-6 text-ink">
                        {request.item}
                      </h2>
                      <p className="mt-1 text-[12.5px] text-muted">
                        <span className="font-mono tabular-nums">{request.quantity}</span>{' '}
                        {request.quantity === 1 ? 'unit' : 'units'} to {request.delivery_city} Â·
                        asked {dateTime(request.created_at)}
                        {request.runner_name && ` Â· ${request.runner_name}`}
                      </p>
                    </div>

                    {/*
                      The figure only exists once a runner has found the item, so
                      before that the slot shows the buyer's own budget and says
                      whose number it is. Showing an estimate here would put a
                      price on screen that nobody has stood behind.
                    */}
                    <div className="shrink-0 text-right">
                      {request.quote ? (
                        <>
                          <p className="text-[11.5px] text-muted">Quoted, all in</p>
                          <MoneyText amount={request.quote.total} size="lg" tone="gold" />
                          <p className="mt-0.5 text-[11px] text-muted">
                            incl. BWP {request.quote.service_fee.toFixed(2)} sourcing fee
                          </p>
                        </>
                      ) : request.budget_per_unit ? (
                        <>
                          <p className="text-[11.5px] text-muted">Your budget</p>
                          <MoneyText amount={request.budget_per_unit} size="md" bare />
                          <p className="mt-0.5 text-[11px] text-muted">per unit</p>
                        </>
                      ) : (
                        <p className="text-[12.5px] text-muted">No budget set</p>
                      )}
                    </div>
                  </div>

                  {request.detail && (
                    <p className="measure mt-4 border-t border-hairline pt-4 text-[13px] leading-6 text-body">
                      {request.detail}
                    </p>
                  )}

                  {request.quote && (
                    <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 border-t border-hairline pt-4 text-[12.5px] sm:grid-cols-3">
                      <div>
                        <dt className="text-muted">Found at</dt>
                        <dd className="mt-0.5 text-ink">{request.quote.found_at}</dd>
                      </div>
                      <div>
                        <dt className="text-muted">Condition</dt>
                        <dd className="mt-0.5 text-ink">{request.quote.condition}</dd>
                      </div>
                      <div>
                        <dt className="text-muted">Per unit</dt>
                        <dd className="mt-0.5 font-mono tabular-nums text-ink">
                          BWP {request.quote.unit_price.toFixed(2)}
                        </dd>
                      </div>
                    </dl>
                  )}

                  <RequestProgress status={request.status} className="mt-5" />

                  <div className="mt-4">
                    <RequestActions request={request} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
