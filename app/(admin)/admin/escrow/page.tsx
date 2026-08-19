import { AlertOctagon, AlertTriangle, Clock3, Lock, Unlock } from 'lucide-react';

import { PageHeader } from '@/components/brand/Panel';
import { StatCard } from '@/components/brand/StatCard';
import { ConsoleTopbar } from '@/components/layout/ConsoleTopbar';
import { auth } from '@/lib/auth';
import { readAll } from '@/lib/db';
import { summarise } from '@/lib/escrow';
import { getNotifications } from '@/lib/queries';

import { EscrowQueue, type EscrowRow } from './EscrowQueue';

export const dynamic = 'force-dynamic';

export default async function AdminEscrowPage() {
  const [session, records, suppliers, orders] = await Promise.all([
    auth(),
    readAll('escrow'),
    readAll('suppliers'),
    readAll('orders'),
  ]);

  const notifications = session?.user ? await getNotifications(session.user.id) : [];
  const summary = summarise(records);

  const supplierName = new Map(suppliers.map((supplier) => [supplier.id, supplier.name]));
  const orderReference = new Map(orders.map((order) => [order.id, order.reference]));

  const rows: EscrowRow[] = [...records]
    .sort((a, b) => b.held_at.localeCompare(a.held_at))
    .map((record) => ({
      record,
      supplierName: supplierName.get(record.supplier_id) ?? record.supplier_id,
      orderReference: orderReference.get(record.order_id) ?? record.order_id,
    }));

  return (
    <>
      <ConsoleTopbar
        title="Escrow"
        breadcrumb={[{ label: 'Admin console' }, { label: 'Escrow' }]}
        notifications={notifications}
      />

      <div className="mx-auto max-w-console space-y-5 px-6 py-6">
        <PageHeader
          eyebrow="Money"
          title="Escrow queue"
          description="Funds held on behalf of suppliers until delivery is confirmed or a dispute resolves."
        />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            label="Total held"
            value={summary.totalHeld}
            format="money"
            accent="gold"
            hint={`${summary.heldCount} record${summary.heldCount === 1 ? '' : 's'}`}
            icon={<Lock size={16} strokeWidth={1.5} />}
          />
          <StatCard
            label="Released MTD"
            value={summary.releasedMtd}
            format="money"
            accent="forest"
            hint={`${summary.releasedMtdCount} record${summary.releasedMtdCount === 1 ? '' : 's'}`}
            icon={<Unlock size={16} strokeWidth={1.5} />}
          />
          <StatCard
            label="Disputed"
            value={summary.disputed}
            format="money"
            accent={summary.disputedCount > 0 ? 'danger' : 'ink'}
            hint={`${summary.disputedCount} record${summary.disputedCount === 1 ? '' : 's'}`}
            icon={<AlertTriangle size={16} strokeWidth={1.5} />}
          />
          <StatCard
            label="Avg hold time"
            value={summary.avgHoldDays}
            format="number"
            accent="ink"
            hint="days, settled records"
            icon={<Clock3 size={16} strokeWidth={1.5} />}
          />
          <StatCard
            label="Overdue"
            value={summary.overdueCount}
            format="number"
            accent={summary.overdueCount > 0 ? 'danger' : 'ink'}
            hint="past their hold window"
            icon={<AlertOctagon size={16} strokeWidth={1.5} />}
          />
        </div>

        <EscrowQueue rows={rows} />
      </div>
    </>
  );
}
