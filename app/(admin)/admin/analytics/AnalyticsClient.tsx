'use client';

import { useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';

import { AprReportPanel } from '@/app/(admin)/admin/_components/AprReportPanel';
import { TabButton } from '@/app/(admin)/admin/_components/TabButton';
import { MoneyText } from '@/components/brand/MoneyText';
import { Panel, PanelBody, PanelHeader } from '@/components/brand/Panel';
import { StatCard } from '@/components/brand/StatCard';
import { GMVChart, RevenueBars, SupplierScoreBar } from '@/components/charts/Charts';

import type { AnalyticsData, AnalyticsPeriod } from './types';

const PERIODS: { id: AnalyticsPeriod; label: string }[] = [
  { id: 'MTD', label: 'Month to date' },
  { id: 'QTD', label: 'Quarter to date' },
  { id: 'YTD', label: 'Year to date' },
];

export function AnalyticsClient({
  initialPeriod,
  initialData,
}: {
  initialPeriod: AnalyticsPeriod;
  initialData: AnalyticsData;
}) {
  const [period, setPeriod] = useState<AnalyticsPeriod>(initialPeriod);
  const [data, setData] = useState<AnalyticsData>(initialData);
  const [loading, setLoading] = useState(false);

  async function changePeriod(next: AnalyticsPeriod) {
    if (next === period || loading) return;
    setPeriod(next);
    setLoading(true);
    try {
      const response = await fetch(`/api/analytics?period=${next}`);
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error ?? 'Could not load analytics for that period.');
      setData(json as AnalyticsData);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load analytics for that period.');
      setPeriod(period);
    } finally {
      setLoading(false);
    }
  }

  const periodLabel = PERIODS.find((entry) => entry.id === period)?.label ?? period;

  return (
    <div>
      <div className="mb-5 flex gap-2">
        {PERIODS.map((entry) => (
          <TabButton key={entry.id} label={entry.label} active={period === entry.id} onClick={() => changePeriod(entry.id)} />
        ))}
      </div>

      <div className={loading ? 'space-y-5 opacity-50 transition-opacity' : 'space-y-5 transition-opacity'}>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label={`GMV — ${period}`}
            value={data.period_gmv}
            format="money"
            accent="gold"
            hint={`${data.order_count} billable orders`}
          />
          <StatCard
            label="Average order value"
            value={data.average_order_value}
            format="money"
            accent="ink"
            hint="per billable order"
          />
          <StatCard
            label="Gross margin"
            value={data.gross_margin}
            format="money"
            accent="forest"
            hint={`${data.margin_pct.toFixed(1)}% of GMV`}
          />
          <StatCard
            label="Platform revenue"
            value={data.total_revenue}
            format="money"
            accent="gold"
            hint="commissions + subscriptions + featured"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-hairline bg-surface-raised px-5 py-3">
          <p className="text-[12.5px] text-body">
            Lifetime GMV across every supplier — not scoped to {period}, shown for context only
          </p>
          <MoneyText amount={data.lifetime_gmv} size="md" tone="muted" />
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Panel className="lg:col-span-2">
            <PanelHeader title={`GMV trend — ${periodLabel}`} description="Daily platform GMV, cancelled orders excluded" />
            <PanelBody>
              <GMVChart data={data.trend} />
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader title="Revenue by stream" description={periodLabel} />
            <PanelBody>
              <RevenueBars data={data.revenue_streams} />
            </PanelBody>
          </Panel>
        </div>

        <Panel className="overflow-hidden">
          <PanelHeader title="Top suppliers" description="Ranked by lifetime GMV, verified suppliers only" />
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Supplier</th>
                  <th>Lifetime GMV</th>
                  <th>Orders</th>
                  <th>Reliability</th>
                  <th>Fulfilment</th>
                  <th className="text-right">Rating</th>
                </tr>
              </thead>
              <tbody>
                {data.top_suppliers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-[12.5px] text-muted">
                      No verified suppliers yet.
                    </td>
                  </tr>
                ) : (
                  data.top_suppliers.map((supplier) => (
                    <tr key={supplier.id}>
                      <td>
                        <Link
                          href={`/admin/suppliers/${supplier.id}`}
                          className="font-medium text-ink transition-colors hover:text-gold-dark"
                        >
                          {supplier.name}
                        </Link>
                      </td>
                      <td>
                        <MoneyText amount={supplier.gmv} size="sm" />
                      </td>
                      <td className="font-mono text-[12.5px] tabular-nums text-body">{supplier.orders}</td>
                      <td className="font-mono text-[12.5px] tabular-nums text-ink">{supplier.score}/100</td>
                      <td className="font-mono text-[12.5px] tabular-nums text-ink">{supplier.fulfilment}%</td>
                      <td className="text-right font-mono text-[12.5px] tabular-nums text-ink">
                        {supplier.rating.toFixed(1)}★
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Panel>

        {data.top_suppliers.length > 0 && (
          <Panel>
            <PanelHeader title="Supplier score comparison" description="Reliability vs fulfilment rate, top suppliers" />
            <PanelBody>
              <SupplierScoreBar
                data={data.top_suppliers.slice(0, 8).map((supplier) => ({
                  name: supplier.name,
                  score: supplier.score,
                  fulfilment: supplier.fulfilment,
                }))}
              />
            </PanelBody>
          </Panel>
        )}

        <AprReportPanel
          totalRevenue={data.apr.total_revenue}
          exclusions={data.apr.exclusions}
          qualifyingRevenue={data.apr.qualifying_revenue}
          rate={data.apr.rate}
          revenueShareDue={data.apr.revenue_share_due}
          periodLabel={periodLabel}
        />
      </div>
    </div>
  );
}
