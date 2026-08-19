import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Building2, Mail, MapPin, Phone, Star } from 'lucide-react';

import { MoneyText } from '@/components/brand/MoneyText';
import { PageHeader, Panel, PanelBody } from '@/components/brand/Panel';
import { StatusBadge } from '@/components/brand/StatusBadge';
import { ConsoleTopbar } from '@/components/layout/ConsoleTopbar';
import { auth } from '@/lib/auth';
import { readAll } from '@/lib/db';
import { shortDate } from '@/lib/format';
import { getNotifications, getSupplierWorkspace } from '@/lib/queries';

import { SupplierDetailTabs } from './SupplierDetailTabs';

export const dynamic = 'force-dynamic';

export default async function AdminSupplierDetailPage({ params }: { params: { id: string } }) {
  const [session, workspace, allSuppliers] = await Promise.all([
    auth(),
    getSupplierWorkspace(params.id),
    readAll('suppliers'),
  ]);

  if (!workspace.supplier) notFound();
  const supplier = workspace.supplier;

  const notifications = session?.user ? await getNotifications(session.user.id) : [];
  const canDecide = session?.user ? ['SUPER_ADMIN', 'OPERATIONS_ADMIN'].includes(session.user.role) : false;

  const maxOrders = Math.max(1, ...allSuppliers.map((candidate) => candidate.orders_count));

  const performanceMetrics = [
    {
      label: 'Reliability',
      value: supplier.reliability_score,
      hint: 'Composite score used by the routing engine',
    },
    {
      label: 'Fulfilment',
      value: supplier.fulfilment_rate,
      hint: 'Share of orders fulfilled without incident',
    },
    {
      label: 'Rating',
      value: Math.min(100, supplier.rating * 20),
      hint: `${supplier.rating.toFixed(1)} out of 5, scaled to 100`,
    },
    {
      label: 'Speed',
      value: Math.max(0, Math.min(100, 100 - supplier.avg_fulfilment_days * 10)),
      hint: `${supplier.avg_fulfilment_days}-day average fulfilment`,
    },
    {
      label: 'Volume',
      value: Math.min(100, Math.round((supplier.orders_count / maxOrders) * 100)),
      hint: `${supplier.orders_count} orders lifetime, relative to the top supplier`,
    },
  ];
  const radarData = performanceMetrics.map((metric) => ({ metric: metric.label, value: metric.value }));

  return (
    <>
      <ConsoleTopbar
        title={supplier.name}
        breadcrumb={[
          { label: 'Admin console' },
          { label: 'Suppliers', href: '/admin/suppliers' },
          { label: supplier.name },
        ]}
        notifications={notifications}
      />

      <div className="mx-auto max-w-console space-y-5 px-6 py-6">
        <PageHeader
          eyebrow={`${supplier.country === 'BW' ? 'Botswana' : 'South Africa'} · ${supplier.city}`}
          title={supplier.name}
          description={supplier.legal_name}
          action={<StatusBadge status={supplier.status} />}
        />

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-1">
            <Panel>
              <PanelBody className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink/[0.06] font-mono text-[13px] font-semibold text-ink">
                    {supplier.initials}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold text-ink">{supplier.name}</p>
                    <p className="flex items-center gap-1 text-[11.5px] text-muted">
                      <Star size={11} strokeWidth={1.5} className="fill-gold text-gold" />
                      {supplier.rating > 0 ? `${supplier.rating.toFixed(1)} rating` : 'Not yet rated'}
                    </p>
                  </div>
                </div>

                <dl className="space-y-2.5 border-t border-hairline pt-4 text-[12.5px]">
                  <div className="flex items-center gap-2 text-body">
                    <Mail size={13} strokeWidth={1.5} className="shrink-0 text-muted" />
                    <span className="truncate">{supplier.contact_email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-body">
                    <Phone size={13} strokeWidth={1.5} className="shrink-0 text-muted" />
                    {supplier.contact_phone}
                  </div>
                  <div className="flex items-center gap-2 text-body">
                    <MapPin size={13} strokeWidth={1.5} className="shrink-0 text-muted" />
                    {supplier.city}, {supplier.country}
                  </div>
                  <div className="flex items-center gap-2 text-body">
                    <Building2 size={13} strokeWidth={1.5} className="shrink-0 text-muted" />
                    <span className="truncate">Reg. {supplier.registration_no}</span>
                  </div>
                </dl>

                <p className="border-t border-hairline pt-3 text-[11.5px] text-muted">
                  Joined {shortDate(supplier.joined_at)}
                </p>
              </PanelBody>
            </Panel>

            <Panel>
              <PanelBody className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] text-muted">Lifetime GMV</p>
                  <MoneyText amount={supplier.total_gmv} size="lg" tone="gold" className="mt-1 block" />
                </div>
                <div>
                  <p className="text-[11px] text-muted">Orders</p>
                  <p className="mt-1 font-mono text-[19px] font-semibold tabular-nums text-ink">
                    {supplier.orders_count.toLocaleString('en-GB')}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-muted">Products listed</p>
                  <p className="mt-1 font-mono text-[19px] font-semibold tabular-nums text-ink">
                    {supplier.products_count}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-muted">Fulfilment rate</p>
                  <p className="mt-1 font-mono text-[19px] font-semibold tabular-nums text-ink">
                    {supplier.fulfilment_rate}%
                  </p>
                </div>
              </PanelBody>
            </Panel>
          </div>

          <div className="lg:col-span-2">
            <SupplierDetailTabs
              supplier={supplier}
              offers={workspace.offers}
              products={workspace.products}
              settlements={workspace.settlements}
              escrow={workspace.escrow}
              performanceMetrics={performanceMetrics}
              radarData={radarData}
              canDecide={canDecide}
            />
          </div>
        </div>

        <Link href="/admin/suppliers" className="inline-block text-[12.5px] font-medium text-muted hover:text-ink">
          ← Back to suppliers
        </Link>
      </div>
    </>
  );
}
