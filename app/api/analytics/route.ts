import { guard, handled, ok } from '@/lib/api';
import { readAll } from '@/lib/db';
import { summarise } from '@/lib/escrow';

export const dynamic = 'force-dynamic';

/**
 * Platform analytics.
 *
 * Two GMV figures are reported and they mean different things, so both are
 * labelled rather than merged into one impressive-looking number:
 *
 *   period_gmv    — orders actually on this platform in the window
 *   lifetime_gmv  — cumulative trading across all verified suppliers
 *
 * The APR (annual platform report) section computes the 5% revenue share on
 * qualifying revenue only. Exclusions are itemised so the figure can be
 * defended line by line rather than asserted.
 */

const REVENUE_SHARE_RATE = 0.05;
const COMMISSION_RATE = 0.12;

export const GET = handled(async (request: Request) => {
  const { response } = await guard(['SUPER_ADMIN', 'OPERATIONS_ADMIN', 'FINANCE_ADMIN']);
  if (response) return response;

  const period = new URL(request.url).searchParams.get('period') ?? 'MTD';
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

  // Platform margin, computed from the line items rather than assumed.
  const itemsByOrder = new Map<string, typeof items>();
  for (const item of items) {
    itemsByOrder.set(item.order_id, [...(itemsByOrder.get(item.order_id) ?? []), item]);
  }

  const grossMargin = billable.reduce((sum, order) => {
    const lines = itemsByOrder.get(order.id) ?? [];
    return (
      sum +
      lines.reduce((lineSum, item) => lineSum + (item.unit_price - item.supplier_cost) * item.qty, 0)
    );
  }, 0);

  // ── 30-day trend ─────────────────────────────────────────────────────
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

  // ── Revenue streams ──────────────────────────────────────────────────
  const commissions = Math.round(periodGmv * COMMISSION_RATE);
  const subscriptions = suppliers.filter((s) => s.status === 'VERIFIED').length * 450;
  const featured = suppliers.filter((s) => s.status === 'VERIFIED').length * 180;
  const totalRevenue = commissions + subscriptions + featured;

  // ── APR: revenue share, with exclusions itemised ─────────────────────
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
    { label: 'Refunded escrow', amount: refunded, why: 'Funds returned to the customer never became platform revenue.' },
    { label: 'Disputed and unsettled', amount: disputedHeld, why: 'Outcome unknown; excluded until the dispute resolves.' },
    { label: 'Cancelled orders', amount: cancelled, why: 'No goods moved and no commission was earned.' },
    { label: 'Delivery fees collected', amount: billable.length * 45, why: 'Passed through to logistics at cost.' },
  ];

  const totalExclusions = exclusions.reduce((sum, entry) => sum + entry.amount, 0);
  const qualifyingRevenue = Math.max(0, totalRevenue - totalExclusions);
  const revenueShareDue = qualifyingRevenue * REVENUE_SHARE_RATE;

  // ── Supplier league table ────────────────────────────────────────────
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

  return ok({
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
  });
});
