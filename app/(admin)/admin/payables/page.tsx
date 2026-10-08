import { AlertOctagon, AlertTriangle, Clock3, FileText, HandCoins } from 'lucide-react';

import { PageHeader, Panel, PanelHeader } from '@/components/brand/Panel';
import { StatCard } from '@/components/brand/StatCard';
import { ConsoleTopbar } from '@/components/layout/ConsoleTopbar';
import { auth } from '@/lib/auth';
import { readAll } from '@/lib/db';
import { summarise } from '@/lib/payables';
import { effectiveOrderStatus } from '@/lib/payments/status';
import { getNotifications } from '@/lib/queries';

import { AwaitingPaymentQueue, type AwaitingRow } from './AwaitingPaymentQueue';
import { PayablesQueue, type PayableRow } from './PayablesQueue';

export const dynamic = 'force-dynamic';

/** How long an order has been waiting, in words a person reading a statement wants. */
function sinceLabel(placedAt: string): string {
  const hours = Math.floor((Date.now() - new Date(placedAt).getTime()) / 3_600_000);
  if (hours < 1) return 'under an hour';
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'}`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'}`;
}

/** How far back a bank transfer whose window closed is still offered to finance. */
const LATE_TRANSFER_DAYS = 30;

export default async function AdminPayablesPage() {
  const [session, records, suppliers, orders, payments] = await Promise.all([
    auth(),
    readAll('supplier-payables'),
    readAll('suppliers'),
    readAll('orders'),
    readAll('payments'),
  ]);

  const notifications = session?.user ? await getNotifications(session.user.id) : [];
  const summary = summarise(records);

  const supplierName = new Map(suppliers.map((supplier) => [supplier.id, supplier.name]));
  const orderReference = new Map(orders.map((order) => [order.id, order.reference]));

  // Spec 0003: the orders whose money has not arrived, plus bank transfers whose
  // window closed in the last 30 days. A transfer can land after day 7 (a long
  // weekend, a holiday), and AC-7 says that money reopens the order; without these
  // rows finance had no way to apply it short of a hand written API call. Only the
  // clock's cancellations are listed: an order a person cancelled stays closed.
  const lateCutoff = Date.now() - LATE_TRANSFER_DAYS * 86_400_000;
  const awaiting: AwaitingRow[] = orders
    .flatMap((order): AwaitingRow[] => {
      const status = effectiveOrderStatus(order, payments);
      if (status === 'AWAITING_PAYMENT') {
        return [{ order, waitingFor: sinceLabel(order.placed_at), late: false }];
      }

      const clockCancelled =
        status === 'CANCELLED' && (order.status === 'AWAITING_PAYMENT' || order.cancel_reason === 'EXPIRED');
      const recent = new Date(order.payment_expires_at).getTime() >= lateCutoff;
      if (order.payment_method === 'EFT' && clockCancelled && recent) {
        return [{ order, waitingFor: sinceLabel(order.placed_at), late: true }];
      }

      return [];
    })
    .sort((a, b) => a.order.placed_at.localeCompare(b.order.placed_at));

  // Confirming money is finance's authority, not operations'.
  const canConfirm = ['FINANCE_ADMIN', 'SUPER_ADMIN'].includes(session?.user.role ?? '');

  const rows: PayableRow[] = [...records]
    .sort((a, b) => b.raised_at.localeCompare(a.raised_at))
    .map((record) => ({
      record,
      supplierName: supplierName.get(record.supplier_id) ?? record.supplier_id,
      orderReference: orderReference.get(record.order_id) ?? record.order_id,
    }));

  return (
    <>
      <ConsoleTopbar
        title="Supplier payables"
        breadcrumb={[{ label: 'Admin console' }, { label: 'Supplier payables' }]}
        notifications={notifications}
      />

      <div className="mx-auto max-w-console space-y-5 px-6 py-6">
        <PageHeader
          eyebrow="Money"
          title="Supplier payables"
          description="What AfriDeal owes its suppliers for goods procured on customer orders, and what has been paid."
        />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            label="Outstanding"
            value={summary.totalPending}
            format="money"
            accent="gold"
            hint={`${summary.pendingCount} invoice${summary.pendingCount === 1 ? '' : 's'}`}
            icon={<FileText size={16} strokeWidth={1.5} />}
          />
          <StatCard
            label="Settled MTD"
            value={summary.settledMtd}
            format="money"
            accent="forest"
            hint={`${summary.settledMtdCount} invoice${summary.settledMtdCount === 1 ? '' : 's'}`}
            icon={<HandCoins size={16} strokeWidth={1.5} />}
          />
          <StatCard
            label="On hold"
            value={summary.onHold}
            format="money"
            accent={summary.onHoldCount > 0 ? 'danger' : 'ink'}
            hint={`${summary.onHoldCount} under review`}
            icon={<AlertTriangle size={16} strokeWidth={1.5} />}
          />
          <StatCard
            label="Avg days to settle"
            value={summary.avgDaysToSettle}
            format="number"
            accent="ink"
            hint="from invoice to payment"
            icon={<Clock3 size={16} strokeWidth={1.5} />}
          />
          <StatCard
            label="Overdue"
            value={summary.overdueCount}
            format="number"
            accent={summary.overdueCount > 0 ? 'danger' : 'ink'}
            hint="past their payment terms"
            icon={<AlertOctagon size={16} strokeWidth={1.5} />}
          />
        </div>

        <Panel>
          <PanelHeader
            title="Orders waiting on a bank transfer"
            description="No supplier has been asked to prepare these goods yet. Confirming one raises its supplier order and procurement invoice."
          />
          <AwaitingPaymentQueue rows={awaiting} canConfirm={canConfirm} />
        </Panel>

        <PayablesQueue rows={rows} />
      </div>
    </>
  );
}
