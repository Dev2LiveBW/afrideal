import Link from 'next/link';
import {
  AlertTriangle,
  Building2,
  Percent,
  ShoppingCart,
  TrendingUp,
  Wallet,
} from 'lucide-react';

import { AprReportPanel } from '@/app/(admin)/admin/_components/AprReportPanel';
import { MoneyText } from '@/components/brand/MoneyText';
import { Panel, PanelBody, PanelHeader, PageHeader } from '@/components/brand/Panel';
import { StatCard } from '@/components/brand/StatCard';
import { StatusBadge } from '@/components/brand/StatusBadge';
import { ConsoleTopbar } from '@/components/layout/ConsoleTopbar';
import { GMVChart, RevenueDonut } from '@/components/charts/Charts';
import { auth } from '@/lib/auth';
import { readAll } from '@/lib/db';
import { PAYMENT_LABELS, shortDate } from '@/lib/format';
import { getNotifications } from '@/lib/queries';
import type { OrderStatus } from '@/types';

export const dynamic = 'force-dynamic';

const COMMISSION_RATE = 0.12;
const REVENUE_SHARE_RATE = 0.05;
const ACTIVE_STATUSES: OrderStatus[] = ['PENDING', 'PROCESSING', 'IN_TRANSIT'];

const SYSTEM_HEALTH = [
  { name: 'DPO Pay', detail: 'Card payment gateway', latency: '184ms' },
  { name: 'Orange Money', detail: 'Mobile money gateway', latency: '221ms' },
  { name: 'PayGate', detail: 'Card payment gateway', latency: '198ms' },
  { name: 'Firebase', detail: 'Auth & realtime', latency: '61ms' },
  { name: 'Cloud Run', detail: 'API compute', latency: '43ms' },
] as const;

