import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { CircleHelp, Clock, Lock, MapPin, RotateCcw, ShieldCheck } from 'lucide-react';

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
import { findById } from '@/lib/db';

import { OrderActions } from './OrderActions';
import { RetryPaymentButton } from './RetryPaymentButton';

/**
 * Our banking details, from the setting rather than from code.
 *
 * Returns null when it is not configured, so the page says details will follow
 * instead of inventing an account number that would send money to a stranger.
 */
async function bankTransferDetails(): Promise<string | null> {
  const row = await findById('settings', 'eft_bank_details');
  const text = row?.value?.text;
  return typeof text === 'string' && text.trim() !== '' ? text.trim() : null;
}

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

  const { order, items, payables, payments } = detail;

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

  const outstanding = payables.filter((record) => record.status === 'PENDING');
  const settled = payables.filter((record) => record.status === 'SETTLED');
  const underReview = payables.filter((record) => record.status === 'ON_HOLD');
  const orderValue = payables.reduce((sum, record) => sum + record.amount, 0);

  // Spec 0003: what the buyer is told turns on whether their money has arrived.
  const awaitingPayment = order.status === 'AWAITING_PAYMENT';
  const isBankTransfer = order.payment_method === 'EFT';
  const latestAttempt = payments[0] ?? null;
  const lastFailed = latestAttempt?.status === 'FAILED';
  const bankDetails = awaitingPayment && isBankTransfer ? await bankTransferDetails() : null;

  const canConfirm = order.status === 'IN_TRANSIT' || order.status === 'DELIVERED';
  const canDispute = outstanding.length > 0 && order.status !== 'CANCELLED';

  const expected = new Date(order.placed_at);
  expected.setDate(expected.getDate() + 3);

  return (
    <div className="mx-auto max-w-market px-6 pb-24 pt-28">
      {/*
        Spec 0003: this used to say "Your payment has been processed" the instant an
        order was placed, which was never true and is now plainly false. What the
        buyer is told depends on whether their money has actually arrived.
      */}
      {awaitingPayment ? (
        <div className="mb-7 flex items-start gap-3 rounded-md border border-gold/40 bg-gold-wash px-5 py-4">
          <Clock size={18} strokeWidth={1.5} className="mt-0.5 shrink-0 text-gold-ink" />
          <div>
            <p className="text-[14px] font-semibold text-ink">Waiting for your payment</p>
            <p className="mt-1 text-[13px] leading-5 text-ink/80">
              {order.reference} is held for you. We start sourcing it as soon as your payment
              is confirmed, and no supplier has been asked to prepare anything yet.
            </p>

            {isBankTransfer && (
              <div className="mt-3 rounded border border-hairline-strong bg-surface px-3.5 py-3">
                <p className="text-[12px] font-medium text-muted">Paying by bank transfer</p>
                <p className="mt-1.5 text-[13px] leading-5 text-ink">
                  Quote{' '}
                  <strong className="font-mono font-semibold">
                    {latestAttempt?.provider_reference ?? order.reference}
                  </strong>{' '}
                  as your payment reference so we can match your money to this order.
                </p>
                {bankDetails ? (
                  <p className="mt-2 whitespace-pre-line text-[12.5px] leading-5 text-muted">
                    {bankDetails}
                  </p>
                ) : (
                  <p className="mt-2 text-[12.5px] leading-5 text-muted">
                    Our banking details will be sent to you shortly.
                  </p>
                )}
              </div>
            )}

            {lastFailed && (
              <p className="mt-3 text-[12.5px] leading-5 text-danger-ink">
                Your last attempt did not go through. Nothing was charged, and your order is
                still held.
              </p>
            )}

            {/* Offered for any unpaid card or wallet order, not only a failed one: a
                buyer who abandoned a card page needs the same way back in. A bank
                transfer has nothing to retry; the buyer pays from their bank and
                finance confirms it. */}
            {!isBankTransfer && (
              <div className="mt-3">
                <RetryPaymentButton orderId={order.id} />
              </div>
            )}

            <p className="mt-3 text-[12px] text-muted">
              This order is held until {dateTime(order.payment_expires_at)}.
            </p>
          </div>
        </div>
      ) : (
        searchParams.placed === '1' && (
          <div className="mb-7 flex items-start gap-3 rounded-md border border-forest/25 bg-forest-wash px-5 py-4">
            <ShieldCheck size={18} strokeWidth={1.5} className="mt-0.5 shrink-0 text-forest" />
            <div>
              <p className="text-[14px] font-semibold text-forest-ink">Payment confirmed</p>
              <p className="mt-1 text-[13px] leading-5 text-forest-ink/85">
                {payables.length === 1
                  ? 'The supplier has'
                  : `All ${payables.length} suppliers have`}{' '}
                been notified and are preparing your order. Tell us as soon as it arrives, and if
                anything is wrong we will put it right.
              </p>
            </div>
          </div>
        )
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
                className="inline-flex shrink-0 items-center gap-1.5 text-[13px] font-medium text-forest transition-colors hover:text-ink"
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
                        className="text-[14px] font-medium text-ink transition-colors hover:text-forest"
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
                        <MoneyText amount={order.total} size="lg" tone="ink" />
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

              {/*
                Buyer protection, stated as what AfriDeal will do rather than as
                a custody arrangement. AfriDeal is the merchant of record: the
                customer buys from AfriDeal, AfriDeal buys from the supplier,
                and the guarantee is a returns-and-refunds commitment on that
                sale — not money held on anyone else's behalf.
              */}
              <div
                className={`rounded-md border px-5 py-4 ${
                  underReview.length > 0
                    ? 'border-danger/25 bg-danger-wash'
                    : outstanding.length > 0
                      ? 'border-gold/25 bg-gold-50/70'
                      : 'border-forest/25 bg-forest-wash'
                }`}
              >
                <div className="flex items-start gap-3">
                  <ShieldCheck
                    size={16}
                    strokeWidth={1.5}
                    className={`mt-0.5 shrink-0 ${
                      underReview.length > 0
                        ? 'text-danger-ink'
                        : outstanding.length > 0
                          ? 'text-gold-700'
                          : 'text-forest'
                    }`}
                  />
                  <div className="min-w-0">
                    {underReview.length > 0 ? (
                      <>
                        <p className="text-[13px] font-semibold text-danger-ink">Claim under review</p>
                        <p className="mt-1 text-[12.5px] leading-5 text-danger-ink/85">
                          You have raised a claim on this order. Our team is reviewing it and will
                          come back to you within five working days with a replacement, a refund or
                          an explanation.
                        </p>
                      </>
                    ) : outstanding.length > 0 ? (
                      <>
                        <p className="text-[13px] font-semibold text-gold-700">
                          Covered by AfriDeal buyer protection
                        </p>
                        <p className="mt-1 text-[12.5px] leading-5 text-gold-700/85">
                          You bought this order from AfriDeal, so the order is ours to put right.
                          If it arrives late, short or not as described, tell us and we will replace
                          it or refund you.
                        </p>
                      </>
                    ) : settled.length > 0 ? (
                      <>
                        <p className="text-[13px] font-semibold text-forest-ink">Order complete</p>
                        <p className="mt-1 text-[12.5px] leading-5 text-forest-ink/85">
                          You confirmed delivery and this order is closed. Returns stay open for
                          seven days from delivery.
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
                orderAmount={orderValue}
                canConfirm={canConfirm && outstanding.length > 0}
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
                  className="text-[13px] font-medium text-forest transition-colors hover:text-ink"
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
                      <MoneyText amount={entry.total} size="sm" tone="ink" />
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
