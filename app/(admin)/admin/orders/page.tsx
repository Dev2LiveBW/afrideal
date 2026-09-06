import { PageHeader } from '@/components/brand/Panel';
import { ConsoleTopbar } from '@/components/layout/ConsoleTopbar';
import { auth } from '@/lib/auth';
import { readAll } from '@/lib/db';
import { getNotifications } from '@/lib/queries';

import { OrdersTable, type OrderRow } from './OrdersTable';

export const dynamic = 'force-dynamic';

export default async function AdminOrdersPage() {
  const [session, orders, items, legs, payableRecords, suppliers] = await Promise.all([
    auth(),
    readAll('orders'),
    readAll('order-items'),
    readAll('supplier-orders'),
    readAll('supplier-payables'),
    readAll('suppliers'),
  ]);

  const notifications = session?.user ? await getNotifications(session.user.id) : [];

  const supplierName = new Map(suppliers.map((supplier) => [supplier.id, supplier.name]));
  const itemCountByOrder = new Map<string, number>();
  for (const item of items) {
    itemCountByOrder.set(item.order_id, (itemCountByOrder.get(item.order_id) ?? 0) + item.qty);
  }

  const rows: OrderRow[] = [...orders]
    .sort((a, b) => b.placed_at.localeCompare(a.placed_at))
    .map((order) => {
      const orderLegs = legs.filter((leg) => leg.order_id === order.id);
      const pendingPayables = payableRecords.filter((record) => record.order_id === order.id && record.status === 'PENDING');

      return {
        order,
        itemCount: itemCountByOrder.get(order.id) ?? 0,
        legs: orderLegs.map((leg) => ({
          id: leg.id,
          supplierName: supplierName.get(leg.supplier_id) ?? leg.supplier_id,
          status: leg.status,
        })),
        pendingPayablesIds: pendingPayables.map((record) => record.id),
        pendingPayablesTotal: pendingPayables.reduce((sum, record) => sum + record.amount, 0),
      };
    });

  return (
    <>
      <ConsoleTopbar
        title="Orders"
        breadcrumb={[{ label: 'Admin console' }, { label: 'Orders' }]}
        notifications={notifications}
      />

      <div className="mx-auto max-w-console px-6 py-6">
        <PageHeader
          eyebrow="Commerce"
          title="Orders"
          description={`${orders.length} orders placed across every supplier and payment gateway.`}
        />

        <OrdersTable rows={rows} />
      </div>
    </>
  );
}
