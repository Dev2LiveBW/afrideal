import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { CircleHelp, Lock, MapPin, RotateCcw, ShieldCheck } from 'lucide-react';

import { MoneyText } from '@/components/brand/MoneyText';
import { StatusBadge } from '@/components/brand/StatusBadge';
import { Enclosure } from '@/components/brand/Panel';
import { OrderTimeline } from '@/components/orders/OrderTimeline';
import { AccountSidebar, RunnerContactCard } from '@/components/storefront/AccountPanels';
import { Swatch } from '@/components/storefront/Swatch';
import { auth } from '@/lib/auth';
import { readAll } from '@/lib/db';
import { PAYMENT_LABELS, dateTime, shortDate } from '@/lib/format';
import { getOrderDetail } from '@/lib/queries';

import { OrderActions } from './OrderActions';

export const metadata: Metadata = { title: 'Order tracking' };
export const dynamic = 'force-dynamic';

export default async function OrderTrackingPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { placed?: string };
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const detail = await getOrderDetail(params.id);
  if (!detail) notFound();

  const { order, items, escrow } = detail;

  const isStaff = ['SUPER_ADMIN', 'OPERATIONS_ADMIN', 'FINANCE_ADMIN'].includes(session.user.role);
  if (order.customer_id !== session.user.id && !isStaff) notFound();

  const [shipments, runners, allOrders, images, products] = await Promise.all([
    readAll('shipments'),
    readAll('runners'),
    readAll('orders'),
    readAll('product-images'),
    readAll('products'),
  ]);

  // The runner card appears only once someone is actually carrying the order.
  const shipment = shipments.find(
    (entry) => entry.order_id === order.id && entry.status !== 'DELIVERED',
  );
  const runner = shipment?.runner_id
    ? (runners.find((entry) => entry.id === shipment.runner_id) ?? null)
    : null;

  const recent = allOrders
    .filter((entry) => entry.customer_id === order.customer_id && entry.id !== order.id)
    .sort((a, b) => b.placed_at.localeCompare(a.placed_at))
    .slice(0, 2);

  const held = escrow.filter((record) => record.status === 'HELD');
  const released = escrow.filter((record) => record.status === 'RELEASED');
  const disputed = escrow.filter((record) => record.status === 'DISPUTED');
  const totalHeld = held.reduce((sum, record) => sum + record.amount, 0);

  const canConfirm = order.status === 'IN_TRANSIT' || order.status === 'DELIVERED';
  const canDispute = held.length > 0 && order.status !== 'CANCELLED';

  const expected = new Date(order.placed_at);
  expected.setDate(expected.getDate() + 3);

  return (
    <div className="mx-auto max-w-market px-6 pb-24 pt-28">
      {searchParams.placed === '1' && (
        <div className="mb-7 flex items-start gap-3 rounded-md border border-forest/25 bg-forest-wash px-5 py-4">
          <ShieldCheck size={18} strokeWidth={1.5} className="mt-0.5 shrink-0 text-forest" />
          <div>
            <p className="text-[14px] font-semibold text-forest-ink">Order placed</p>
            <p className="mt-1 text-[13px] leading-5 text-forest-ink/85">
              Your payment is held in escrow.{' '}
              {escrow.length === 1 ? 'The supplier has' : `All ${escrow.length} suppliers have`} been
              notified and can start preparing, but none of them are paid until you confirm the goods
              arrived.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-10 lg:flex-row lg:gap-12">
        <AccountSidebar
          name={order.customer_name}
          avatar={session.user.avatar}
          active="Orders"
        />

        <div className="min-w-0 flex-1">
          {/* ── Order card ─────────────────────────────────────────────── */}
          <section className="rounded-lg border border-hairline bg-surface-raised p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <StatusBadge status={order.status} />
                  <h1 className="font-mono text-[22px] font-semibold tabular-nums tracking-tight text-ink">
                    {order.reference}
                  </h1>
                </div>
                <p className="mt-2 text-[13px] text-body">
                  Placed {dateTime(order.placed_at)}
                  {order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
                    <> · Expected by {shortDate(expected.toISOString())}</>
                  )}
                </p>
              </div>

              <Link
                href="/orders"
                className="inline-flex shrink-0 items-center gap-1.5 text-[13px] font-medium text-gold-dark transition-colors hover:text-ink"
              >
                <CircleHelp size={14} strokeWidth={1.5} />
                Need help?
              </Link>
            </div>

            <div className="mt-8">
              <OrderTimeline timeline={order.timeline} status={order.status} />
            </div>

            {runner && <RunnerContactCard runner={runner} />}
          </section>

          {/* ── Items ──────────────────────────────────────────────────── */}
          <section className="mt-6 overflow-hidden rounded-md border border-hairline bg-surface-raised">
            <header className="border-b border-hairline px-5 py-4">
              <h2 className="text-[15px] font-semibold text-ink">
                {items.length} {items.length === 1 ? 'item' : 'items'}
              </h2>
              {detail.legs.length > 1 && (
                <p className="mt-0.5 text-[12.5px] text-body">
                  Fulfilled by {detail.legs.length} suppliers. You still get one delivery and one
                  total.
                </p>
              )}
            </header>

            <ul className="divide-y divide-hairline">
              {items.map((item) => {
                const product = products.find((entry) => entry.id === item.product_id);
                const image = images.find(
                  (entry) => entry.product_id === item.product_id && entry.sort_order === 0,
                );

                return (
                  <li key={item.id} className="flex items-center gap-4 px-5 py-4">
                    <Link href={`/products/${item.product_id}`} className="shrink-0">
                      <Swatch
                        image={image}
                        fallback={product?.swatch ?? ['#2a2a2a', '#111111']}
                        emoji={item.emoji}
                        className="h-14 w-14 rounded"
                        glyphClassName="text-[20px] bottom-1 right-1.5"
                      />
                    </Link>

                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/products/${item.product_id}`}
                        className="text-[14px] font-medium text-ink transition-colors hover:text-gold-dark"
                      >
                        {item.product_name}
                      </Link>
                      <p className="mt-0.5 text-[12.5px] text-body">
                        {item.variant_label} · {item.qty} ×{' '}
                        <MoneyText amount={item.unit_price} size="xs" tone="muted" bare />
                      </p>
                    </div>

                    <MoneyText amount={item.line_total} size="sm" />
                  </li>
                );
              })}
            </ul>
          </section>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
            <section className="rounded-md border border-hairline bg-surface-raised p-5">
              <h2 className="text-[15px] font-semibold text-ink">Delivery</h2>
              <div className="mt-4 flex items-start gap-3">
                <MapPin size={16} strokeWidth={1.5} className="mt-0.5 shrink-0 text-muted" />
                <div>
                  <p className="text-[14px] text-ink">{order.delivery_address}</p>
                  <p className="text-[13px] text-body">{order.delivery_city}, Botswana</p>
                </div>
              </div>
            </section>

            <div className="space-y-4">
              <Enclosure>
                <div className="p-5">
                  <h2 className="text-[15px] font-semibold text-ink">Payment</h2>

                  <dl className="mt-4 space-y-3 text-[13.5px]">
                    <div className="flex items-center justify-between">
                      <dt className="text-body">Subtotal</dt>
                      <dd>
                        <MoneyText amount={order.subtotal} size="sm" />
                      </dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-body">Delivery</dt>
                      <dd>
                        <MoneyText amount={order.delivery_fee} size="sm" />
                      </dd>
                    </div>
                    <div className="flex items-baseline justify-between border-t border-hairline pt-3">
                      <dt className="font-medium text-ink">Total</dt>
                      <dd>
                        <MoneyText amount={order.total} size="lg" tone="gold" />
                      </dd>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <dt className="text-body">Paid with</dt>
                      <dd className="text-[13px] text-ink">
                        {PAYMENT_LABELS[order.payment_method] ?? order.payment_method}
                      </dd>
                    </div>
                  </dl>
                </div>
              </Enclosure>

              <div
                className={`rounded-md border px-5 py-4 ${
                  disputed.length > 0
                    ? 'border-danger/25 bg-danger-wash'
                    : held.length > 0
                      ? 'border-gold/25 bg-gold-50/70'
                      : 'border-forest/25 bg-forest-wash'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Lock
                    size={16}
                    strokeWidth={1.5}
                    className={`mt-0.5 shrink-0 ${
                      disputed.length > 0
                        ? 'text-danger-ink'
                        : held.length > 0
                          ? 'text-gold-700'
                          : 'text-forest'
                    }`}
                  />
                  <div className="min-w-0">
                    {disputed.length > 0 ? (
                      <>
                        <p className="text-[13px] font-semibold text-danger-ink">Funds frozen</p>
                        <p className="mt-1 text-[12.5px] leading-5 text-danger-ink/85">
                          You raised a dispute on this order. Nothing is paid to the supplier while
                          our team reviews it, and we will come back to you within five days.
                        </p>
                      </>
                    ) : held.length > 0 ? (
                      <>
                        <p className="text-[13px] font-semibold text-gold-700">
                          <MoneyText amount={totalHeld} size="sm" tone="gold" /> held in escrow
                        </p>
                        <p className="mt-1 text-[12.5px] leading-5 text-gold-700/85">
                          We are holding your payment. It goes to the supplier only when you confirm
                          the order arrived, and never on a timer.
                        </p>
                      </>
                    ) : released.length > 0 ? (
                      <>
                        <p className="text-[13px] font-semibold text-forest-ink">Escrow released</p>
                        <p className="mt-1 text-[12.5px] leading-5 text-forest-ink/85">
                          You confirmed delivery, so the payment has settled to the supplier. This
                          order is closed.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-[13px] font-semibold text-forest-ink">Refunded</p>
                        <p className="mt-1 text-[12.5px] leading-5 text-forest-ink/85">
                          This order was cancelled and the money went back to you.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <OrderActions
                orderId={order.id}
                reference={order.reference}
                heldAmount={totalHeld}
                canConfirm={canConfirm && held.length > 0}
                canDispute={canDispute}
              />
            </div>
          </div>

          {/* ── Recent orders ──────────────────────────────────────────── */}
          {recent.length > 0 && (
            <section className="mt-10">
              <div className="mb-4 flex items-center justify-between gap-4">
                <h2 className="font-display text-headline-md font-semibold text-ink">
                  Recent orders
                </h2>
                <Link
                  href="/orders"
                  className="text-[13px] font-medium text-gold-dark transition-colors hover:text-ink"
                >
                  Order history →
                </Link>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {recent.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-md border border-hairline bg-surface-raised p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <StatusBadge status={entry.status} size="sm" />
                      <span className="font-mono text-[11.5px] tabular-nums text-muted">
                        {shortDate(entry.placed_at)}
                      </span>
                    </div>

                    <p className="mt-3 font-mono text-[13px] font-medium tabular-nums text-ink">
                      {entry.reference}
                    </p>
                    <p className="mt-1">
                      <MoneyText amount={entry.total} size="sm" tone="gold" />
                    </p>

                    <div className="mt-3.5">
                      <Link
                        href={`/orders/${entry.id}`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-hairline-strong px-3 py-1.5 text-[12px] font-medium text-ink transition-colors hover:bg-ink/[0.04]"
                      >
                        {entry.status === 'CANCELLED' ? (
                          <>
                            <RotateCcw size={12} strokeWidth={1.5} />
                            View refund
                          </>
                        ) : (
                          'Track order'
                        )}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
