import { AlertOctagon, AlertTriangle, Clock3, FileText, HandCoins } from 'lucide-react';

import { PageHeader } from '@/components/brand/Panel';
import { StatCard } from '@/components/brand/StatCard';
import { ConsoleTopbar } from '@/components/layout/ConsoleTopbar';
import { auth } from '@/lib/auth';
import { readAll } from '@/lib/db';
import { summarise } from '@/lib/payables';
import { getNotifications } from '@/lib/queries';

import { PayablesQueue, type PayableRow } from './PayablesQueue';

export const dynamic = 'force-dynamic';

export default async function AdminPayablesPage() {
  const [session, records, suppliers, orders] = await Promise.all([
    auth(),
    readAll('supplier-payables'),
    readAll('suppliers'),
    readAll('orders'),
  ]);

  const notifications = session?.user ? await getNotifications(session.user.id) : [];
  const summary = summarise(records);

  const supplierName = new Map(suppliers.map((supplier) => [supplier.id, supplier.name]));
  const orderReference = new Map(orders.map((order) => [order.id, order.reference]));

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

        <PayablesQueue rows={rows} />
      </div>
    </>
  );
}
