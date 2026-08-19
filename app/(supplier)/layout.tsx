import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { ClipboardList, FileText, LayoutDashboard, Package, Wallet } from 'lucide-react';

import { ConsoleSidebar, type NavSection } from '@/components/layout/ConsoleSidebar';
import { ConsoleTopbar } from '@/components/layout/ConsoleTopbar';
import { auth, ROLE_LABELS } from '@/lib/auth';
import { getNotifications } from '@/lib/queries';

/**
 * Supplier Portal shell.
 *
 * Every page beneath this scopes its own data to `session.user.supplier_id`
 * — this layout only gates access. A supplier who isn't signed in bounces to
 * /login; a signed-in user with the wrong role bounces home rather than
 * seeing a 404, since the middleware already redirected them here in the
 * first place and a 404 would just be confusing.
 */

const NAV: NavSection[] = [
  {
    items: [
      { href: '/supplier/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={17} strokeWidth={1.5} /> },
      { href: '/supplier/products', label: 'Products', icon: <Package size={17} strokeWidth={1.5} /> },
      { href: '/supplier/quotes', label: 'Quotes', icon: <FileText size={17} strokeWidth={1.5} /> },
      { href: '/supplier/orders', label: 'Orders', icon: <ClipboardList size={17} strokeWidth={1.5} /> },
      { href: '/supplier/earnings', label: 'Earnings', icon: <Wallet size={17} strokeWidth={1.5} /> },
    ],
  },
];

export default async function SupplierLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'SUPPLIER_OWNER' && session.user.role !== 'SUPER_ADMIN') redirect('/');

  const notifications = await getNotifications(session.user.id);

  return (
    <div className="flex min-h-screen bg-surface">
      <ConsoleSidebar
        sections={NAV}
        tone="light"
        portalLabel="Supplier Portal"
        user={{
          name: session.user.name ?? 'Supplier',
          avatar: session.user.avatar ?? 'S',
          roleLabel: ROLE_LABELS[session.user.role],
        }}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <ConsoleTopbar title="Supplier Portal" notifications={notifications} />
        <main className="mx-auto w-full max-w-console flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
