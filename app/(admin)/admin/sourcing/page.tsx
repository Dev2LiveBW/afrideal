import Link from 'next/link';
import { Clock3, HandCoins, PackageSearch, Truck } from 'lucide-react';

import { MoneyText } from '@/components/brand/MoneyText';
import { EmptyState, PageHeader } from '@/components/brand/Panel';
import { StatCard } from '@/components/brand/StatCard';
import { StatusBadge } from '@/components/brand/StatusBadge';
import { ConsoleTopbar } from '@/components/layout/ConsoleTopbar';
import { auth } from '@/lib/auth';
import { readAll } from '@/lib/db';
import { dateTime } from '@/lib/format';
import { getNotifications } from '@/lib/queries';
import { REQUEST_LABELS } from '@/lib/runner-requests';

export const dynamic = 'force-dynamic';

export default async function AdminSourcingPage() {
  const [session, requests] = await Promise.all([auth(), readAll('runner-requests')]);
  const notifications = session?.user ? await getNotifications(session.user.id) : [];

  const rows = [...requests].sort((a, b) => b.updated_at.localeCompare(a.updated_at));

  const unclaimed = requests.filter((request) => request.status === 'REQUESTED');
  const awaitingBuyer = requests.filter((request) => request.status === 'QUOTED');
  const inFlight = requests.filter((request) =>
    ['ACCEPTED', 'SOURCING', 'APPROVED', 'DELIVERING'].includes(request.status),
  );

  /*
   * Only quoted-and-onward requests carry a real figure, so the value on this
   * strip counts those alone. Adding budgets from unquoted requests would put a
   * number on the console that nobody has agreed to.
   */
  const committed = requests
    .filter((request) => request.quote != null && request.status !== 'CANCELLED')
    .reduce((sum, request) => sum + (request.quote?.total ?? 0), 0);

  return (
    <>
      <ConsoleTopbar
        title="Sourcing"
        breadcrumb={[{ label: 'Admin console' }, { label: 'Sourcing' }]}
        notifications={notifications}
      />

      <div className="mx-auto max-w-console space-y-5 px-6 py-6">
        <PageHeader
          eyebrow="Operations"
          title="Runner sourcing requests"
          description="Buyers asking for things the catalogue does not carry, and how far each request has got."
        />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Waiting for a runner"
            value={unclaimed.length}
            format="number"
            accent={unclaimed.length > 0 ? 'gold' : 'ink'}
            hint="nobody has taken these yet"
            icon={<PackageSearch size={16} strokeWidth={1.5} />}
          />
          <StatCard
            label="Waiting on the buyer"
            value={awaitingBuyer.length}
            format="number"
            accent={awaitingBuyer.length > 0 ? 'gold' : 'ink'}
            hint="priced, needs approval"
            icon={<Clock3 size={16} strokeWidth={1.5} />}
          />
          <StatCard
            label="In flight"
            value={inFlight.length}
            format="number"
            accent="ink"
            hint="accepted through delivering"
            icon={<Truck size={16} strokeWidth={1.5} />}
          />
          <StatCard
            label="Quoted value"
            value={committed}
            format="money"
            accent="forest"
            hint="requests with a real figure"
            icon={<HandCoins size={16} strokeWidth={1.5} />}
          />
        </div>

        {rows.length === 0 ? (
          <div className="panel">
            <EmptyState
              icon={<PackageSearch size={20} strokeWidth={1.5} />}
              title="No sourcing requests yet"
              description="When a buyer asks a runner to find something, it will appear here."
            />
          </div>
        ) : (
          <div className="panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data-table min-w-[900px]">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Item</th>
                    <th>Customer</th>
                    <th>Runner</th>
                    <th>Quoted</th>
                    <th>Updated</th>
                    <th className="text-right">Stage</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((request) => (
                    <tr key={request.id}>
                      <td className="font-mono text-[12.5px] font-medium text-ink">
                        {request.reference}
                      </td>
                      <td>
                        <p className="max-w-[280px] truncate text-[13px] text-ink">
                          {request.item}
                        </p>
                        <p className="text-[11.5px] text-muted">
                          <span className="font-mono tabular-nums">{request.quantity}</span> to{' '}
                          {request.delivery_city}
                        </p>
                      </td>
                      <td className="text-[13px] text-ink">{request.customer_name}</td>
                      <td className="text-[13px] text-body">
                        {request.runner_name ? (
                          <Link
                            href="/admin/runners"
                            className="transition-colors hover:text-gold-dark"
                          >
                            {request.runner_name}
                          </Link>
                        ) : (
                          <span className="text-muted">Unassigned</span>
                        )}
                      </td>
                      <td>
                        {request.quote ? (
                          <MoneyText amount={request.quote.total} size="sm" />
                        ) : (
                          <span className="text-[12px] text-muted">-</span>
                        )}
                      </td>
                      <td className="text-[12px] text-muted">{dateTime(request.updated_at)}</td>
                      <td className="text-right">
                        <StatusBadge status={request.status} size="sm" />
                        <p className="mt-1 text-[11px] text-muted">
                          {REQUEST_LABELS[request.status]}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
