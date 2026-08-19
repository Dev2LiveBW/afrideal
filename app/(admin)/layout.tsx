import { redirect } from 'next/navigation';
import {
  AlertTriangle,
  BarChart3,
  Bike,
  Building2,
  LayoutDashboard,
  Lock,
  Package,
  Settings as SettingsIcon,
  ShoppingCart,
  Tags,
} from 'lucide-react';

import { ConsoleSidebar, type NavSection } from '@/components/layout/ConsoleSidebar';
import { initialsOf } from '@/lib/format';
import { ADMIN_ROLES, ROLE_LABELS, auth, canAccessAdminPath } from '@/lib/auth';
import { getAdminBadges } from '@/lib/queries';
import type { Role } from '@/types';

/**
 * Admin console shell.
 *
 * One sidebar, filtered per role, wraps every /admin/* page. Finance sees
 * only the money surfaces it is scoped to; operations sees everything except
 * settings; super admin sees all of it. The same `canAccessAdminPath` rule
 * that middleware.ts enforces at the edge decides what shows up here, so the
 * nav never offers a link that would immediately bounce the operator back.
 */

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) {
    redirect('/login');
  }

  const role = session.user.role as Role;
  const badges = await getAdminBadges();

  const sections: NavSection[] = [
    {
      heading: 'Overview',
      items: [
        {
          href: '/admin/dashboard',
          label: 'Dashboard',
          icon: <LayoutDashboard size={16} strokeWidth={1.5} />,
        },
        {
          href: '/admin/analytics',
          label: 'Analytics',
          icon: <BarChart3 size={16} strokeWidth={1.5} />,
        },
      ],
    },
    {
      heading: 'Commerce',
      items: [
        { href: '/admin/products', label: 'Products', icon: <Package size={16} strokeWidth={1.5} /> },
        {
          href: '/admin/suppliers',
          label: 'Suppliers',
          icon: <Building2 size={16} strokeWidth={1.5} />,
          badge: badges.pendingSuppliers,
        },
        {
          href: '/admin/orders',
          label: 'Orders',
          icon: <ShoppingCart size={16} strokeWidth={1.5} />,
          badge: badges.awaitingConfirmation,
        },
      ],
    },
    {
      heading: 'Money',
      items: [
        {
          href: '/admin/escrow',
          label: 'Escrow',
          icon: <Lock size={16} strokeWidth={1.5} />,
          badge: badges.heldEscrow,
        },
        {
          href: '/admin/disputes',
          label: 'Disputes',
          icon: <AlertTriangle size={16} strokeWidth={1.5} />,
          badge: badges.openDisputes,
        },
        { href: '/admin/pricing', label: 'Pricing', icon: <Tags size={16} strokeWidth={1.5} /> },
      ],
    },
    {
      heading: 'Operations',
      items: [
        { href: '/admin/runners', label: 'Runners', icon: <Bike size={16} strokeWidth={1.5} /> },
        {
          href: '/admin/settings',
          label: 'Settings',
          icon: <SettingsIcon size={16} strokeWidth={1.5} />,
        },
      ],
    },
  ]
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => canAccessAdminPath(role, item.href)),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <div className="flex min-h-screen">
      <ConsoleSidebar
        sections={sections}
        tone="dark"
        portalLabel="Admin Console"
        user={{
          name: session.user.name ?? 'Admin',
          avatar: session.user.avatar || initialsOf(session.user.name ?? 'Admin'),
          roleLabel: ROLE_LABELS[role],
        }}
      />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
