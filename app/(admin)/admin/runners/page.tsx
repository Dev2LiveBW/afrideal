import { Bike, PackageCheck, Radio, Wallet } from 'lucide-react';

import { MoneyText } from '@/components/brand/MoneyText';
import { PageHeader, Panel, PanelBody } from '@/components/brand/Panel';
import { StatCard } from '@/components/brand/StatCard';
import { StatusBadge } from '@/components/brand/StatusBadge';
import { ConsoleTopbar } from '@/components/layout/ConsoleTopbar';
import { auth } from '@/lib/auth';
import { readAll } from '@/lib/db';
import { getNotifications } from '@/lib/queries';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function AdminRunnersPage() {
  const [session, runners, shipments, orders] = await Promise.all([
    auth(),
    readAll('runners'),
    readAll('shipments'),
    readAll('orders'),
  ]);

  const notifications = session?.user ? await getNotifications(session.user.id) : [];
  const orderReference = new Map(orders.map((order) => [order.id, order.reference]));

  const onlineCount = runners.filter((runner) => runner.online).length;
  const totalDeliveries = runners.reduce((sum, runner) => sum + runner.deliveries_completed, 0);
  const totalEarningsMtd = runners.reduce((sum, runner) => sum + runner.earnings_mtd, 0);
  const activeShipments = shipments.filter((shipment) => shipment.status !== 'DELIVERED' && shipment.status !== 'FAILED');

  return (
    <>
      <ConsoleTopbar
        title="Runners"
        breadcrumb={[{ label: 'Admin console' }, { label: 'Runners' }]}
        notifications={notifications}
      />

      <div className="mx-auto max-w-console space-y-5 px-6 py-6">
        <PageHeader
          eyebrow="Operations"
          title="Runner roster"
          description={`${runners.length} runners on the platform, ${onlineCount} online right now.`}
        />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Online now"
            value={onlineCount}
            format="number"
            accent={onlineCount > 0 ? 'forest' : 'ink'}
            hint={`of ${runners.length} runners`}
            icon={<Radio size={16} strokeWidth={1.5} />}
          />
          <StatCard
            label="Active shipments"
            value={activeShipments.length}
            format="number"
            accent="gold"
            hint="in progress right now"
            icon={<Bike size={16} strokeWidth={1.5} />}
          />
          <StatCard
            label="Deliveries, lifetime"
            value={totalDeliveries}
            format="number"
            accent="ink"
            hint="completed across the fleet"
            icon={<PackageCheck size={16} strokeWidth={1.5} />}
          />
          <StatCard
            label="Earnings paid, MTD"
            value={totalEarningsMtd}
            format="money"
            accent="forest"
            hint="fleet-wide"
            icon={<Wallet size={16} strokeWidth={1.5} />}
          />
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {runners.map((runner) => {
            const mine = shipments.filter((shipment) => shipment.runner_id === runner.id);
            const active = mine.filter((shipment) => shipment.status !== 'DELIVERED' && shipment.status !== 'FAILED');

            return (
              <Panel key={runner.id} className="overflow-hidden">
                <PanelBody className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink/[0.06] font-mono text-[13px] font-semibold text-ink">
                        {runner.initials}
                        <span
                          className={cn(
                            'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface-raised',
                            runner.online ? 'bg-forest' : 'bg-inert-ink',
                          )}
                        />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-semibold text-ink">{runner.name}</p>
                        <p className="text-[11.5px] text-muted">{runner.city}</p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium',
                        runner.online ? 'bg-forest-wash text-forest-ink' : 'bg-inert-wash text-inert-ink',
                      )}
                    >
                      {runner.online ? 'Online' : 'Offline'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 border-t border-hairline pt-3.5 text-[12.5px]">
                    <div>
                      <p className="text-muted">Vehicle</p>
                      <p className="mt-0.5 text-ink">{runner.vehicle}</p>
                    </div>
                    <div>
                      <p className="text-muted">Plate</p>
                      <p className="mt-0.5 font-mono tabular-nums text-ink">{runner.plate}</p>
                    </div>
                    <div>
                      <p className="text-muted">Rating</p>
                      <p className="mt-0.5 font-mono tabular-nums text-ink">{runner.rating.toFixed(1)}★</p>
                    </div>
                    <div>
                      <p className="text-muted">Deliveries</p>
                      <p className="mt-0.5 font-mono tabular-nums text-ink">{runner.deliveries_completed}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-hairline pt-3.5">
                    <div>
                      <p className="text-[11px] text-muted">Earnings MTD</p>
                      <MoneyText amount={runner.earnings_mtd} size="md" tone="gold" className="mt-0.5 block" />
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-muted">Lifetime</p>
                      <MoneyText amount={runner.earnings_total} size="sm" tone="muted" className="mt-0.5 block" />
                    </div>
                  </div>
                </PanelBody>

                <div className="border-t border-hairline bg-surface px-5 py-3.5">
                  <p className="eyebrow mb-2.5">Active shipments ({active.length})</p>
                  {active.length === 0 ? (
                    <p className="text-[12px] text-muted">Nothing in progress right now.</p>
                  ) : (
                    <ul className="space-y-2">
                      {active.map((shipment) => (
                        <li key={shipment.id} className="flex items-center justify-between gap-2 text-[12px]">
                          <span className="min-w-0 truncate text-body">
                            <span className="font-mono text-[11px] text-muted">
                              {orderReference.get(shipment.order_id) ?? shipment.order_id}
                            </span>{' '}
                            {shipment.pickup_name} → {shipment.dropoff_name}
                          </span>
                          <StatusBadge status={shipment.status} size="sm" />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </Panel>
            );
          })}
        </div>
      </div>
    </>
  );
}
