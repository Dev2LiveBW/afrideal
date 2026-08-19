import { PageHeader } from '@/components/brand/Panel';
import { ConsoleTopbar } from '@/components/layout/ConsoleTopbar';
import { auth } from '@/lib/auth';
import { readAll } from '@/lib/db';
import { getNotifications } from '@/lib/queries';

import { SuppliersTable } from './SuppliersTable';

export const dynamic = 'force-dynamic';

export default async function AdminSuppliersPage() {
  const [session, suppliers] = await Promise.all([auth(), readAll('suppliers')]);
  const notifications = session?.user ? await getNotifications(session.user.id) : [];
  const canDecide = session?.user ? ['SUPER_ADMIN', 'OPERATIONS_ADMIN'].includes(session.user.role) : false;

  const sorted = [...suppliers].sort((a, b) => {
    // Pending applications first — that is the queue this page exists to clear.
    if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
    if (b.status === 'PENDING' && a.status !== 'PENDING') return 1;
    return b.joined_at.localeCompare(a.joined_at);
  });

  return (
    <>
      <ConsoleTopbar
        title="Suppliers"
        breadcrumb={[{ label: 'Admin console' }, { label: 'Suppliers' }]}
        notifications={notifications}
      />

      <div className="mx-auto max-w-console px-6 py-6">
        <PageHeader
          eyebrow="Commerce"
          title="Suppliers"
          description={`${suppliers.length} suppliers registered across Botswana and South Africa.`}
        />

        <SuppliersTable suppliers={sorted} canDecide={canDecide} />
      </div>
    </>
  );
}
