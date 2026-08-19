import { PageHeader } from '@/components/brand/Panel';
import { ConsoleTopbar } from '@/components/layout/ConsoleTopbar';
import { auth } from '@/lib/auth';
import { readAll } from '@/lib/db';
import { getNotifications } from '@/lib/queries';

import { DisputeQueue, type DisputeRow } from './DisputeQueue';

export const dynamic = 'force-dynamic';

export default async function AdminDisputesPage() {
  const [session, disputes, orders, suppliers, escrowRecords] = await Promise.all([
    auth(),
    readAll('disputes'),
    readAll('orders'),
    readAll('suppliers'),
    readAll('escrow'),
  ]);

  const notifications = session?.user ? await getNotifications(session.user.id) : [];
  const canResolve = session?.user ? ['SUPER_ADMIN', 'OPERATIONS_ADMIN'].includes(session.user.role) : false;

  const orderReference = new Map(orders.map((order) => [order.id, order.reference]));
  const supplierName = new Map(suppliers.map((supplier) => [supplier.id, supplier.name]));
  const escrowById = new Map(escrowRecords.map((record) => [record.id, record]));

  const rows: DisputeRow[] = [...disputes]
    .sort((a, b) => {
      // Open first, then whichever SLA clock expires soonest.
      const rank = (status: string) => (status === 'OPEN' ? 0 : status === 'UNDER_REVIEW' ? 1 : 2);
      const rankDiff = rank(a.status) - rank(b.status);
      return rankDiff !== 0 ? rankDiff : a.sla_due_at.localeCompare(b.sla_due_at);
    })
    .map((dispute) => ({
      dispute,
      orderReference: orderReference.get(dispute.order_id) ?? dispute.order_id,
      supplierName: supplierName.get(dispute.supplier_id) ?? dispute.supplier_id,
      escrowAmount: escrowById.get(dispute.escrow_id)?.amount ?? 0,
    }));

  return (
    <>
      <ConsoleTopbar
        title="Disputes"
        breadcrumb={[{ label: 'Admin console' }, { label: 'Disputes' }]}
        notifications={notifications}
      />

      <div className="mx-auto max-w-console px-6 py-6">
        <PageHeader
          eyebrow="Money"
          title="Dispute queue"
          description="Every open claim carries a five-day SLA clock from the moment it is raised."
        />

        <DisputeQueue rows={rows} canResolve={canResolve} />
      </div>
    </>
  );
}
