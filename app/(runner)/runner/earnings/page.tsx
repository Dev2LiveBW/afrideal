import { CalendarClock, PackageCheck, ShieldAlert, TrendingUp, Wallet } from 'lucide-react';

import { EmptyState, PageHeader, Panel, PanelBody, PanelHeader } from '@/components/brand/Panel';
import { StatCard } from '@/components/brand/StatCard';
import { MoneyText } from '@/components/brand/MoneyText';
import { EarningsChart } from '@/components/charts/Charts';
import { dateTime } from '@/lib/format';
import { auth } from '@/lib/auth';
import { getRunnerWorkspace } from '@/lib/queries';
import { buildRunnerEarningsSeries } from '../../_lib/earnings';

export const dynamic = 'force-dynamic';

export default async function RunnerEarningsPage() {
  const session = await auth();
  const runnerId = session?.user.runner_id ?? null;
  const workspace = runnerId ? await getRunnerWorkspace(runnerId) : null;

  if (!workspace?.runner) {
    return (
      <EmptyState
        icon={<ShieldAlert size={22} strokeWidth={1.5} />}
        title="No runner profile linked"
        description="This account isn't linked to a runner record, so there are no earnings to show."
      />
    );
  }

  const { runner, completed } = workspace;
  const series = buildRunnerEarningsSeries(completed);
  const deliveries = [...completed].sort((a, b) => (b.delivered_at ?? '').localeCompare(a.delivered_at ?? ''));

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Runner Portal" title="Earnings" description="What you've made and when it's paid out." />

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Earnings MTD"
          value={runner.earnings_mtd}
          format="money"
          accent="gold"
          icon={<Wallet size={16} strokeWidth={1.5} />}
        />
        <StatCard
          label="Lifetime earnings"
          value={runner.earnings_total}
          format="money"
          accent="gold"
          icon={<TrendingUp size={16} strokeWidth={1.5} />}
        />
      </div>

      <StatCard
        label="Deliveries completed"
        value={runner.deliveries_completed}
        accent="forest"
        icon={<PackageCheck size={16} strokeWidth={1.5} />}
        hint="Lifetime"
        className="w-full"
      />

      <Panel>
        <PanelHeader title="Earnings trend" description="Payout by month" />
        <PanelBody>
          {series.length > 0 ? (
            <EarningsChart data={series} />
          ) : (
            <EmptyState
              icon={<TrendingUp size={20} strokeWidth={1.5} />}
              title="No completed deliveries yet"
              description="Your payout trend will build up here as you complete jobs."
              className="py-10"
            />
          )}
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader title="Completed deliveries" description={`${deliveries.length} total`} />
        {deliveries.length === 0 ? (
          <EmptyState
            icon={<PackageCheck size={20} strokeWidth={1.5} />}
            title="No deliveries yet"
            description="Completed jobs and their payouts will show up here."
            className="py-10"
          />
        ) : (
          <ul className="divide-y divide-hairline">
            {deliveries.map((shipment) => (
              <li key={shipment.id} className="flex items-center gap-3 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-medium text-ink">{shipment.dropoff_name}</p>
                  <p className="truncate text-[11.5px] text-muted">
                    {shipment.dropoff_address} · {shipment.distance_km.toFixed(1)} km
                  </p>
                  {shipment.delivered_at && (
                    <p className="mt-0.5 font-mono text-[10.5px] tabular-nums text-muted">
                      {dateTime(shipment.delivered_at)}
                    </p>
                  )}
                </div>
                <MoneyText amount={shipment.payout} size="md" tone="gold" />
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel>
        <PanelHeader title="Payout schedule" />
        <PanelBody className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-50 text-gold-dark">
            <CalendarClock size={17} strokeWidth={1.5} />
          </span>
          <p className="text-[13px] leading-6 text-body">
            Payouts are transferred weekly, every Friday, to your registered Orange Money or bank account. This is a
            fixed platform policy in this preview build, not something you can change per runner.
          </p>
        </PanelBody>
      </Panel>
    </div>
  );
}
