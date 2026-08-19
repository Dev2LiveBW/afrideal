import { CalendarClock, Lock, ShieldAlert, TrendingUp, Unlock, Wallet } from 'lucide-react';

import { EmptyState, PageHeader, Panel, PanelBody, PanelHeader } from '@/components/brand/Panel';
import { StatCard } from '@/components/brand/StatCard';
import { MoneyText } from '@/components/brand/MoneyText';
import { StatusBadge } from '@/components/brand/StatusBadge';
import { EarningsChart, RevenueDonut } from '@/components/charts/Charts';
import { dateTime } from '@/lib/format';
import { auth } from '@/lib/auth';
import { getSupplierWorkspace } from '@/lib/queries';
import { COMMISSION_RATE, buildEarningsSeries, lifetimeNet, mtdGross, mtdNet } from '../../_lib/earnings';

export const dynamic = 'force-dynamic';

export default async function SupplierEarningsPage() {
  const session = await auth();
  const supplierId = session?.user.supplier_id ?? null;
  const workspace = supplierId ? await getSupplierWorkspace(supplierId) : null;

  if (!workspace?.supplier) {
    return (
      <EmptyState
        icon={<ShieldAlert size={22} strokeWidth={1.5} />}
        title="No supplier profile linked"
        description="This account isn't linked to a supplier record, so there are no earnings to show."
      />
    );
  }

  const gross = mtdGross(workspace);
  const net = mtdNet(workspace);
  const commission = gross - net;
  const lifetime = lifetimeNet(workspace);
  const series = buildEarningsSeries(workspace);

  const held = workspace.escrow
    .filter((record) => record.status === 'HELD' || record.status === 'DISPUTED')
    .reduce((sum, record) => sum + record.amount, 0);
  const released = workspace.escrow
    .filter((record) => record.status === 'RELEASED')
    .reduce((sum, record) => sum + record.amount, 0);
  const refunded = workspace.escrow
    .filter((record) => record.status === 'REFUNDED')
    .reduce((sum, record) => sum + record.amount, 0);
  const escrowTotal = held + released + refunded;

  const settlements = [...workspace.settlements].sort((a, b) => b.period.localeCompare(a.period));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Earnings"
        title="Your earnings"
        description="What you've made on AfriDeal, what's still in escrow, and when it lands in your account."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Earnings MTD" value={net} format="money" accent="gold" icon={<Wallet size={16} strokeWidth={1.5} />} hint="Net of 12% commission" />
        <StatCard label="Lifetime earnings" value={lifetime} format="money" accent="gold" icon={<TrendingUp size={16} strokeWidth={1.5} />} hint="All settled + this month" />
        <StatCard label="Escrow held" value={held} format="money" accent="ink" icon={<Lock size={16} strokeWidth={1.5} />} hint="Not yet released" />
        <StatCard label="Escrow released" value={released} format="money" accent="forest" icon={<Unlock size={16} strokeWidth={1.5} />} hint="Paid out to date" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <Panel>
          <PanelHeader title="Earnings trend" description="Net payout by month, after commission" />
          <PanelBody>
            <EarningsChart data={series} />
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader title="Escrow breakdown" description="Across every order routed to you" />
          <PanelBody>
            {escrowTotal > 0 ? (
              <RevenueDonut
                data={[
                  { name: 'Held', value: held },
                  { name: 'Released', value: released },
                  { name: 'Refunded', value: refunded },
                ]}
              />
            ) : (
              <EmptyState
                icon={<Lock size={20} strokeWidth={1.5} />}
                title="No escrow activity yet"
                description="Funds held against your orders will show up here."
                className="py-10"
              />
            )}
          </PanelBody>
        </Panel>
      </div>

      <Panel>
        <PanelHeader
          title="Settlements"
          description="Paid monthly, in arrears — this month's row appears once the period closes."
        />
        {settlements.length === 0 ? (
          <EmptyState
            icon={<CalendarClock size={20} strokeWidth={1.5} />}
            title="No settlements yet"
            description="Your first settlement will appear here at the end of the month."
            className="py-10"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table min-w-[640px]">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Gross</th>
                  <th>Commission (12%)</th>
                  <th>Net paid</th>
                  <th>Status</th>
                  <th className="text-right">Paid on</th>
                </tr>
              </thead>
              <tbody>
                {settlements.map((settlement) => (
                  <tr key={settlement.id}>
                    <td className="font-mono text-[13px] tabular-nums text-ink">{settlement.period}</td>
                    <td>
                      <MoneyText amount={settlement.gross} size="sm" />
                    </td>
                    <td>
                      <MoneyText amount={settlement.commission} size="sm" tone="muted" />
                    </td>
                    <td>
                      <MoneyText amount={settlement.net} size="sm" tone="gold" />
                    </td>
                    <td>
                      <StatusBadge status={settlement.status} size="sm" />
                    </td>
                    <td className="text-right text-[12.5px] text-body">
                      {settlement.paid_at ? dateTime(settlement.paid_at) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel>
        <PanelHeader title="How commission works" description="The same 12% rate applies to every settlement" />
        <PanelBody>
          <div className="flex flex-wrap items-stretch rounded-md border border-hairline">
            <div className="px-4 py-3.5">
              <p className="text-[11px] text-muted">This month&rsquo;s gross</p>
              <MoneyText amount={gross} size="lg" className="mt-0.5 block" />
            </div>
            <span className="flex items-center px-1 text-muted">−</span>
            <div className="px-4 py-3.5">
              <p className="text-[11px] text-muted">Commission ({Math.round(COMMISSION_RATE * 100)}%)</p>
              <MoneyText amount={commission} size="lg" tone="muted" className="mt-0.5 block" />
            </div>
            <span className="flex items-center px-1 text-muted">=</span>
            <div className="flex-1 rounded-r-md bg-gradient-to-r from-gold-50 to-gold-50/40 px-4 py-3.5">
              <p className="text-[11px] font-medium text-gold-700">Net to you</p>
              <MoneyText amount={net} size="lg" tone="gold" className="mt-0.5 block" />
            </div>
          </div>
          <p className="mt-4 text-[13px] leading-6 text-body">
            AfriDeal charges a flat {Math.round(COMMISSION_RATE * 100)}% commission on the gross value you bill the
            platform for fulfilled orders. Gross is the sum of your{' '}
            <span className="font-medium text-ink">supplier subtotal</span> across every order that month; net is
            what is transferred to you at settlement. This is separate from AfriDeal&rsquo;s own retail markup,
            which is never deducted from your payout.
          </p>
        </PanelBody>
      </Panel>
    </div>
  );
}
