import Link from 'next/link';
import {
  ClipboardList,
  FileText,
  Package,
  ShieldAlert,
  ShoppingBag,
  Sparkles,
  Wallet,
} from 'lucide-react';

import { EmptyState, PageHeader, Panel, PanelBody, PanelHeader } from '@/components/brand/Panel';
import { StatCard } from '@/components/brand/StatCard';
import { StatusBadge } from '@/components/brand/StatusBadge';
import { EarningsChart } from '@/components/charts/Charts';
import { auth } from '@/lib/auth';
import { getSupplierWorkspace } from '@/lib/queries';
import { getQuoteInbox, slaChip } from '../../_lib/quotes';
import { buildEarningsSeries, mtdNet } from '../../_lib/earnings';

export const dynamic = 'force-dynamic';

const QUICK_LINKS = [
  { href: '/supplier/products', label: 'Products', hint: 'Manage your catalogue', icon: <Package size={18} strokeWidth={1.5} /> },
  { href: '/supplier/quotes', label: 'Quotes', hint: 'Respond to requests', icon: <FileText size={18} strokeWidth={1.5} /> },
  { href: '/supplier/orders', label: 'Orders', hint: 'Confirm and prepare', icon: <ShoppingBag size={18} strokeWidth={1.5} /> },
  { href: '/supplier/earnings', label: 'Earnings', hint: 'Settlements and payouts', icon: <Wallet size={18} strokeWidth={1.5} /> },
];

export default async function SupplierDashboardPage() {
  const session = await auth();
  const supplierId = session?.user.supplier_id ?? null;
  const workspace = supplierId ? await getSupplierWorkspace(supplierId) : null;

  if (!workspace?.supplier) {
    return (
      <EmptyState
        icon={<ShieldAlert size={22} strokeWidth={1.5} />}
        title="No supplier profile linked"
        description="This account isn't linked to a supplier record, so there's nothing to show here yet. Contact AfriDeal operations if you believe this is a mistake."
      />
    );
  }

  const { supplier } = workspace;
  const quoteInbox = getQuoteInbox(workspace);
  const pendingConfirmation = workspace.legs.filter((leg) => leg.status === 'AWAITING_CONFIRMATION');
  const activeListings = workspace.offers.filter((offer) => offer.active).length;
  const earningsSeries = buildEarningsSeries(workspace);
  const earningsMTD = mtdNet(workspace);

  const urgent = quoteInbox.slice(0, 6).map((quote) => ({
    id: quote.id,
    href: quote.kind === 'ORDER' ? '/supplier/orders' : '/supplier/quotes',
    title: quote.kind === 'ORDER' ? `Confirm order ${quote.orderRef ?? ''}`.trim() : `Respond — ${quote.productName}`,
    subtitle: `${quote.emoji} ${quote.productName}${quote.variantLabel ? ` · ${quote.variantLabel}` : ''} · qty ${quote.qty}`,
    chip: slaChip(quote.expiresAt),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Supplier Portal"
        title={`Welcome back, ${supplier.name}`}
        description="Here's what needs your attention today."
        action={
          <div className="flex items-center gap-2.5">
            <StatusBadge status={supplier.status} size="md" />
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Active listings"
          value={activeListings}
          icon={<Package size={16} strokeWidth={1.5} />}
          accent="ink"
          hint={`${workspace.products.length} product${workspace.products.length === 1 ? '' : 's'} total`}
        />
        <StatCard
          label="Pending quotes"
          value={quoteInbox.length}
          icon={<FileText size={16} strokeWidth={1.5} />}
          accent="gold"
          hint="Awaiting your response"
        />
        <StatCard
          label="Orders to confirm"
          value={pendingConfirmation.length}
          icon={<ClipboardList size={16} strokeWidth={1.5} />}
          accent={pendingConfirmation.length > 0 ? 'danger' : 'forest'}
          hint={pendingConfirmation.length > 0 ? 'Needs action' : 'All caught up'}
        />
        <StatCard
          label="Earnings MTD"
          value={earningsMTD}
          format="money"
          icon={<Wallet size={16} strokeWidth={1.5} />}
          accent="gold"
          hint="Net of 12% commission"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.05fr_1fr]">
        <Panel>
          <PanelHeader title="Urgent actions" description="Ordered by how soon they need a response." />
          <PanelBody className="p-0">
            {urgent.length === 0 ? (
              <EmptyState
                icon={<Sparkles size={20} strokeWidth={1.5} />}
                title="Nothing urgent"
                description="You're fully caught up. New quotes and orders will land here the moment they need you."
                className="py-10"
              />
            ) : (
              <ul className="divide-y divide-hairline">
                {urgent.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      className="flex items-center gap-3 px-5 py-3.5 transition-colors duration-200 hover:bg-ink/[0.025]"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-medium text-ink">{item.title}</p>
                        <p className="truncate text-[12px] text-muted">{item.subtitle}</p>
                      </div>
                      <span
                        className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 font-mono text-[10.5px] font-medium uppercase tracking-[0.06em] ${item.chip.className}`}
                      >
                        {item.chip.label}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader title="Earnings trend" description="Net payout by month, after commission" />
          <PanelBody>
            <EarningsChart data={earningsSeries} />
          </PanelBody>
        </Panel>
      </div>

      <div>
        <p className="eyebrow mb-3">Quick links</p>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group flex items-center gap-3 rounded-md border border-hairline bg-surface-raised p-4 shadow-card transition-shadow duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-lift"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-forest-wash text-forest transition-transform duration-300 group-hover:scale-105">
                {link.icon}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-medium text-ink">{link.label}</p>
                <p className="truncate text-[11.5px] text-muted">{link.hint}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
