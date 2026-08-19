import { PageHeader } from '@/components/brand/Panel';
import { ConsoleTopbar } from '@/components/layout/ConsoleTopbar';
import { auth } from '@/lib/auth';
import { readAll } from '@/lib/db';
import { summarise } from '@/lib/escrow';
import { getNotifications } from '@/lib/queries';

import { AnalyticsClient } from './AnalyticsClient';
import type { AnalyticsData, AnalyticsPeriod } from './types';

export const dynamic = 'force-dynamic';

const COMMISSION_RATE = 0.12;
const REVENUE_SHARE_RATE = 0.05;

/**
 * Mirrors `GET /api/analytics` exactly, so the server-rendered first paint
 * and the client's later refetch on period change always agree. Kept local
 * to this page rather than in `lib/` because it reaches into route-level
 * business constants (commission rate, revenue share rate) that belong to
 * the API contract, not the shared query layer.
 */
async function computeAnalytics(period: AnalyticsPeriod): Promise<AnalyticsData> {
  const days = period === 'YTD' ? 365 : period === 'QTD' ? 90 : 30;

  const [orders, items, suppliers, escrowRecords, settlements] = await Promise.all([
    readAll('orders'),
    readAll('order-items'),
    readAll('suppliers'),
    readAll('escrow'),
    readAll('settlements'),
  ]);

  const since = new Date();
  since.setDate(since.getDate() - days);

  const inPeriod = orders.filter((order) => new Date(order.placed_at) >= since);
  const billable = inPeriod.filter((order) => order.status !== 'CANCELLED');
  const periodGmv = billable.reduce((sum, order) => sum + order.total, 0);

  const itemsByOrder = new Map<string, typeof items>();
  for (const item of items) {
    itemsByOrder.set(item.order_id, [...(itemsByOrder.get(item.order_id) ?? []), item]);
  }

  const grossMargin = billable.reduce((sum, order) => {
    const lines = itemsByOrder.get(order.id) ?? [];
    return sum + lines.reduce((lineSum, item) => lineSum + (item.unit_price - item.supplier_cost) * item.qty, 0);
  }, 0);

  const trend: { date: string; gmv: number; orders: number }[] = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
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
  const cancelled = inPeriod
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
    { label: 'Cancelled orders', amount: cancelled, why: 'No goods moved and no commission was earned.' },
    {
      label: 'Delivery fees collected',
      amount: billable.length * 45,
      why: 'Passed through to logistics at cost.',
    },
  ];

  const totalExclusions = exclusions.reduce((sum, exclusion) => sum + exclusion.amount, 0);
  const qualifyingRevenue = Math.max(0, totalRevenue - totalExclusions);
  const revenueShareDue = qualifyingRevenue * REVENUE_SHARE_RATE;

  const topSuppliers = suppliers
    .filter((supplier) => supplier.status === 'VERIFIED')
    .map((supplier) => ({
      id: supplier.id,
      name: supplier.name,
      score: supplier.reliability_score,
      fulfilment: supplier.fulfilment_rate,
      rating: supplier.rating,
      gmv: supplier.total_gmv,
      orders: supplier.orders_count,
    }))
    .sort((a, b) => b.gmv - a.gmv);

  return {
    period,
    period_gmv: periodGmv,
    lifetime_gmv: suppliers.reduce((sum, supplier) => sum + supplier.total_gmv, 0),
    order_count: billable.length,
    average_order_value: billable.length === 0 ? 0 : periodGmv / billable.length,
    gross_margin: grossMargin,
    margin_pct: periodGmv === 0 ? 0 : (grossMargin / periodGmv) * 100,
    trend,
    revenue_streams: [
      { name: 'Commissions', value: commissions },
      { name: 'Subscriptions', value: subscriptions },
      { name: 'Featured fees', value: featured },
    ],
    total_revenue: totalRevenue,
    apr: {
      total_revenue: totalRevenue,
      exclusions,
      total_exclusions: totalExclusions,
      qualifying_revenue: qualifyingRevenue,
      rate: REVENUE_SHARE_RATE,
      revenue_share_due: revenueShareDue,
    },
    escrow: summarise(escrowRecords),
    top_suppliers: topSuppliers,
    settlements_pending: settlements.filter((settlement) => settlement.status === 'PENDING').length,
  };
}

export default async function AdminAnalyticsPage() {
  const [session, data] = await Promise.all([auth(), computeAnalytics('MTD')]);
  const notifications = session?.user ? await getNotifications(session.user.id) : [];

  return (
    <>
      <ConsoleTopbar
        title="Analytics"
        breadcrumb={[{ label: 'Admin console' }, { label: 'Analytics' }]}
        notifications={notifications}
      />

      <div className="mx-auto max-w-console space-y-5 px-6 py-6">
        <PageHeader
          eyebrow="Overview"
          title="Platform analytics"
          description="Revenue, margin and supplier performance. Switch the period to recompute everything below."
        />

        <AnalyticsClient initialPeriod="MTD" initialData={data} />
      </div>
    </>
  );
}