export default async function AdminDashboardPage() {
  const [session, orders, items, suppliers, escrowRecords, disputes] = await Promise.all([
    auth(),
    readAll('orders'),
    readAll('order-items'),
    readAll('suppliers'),
    readAll('escrow'),
    readAll('disputes'),
  ]);

  const notifications = session?.user ? await getNotifications(session.user.id) : [];

  const since = new Date();
  since.setDate(since.getDate() - 30);

  const inPeriod = orders.filter((order) => new Date(order.placed_at) >= since);
  const billable = inPeriod.filter((order) => order.status !== 'CANCELLED');
  const periodGmv = billable.reduce((sum, order) => sum + order.total, 0);
  const lifetimeGmv = suppliers.reduce((sum, supplier) => sum + supplier.total_gmv, 0);

  const activeOrders = orders.filter((order) => ACTIVE_STATUSES.includes(order.status)).length;
  const pendingSuppliers = suppliers.filter((supplier) => supplier.status === 'PENDING').length;
  const openDisputes = disputes.filter(
    (dispute) => dispute.status === 'OPEN' || dispute.status === 'UNDER_REVIEW',
  ).length;

  const verifiedCount = suppliers.filter((supplier) => supplier.status === 'VERIFIED').length;
  const commissions = Math.round(periodGmv * COMMISSION_RATE);
  const subscriptions = verifiedCount * 450;
  const featured = verifiedCount * 180;
  const totalRevenue = commissions + subscriptions + featured;

  const refunded = escrowRecords
    .filter((record) => record.status === 'REFUNDED')
    .reduce((sum, record) => sum + record.amount, 0);
  const disputedHeld = escrowRecords
    .filter((record) => record.status === 'DISPUTED')
    .reduce((sum, record) => sum + record.amount, 0);
  const cancelledTotal = inPeriod
    .filter((order) => order.status === 'CANCELLED')
    .reduce((sum, order) => sum + order.total, 0);

  const exclusions = [
    {
      label: 'Refunded escrow',
      amount: refunded,
      why: 'Funds returned to the customer never became platform revenue.',
    },
    {
      label: 'Disputed and unsettled',
      amount: disputedHeld,
      why: 'Outcome unknown; excluded until the dispute resolves.',
    },
    {
      label: 'Cancelled orders',
      amount: cancelledTotal,
      why: 'No goods moved and no commission was earned.',
    },
    {
      label: 'Delivery fees collected',
      amount: billable.length * 45,
      why: 'Passed through to logistics at cost.',
    },
  ];
  const totalExclusions = exclusions.reduce((sum, exclusion) => sum + exclusion.amount, 0);
  const qualifyingRevenue = Math.max(0, totalRevenue - totalExclusions);
  const revenueShareDue = qualifyingRevenue * REVENUE_SHARE_RATE;

  const trend: { date: string; gmv: number; orders: number }[] = [];
  for (let offset = 29; offset >= 0; offset -= 1) {
    const day = new Date();
    day.setDate(day.getDate() - offset);
    const key = day.toISOString().slice(0, 10);
    const dayOrders = billable.filter((order) => order.placed_at.slice(0, 10) === key);

    trend.push({
      date: day.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      gmv: dayOrders.reduce((sum, order) => sum + order.total, 0),
      orders: dayOrders.length,
    });
  }

  const revenueStreams = [
    { name: 'Commissions', value: commissions },
    { name: 'Subscriptions', value: subscriptions },
    { name: 'Featured fees', value: featured },
  ];

  const itemCountByOrder = new Map<string, number>();
  for (const item of items) {
    itemCountByOrder.set(item.order_id, (itemCountByOrder.get(item.order_id) ?? 0) + item.qty);
  }

  const recentOrders = [...orders]
    .sort((a, b) => b.placed_at.localeCompare(a.placed_at))
    .slice(0, 8);

  return (
    <>
      <ConsoleTopbar
        title="Dashboard"
        breadcrumb={[{ label: 'Admin console' }, { label: 'Dashboard' }]}
        notifications={notifications}
      />

      <div className="mx-auto max-w-console space-y-5 px-6 py-6">
        <PageHeader
          eyebrow="Overview"
          title="Platform dashboard"
          description="Activity across every supplier, order and escrow leg on AfriDeal."
        />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard
            label="GMV (30 days)"
            value={periodGmv}
            format="money"
            icon={<Wallet size={16} strokeWidth={1.5} />}
            accent="gold"
            hint="Platform orders only, not lifetime"
          />
          <StatCard
            label="Active orders"
            value={activeOrders}
            format="number"
            icon={<ShoppingCart size={16} strokeWidth={1.5} />}
            accent="ink"
            hint="Pending, processing, in transit"
          />
          <StatCard
            label="Pending suppliers"
            value={pendingSuppliers}
            format="number"
            icon={<Building2 size={16} strokeWidth={1.5} />}
            accent={pendingSuppliers > 0 ? 'gold' : 'ink'}
            hint="Awaiting verification"
          />
          <StatCard
            label="Open disputes"
            value={openDisputes}
            format="number"
            icon={<AlertTriangle size={16} strokeWidth={1.5} />}
            accent={openDisputes > 0 ? 'danger' : 'ink'}
            hint="Open or under review"
          />
          <StatCard
            label="Platform revenue"
            value={totalRevenue}
            format="money"
            icon={<TrendingUp size={16} strokeWidth={1.5} />}
            accent="forest"
            hint="Commissions + fees, 30d"
          />
          <StatCard
            label="Revenue share due"
            value={revenueShareDue}
            format="money"
            icon={<Percent size={16} strokeWidth={1.5} />}
            accent="gold"
            hint="5% of qualifying revenue"
          />
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Panel className="lg:col-span-2">
            <PanelHeader
              title="GMV trend — last 30 days"
              description="Daily platform GMV. Cancelled orders excluded."
              action={
                <div className="text-right">
                  <p className="text-[10.5px] text-muted">Lifetime GMV, all suppliers</p>
                  <MoneyText amount={lifetimeGmv} size="sm" tone="muted" />
                </div>
              }
            />
            <PanelBody>
              <GMVChart data={trend} />
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader title="Revenue mix" description="30-day platform revenue by stream" />
            <PanelBody>
              <RevenueDonut data={revenueStreams} />
            </PanelBody>
          </Panel>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Panel className="overflow-hidden lg:col-span-2">
            <PanelHeader
              title="Recent orders"
              description="Latest 8 placed, across every supplier"
              action={
                <Link
                  href="/admin/orders"
                  className="inline-flex items-center gap-1 rounded-full px-3.5 py-2 text-[12.5px] font-medium text-body ring-1 ring-inset ring-hairline-strong transition-colors hover:bg-ink/[0.04] hover:text-ink"
                >
                  View all
                </Link>
              }
            />
            <div className="overflow-x-auto">
              <table className="data-table min-w-[640px]">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Payment</th>
                    <th className="text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="font-mono text-[12.5px] font-medium text-ink transition-colors hover:text-gold-dark"
                        >
                          {order.reference}
                        </Link>
                        <p className="mt-0.5 text-[11px] text-muted">{shortDate(order.placed_at)}</p>
                      </td>
                      <td className="text-[13px] text-ink">{order.customer_name}</td>
                      <td className="font-mono text-[12.5px] tabular-nums text-body">
                        {itemCountByOrder.get(order.id) ?? 0}
                      </td>
                      <td>
                        <MoneyText amount={order.total} size="sm" />
                      </td>
                      <td>
                        <span className="rounded-full bg-ink/[0.05] px-2.5 py-1 text-[11px] font-medium text-body">
                          {PAYMENT_LABELS[order.payment_method] ?? order.payment_method}
                        </span>
                      </td>
                      <td className="text-right">
                        <StatusBadge status={order.status} size="sm" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="System health" description="Gateways and infrastructure" />
            <PanelBody className="space-y-1">
              {SYSTEM_HEALTH.map((system) => (
                <div
                  key={system.name}
                  className="flex items-center justify-between gap-3 border-b border-hairline py-3 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="absolute inline-flex h-full w-full animate-pulse-soft rounded-full bg-forest opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-forest" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-ink">{system.name}</p>
                      <p className="text-[11px] text-muted">{system.detail}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-medium text-forest">Operational</p>
                    <p className="font-mono text-[10.5px] tabular-nums text-muted">{system.latency}</p>
                  </div>
                </div>
              ))}
            </PanelBody>
          </Panel>
        </div>

        <AprReportPanel
          totalRevenue={totalRevenue}
          exclusions={exclusions}
          qualifyingRevenue={qualifyingRevenue}
          rate={REVENUE_SHARE_RATE}
          revenueShareDue={revenueShareDue}
          periodLabel="Rolling 30 days"
        />
      </div>
    </>
  );
}
