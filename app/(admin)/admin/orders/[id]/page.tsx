import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Bike, CreditCard, MapPin, Star, User } from 'lucide-react';

import { MoneyText } from '@/components/brand/MoneyText';
import { PageHeader, Panel, PanelBody, PanelHeader } from '@/components/brand/Panel';
import { StatusBadge } from '@/components/brand/StatusBadge';
import { EscrowPanel } from '@/components/orders/EscrowPanel';
import { OrderTimeline, OrderTimelineLog } from '@/components/orders/OrderTimeline';
import { ConsoleTopbar } from '@/components/layout/ConsoleTopbar';
import { Swatch } from '@/components/storefront/Swatch';
import { auth } from '@/lib/auth';
import { readAll } from '@/lib/db';
import { PAYMENT_LABELS, dateTime, shortDate } from '@/lib/format';
import { getNotifications, getOrderDetail } from '@/lib/queries';

import { OrderNotes } from './OrderNotes';

export const dynamic = 'force-dynamic';

export default async function AdminOrderDetailPage({ params }: { params: { id: string } }) {
  const [session, detail, shipments, runners, allImages] = await Promise.all([
    auth(),
    getOrderDetail(params.id),
    readAll('shipments'),
    readAll('runners'),
    readAll('product-images'),
  ]);

  if (!detail) notFound();
  const { order, items, legs, escrow } = detail;

  const notifications = session?.user ? await getNotifications(session.user.id) : [];
  const runnerById = new Map(runners.map((runner) => [runner.id, runner]));
  const primaryImage = new Map(
    allImages.filter((image) => image.sort_order === 0).map((image) => [image.product_id, image]),
  );
  const legIds = new Set(legs.map((leg) => leg.id));
  const orderShipments = shipments.filter((shipment) => legIds.has(shipment.supplier_order_id));

  return (
    <>
      <ConsoleTopbar
        title={order.reference}
        breadcrumb={[
          { label: 'Admin console' },
          { label: 'Orders', href: '/admin/orders' },
          { label: order.reference },
        ]}
        notifications={notifications}
      />

      <div className="mx-auto max-w-console space-y-5 px-6 py-6">
        <PageHeader
          eyebrow={`Placed ${shortDate(order.placed_at)}`}
          title={order.reference}
          description={`${items.length} line item${items.length === 1 ? '' : 's'} · ${PAYMENT_LABELS[order.payment_method] ?? order.payment_method} · delivering to ${order.delivery_city}`}
          action={<StatusBadge status={order.status} />}
        />

        <Panel>
          <PanelBody>
            <OrderTimeline timeline={order.timeline} status={order.status} />
          </PanelBody>
        </Panel>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* ── Customer ─────────────────────────────────────────────────── */}
          <Panel>
            <PanelHeader title="Customer" />
            <PanelBody className="space-y-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink/[0.06] text-ink">
                  <User size={15} strokeWidth={1.5} />
                </span>
                <p className="text-[13.5px] font-medium text-ink">{order.customer_name}</p>
              </div>
              <div className="flex items-start gap-2 text-[12.5px] text-body">
                <MapPin size={13} strokeWidth={1.5} className="mt-0.5 shrink-0 text-muted" />
                <span>
                  {order.delivery_address}, {order.delivery_city}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[12.5px] text-body">
                <CreditCard size={13} strokeWidth={1.5} className="shrink-0 text-muted" />
                <span>
                  {PAYMENT_LABELS[order.payment_method] ?? order.payment_method} ·{' '}
                  <span className="font-mono text-[11.5px] text-muted">{order.payment_reference}</span>
                </span>
              </div>
              <div className="border-t border-hairline pt-3 text-[12.5px]">
                <p className="text-muted">Order total</p>
                <MoneyText amount={order.total} size="lg" tone="gold" className="mt-0.5 block" />
                <p className="mt-1 text-[11px] text-muted">
                  Subtotal <span className="font-mono">{order.subtotal.toFixed(2)}</span> + delivery{' '}
                  <span className="font-mono">{order.delivery_fee.toFixed(2)}</span>
                </p>
              </div>
            </PanelBody>
          </Panel>

          {/* ── Supplier leg(s) ──────────────────────────────────────────── */}
          <Panel>
            <PanelHeader title={legs.length === 1 ? 'Supplier' : `Suppliers (${legs.length})`} />
            <PanelBody className="space-y-4 divide-y divide-hairline [&>*+*]:pt-4">
              {legs.map((leg) => (
                <div key={leg.id}>
                  <div className="flex items-center justify-between gap-2">
                    {leg.supplier ? (
                      <Link
                        href={`/admin/suppliers/${leg.supplier.id}`}
                        className="text-[13.5px] font-medium text-ink transition-colors hover:text-gold-dark"
                      >
                        {leg.supplier.name}
                      </Link>
                    ) : (
                      <p className="text-[13.5px] font-medium text-ink">Unknown supplier</p>
                    )}
                    <StatusBadge status={leg.status} size="sm" />
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-[12px]">
                    <span className="text-muted">
                      Cost <MoneyText amount={leg.supplier_subtotal} size="xs" className="ml-1" />
                    </span>
                    <span className="text-muted">
                      Margin <MoneyText amount={leg.platform_margin} size="xs" tone="forest" className="ml-1" />
                    </span>
                  </div>
                  <p className="mt-1.5 text-[11.5px] leading-4 text-muted">{leg.selection_reason}</p>
                </div>
              ))}
            </PanelBody>
          </Panel>

          {/* ── Runner / shipment(s) ─────────────────────────────────────── */}
          <Panel>
            <PanelHeader title={orderShipments.length === 1 ? 'Runner' : `Runners (${orderShipments.length})`} />
            <PanelBody className="space-y-4 divide-y divide-hairline [&>*+*]:pt-4">
              {orderShipments.length === 0 ? (
                <p className="text-[12.5px] text-muted">No shipment has been created for this order yet.</p>
              ) : (
                orderShipments.map((shipment) => {
                  const runner = shipment.runner_id ? runnerById.get(shipment.runner_id) : null;
                  return (
                    <div key={shipment.id}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink/[0.06] text-ink">
                            <Bike size={13} strokeWidth={1.5} />
                          </span>
                          <p className="text-[13px] font-medium text-ink">{runner ? runner.name : 'Unassigned'}</p>
                        </div>
                        <StatusBadge status={shipment.status} size="sm" />
                      </div>
                      {runner && (
                        <p className="mt-1.5 flex items-center gap-1 text-[11.5px] text-muted">
                          <Star size={11} strokeWidth={1.5} className="fill-gold text-gold" />
                          {runner.rating.toFixed(1)} · {runner.vehicle}
                        </p>
                      )}
                      <p className="mt-1.5 text-[11.5px] text-body">
                        {shipment.pickup_name} → {shipment.dropoff_name}
                      </p>
                      <div className="mt-1 flex items-center gap-3 text-[11px] text-muted">
                        <span>{shipment.distance_km} km</span>
                        <MoneyText amount={shipment.payout} size="xs" tone="muted" />
                        {shipment.delivered_at && <span>Delivered {shortDate(shipment.delivered_at)}</span>}
                      </div>
                    </div>
                  );
                })
              )}
            </PanelBody>
          </Panel>
        </div>

        {/* ── Line items ─────────────────────────────────────────────────── */}
        <Panel className="overflow-hidden">
          <PanelHeader title="Line items" description={`${items.length} line item${items.length === 1 ? '' : 's'}`} />
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-[36%]">Product</th>
                  <th>Qty</th>
                  <th>Unit price</th>
                  <th>Line total</th>
                  <th className="text-right">Supplier</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Link
                        href={`/admin/products/${item.product_id}`}
                        className="flex items-center gap-2 font-medium text-ink transition-colors hover:text-gold-dark"
                      >
                        <Swatch
                          image={primaryImage.get(item.product_id)}
                          fallback={['#ECEBE7', '#8A918B']}
                          emoji={item.emoji}
                          className="h-8 w-8 shrink-0 rounded"
                          glyphClassName="text-[15px]"
                          zoomOnHover={false}
                        />
                        <span>
                          {item.product_name}
                          <span className="block text-[11px] font-normal text-muted">{item.variant_label}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="font-mono text-[12.5px] tabular-nums text-body">{item.qty}</td>
                    <td>
                      <MoneyText amount={item.unit_price} size="sm" />
                    </td>
                    <td>
                      <MoneyText amount={item.line_total} size="sm" tone="gold" />
                    </td>
                    <td className="text-right text-[12.5px] text-muted">
                      {legs.find((leg) => leg.supplier_id === item.supplier_id)?.supplier?.name ?? item.supplier_id}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        {/* ── Escrow legs ────────────────────────────────────────────────── */}
        <div>
          <p className="eyebrow mb-3">
            Escrow {escrow.length > 0 && `(${escrow.length} leg${escrow.length === 1 ? '' : 's'})`}
          </p>
          {escrow.length === 0 ? (
            <Panel>
              <PanelBody className="text-[12.5px] text-muted">No escrow has been recorded for this order.</PanelBody>
            </Panel>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {escrow.map((record) => (
                <EscrowPanel
                  key={record.id}
                  record={record}
                  supplierName={legs.find((leg) => leg.id === record.supplier_order_id)?.supplier?.name ?? 'Supplier'}
                  canAct
                />
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Panel>
            <PanelHeader title="Timeline log" description="Every recorded event, most recent first" />
            <PanelBody>
              {order.timeline.length === 0 ? (
                <p className="text-[12.5px] text-muted">No events recorded yet.</p>
              ) : (
                <OrderTimelineLog timeline={order.timeline} />
              )}
              <p className="mt-4 border-t border-hairline pt-3 text-[11px] text-muted">
                Last updated {dateTime(order.updated_at)}
              </p>
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader title="Internal notes" description="Staff-only context on this order" />
            <PanelBody>
              <OrderNotes orderId={order.id} initialNote={order.internal_notes} />
            </PanelBody>
          </Panel>
        </div>

        <Link href="/admin/orders" className="inline-block text-[12.5px] font-medium text-muted hover:text-ink">
          ← Back to orders
        </Link>
      </div>
    </>
  );
}
