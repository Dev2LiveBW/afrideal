import type { Metadata } from 'next';
import Link from 'next/link';
import { LogIn, PackageOpen } from 'lucide-react';

import { ActionButton } from '@/components/brand/ActionButton';
import { MoneyText } from '@/components/brand/MoneyText';
import { StatusBadge } from '@/components/brand/StatusBadge';
import { EmptyState } from '@/components/brand/Panel';
import { Swatch } from '@/components/storefront/Swatch';
import { auth } from '@/lib/auth';
import { readAll } from '@/lib/db';
import { allAsDisplayed } from '@/lib/payments/status';
import { PAYMENT_LABELS, shortDate } from '@/lib/format';

export const metadata: Metadata = { title: 'Your orders' };
export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
  const session = await auth();

  if (!session?.user) {
    return (
      <div className="mx-auto max-w-market px-6 pb-24 pt-28">
        <EmptyState
          icon={<LogIn size={22} strokeWidth={1.5} />}
          title="Sign in to see your orders"
          description="Your order history and delivery status, tied to your account."
          action={
            <Link href="/login">
              <ActionButton size="md" withArrow>
                Sign in
              </ActionButton>
            </Link>
          }
          className="rounded-md border border-hairline bg-surface-raised"
        />
      </div>
    );
  }

  const [storedOrders, allItems, allImages, payments] = await Promise.all([
    readAll('orders'),
    readAll('order-items'),
    readAll('product-images'),
    readAll('payments'),
  ]);

  // Spec 0003, AC-5: a buyer must not be shown an order as still payable once its
  // window has closed.
  const allOrders = allAsDisplayed(storedOrders, payments);

  // One lookup for the whole page rather than a scan per line in the stack.
  const primaryImage = new Map(
    allImages.filter((image) => image.sort_order === 0).map((image) => [image.product_id, image]),
  );

  const orders = allOrders
    .filter((order) => order.customer_id === session.user.id)
    .sort((a, b) => b.placed_at.localeCompare(a.placed_at));

  return (
    <div className="mx-auto max-w-market px-4 pb-24 pt-20 sm:px-6 sm:pt-28">
      <h1 className="font-display text-headline-lg font-semibold text-ink">Your orders</h1>
      <p className="measure mt-2 text-[14px] leading-6 text-body">
        Every order here is covered by AfriDeal buyer protection. Confirm each one as it arrives,
        and if something is wrong, report it and we will put it right.
      </p>

      {orders.length === 0 ? (
        <EmptyState
          icon={<PackageOpen size={22} strokeWidth={1.5} />}
          title="No orders yet"
          description="When you place an order it will appear here with live tracking and delivery status."
          action={
            <Link href="/browse">
              <ActionButton size="md" withArrow>
                Browse the marketplace
              </ActionButton>
            </Link>
          }
          className="mt-8 rounded-md border border-hairline bg-surface-raised"
        />
      ) : (
        <ul className="mt-8 space-y-3">
          {orders.map((order) => {
            const items = allItems.filter((item) => item.order_id === order.id);

            return (
              <li key={order.id}>
                <Link
                  href={`/orders/${order.id}`}
                  className="group block rounded-md border border-hairline bg-surface-raised p-3.5 transition-all duration-300 hover:border-gold/30 hover:shadow-lift sm:p-5"
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="flex shrink-0 -space-x-2" aria-hidden="true">
                      {items.slice(0, 3).map((item) => (
                        <Swatch
                          key={item.id}
                          image={primaryImage.get(item.product_id)}
                          fallback={['#ECEBE7', '#8A918B']}
                          emoji={item.emoji}
                          className="h-10 w-10 rounded-full border-2 border-surface-raised sm:h-11 sm:w-11"
                          glyphClassName="text-[17px] sm:text-[19px]"
                          zoomOnHover={false}
                        />
                      ))}
                      {items.length > 3 && (
                        <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-surface-raised bg-ink font-mono text-[10px] font-semibold text-white sm:h-11 sm:w-11 sm:text-[11px]">
                          +{items.length - 3}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-[13px] font-medium tabular-nums text-ink">
                          {order.reference}
                        </p>
                        <div className="sm:hidden">
                          <StatusBadge status={order.status} size="sm" />
                        </div>
                      </div>
                      <p className="mt-0.5 truncate text-[11.5px] text-body sm:text-[12.5px]">
                        {shortDate(order.placed_at)} · {items.length}{' '}
                        {items.length === 1 ? 'item' : 'items'} ·{' '}
                        {PAYMENT_LABELS[order.payment_method] ?? order.payment_method}
                      </p>
                    </div>

                    <div className="hidden sm:block">
                      <StatusBadge status={order.status} />
                    </div>

                    <div className="shrink-0 text-right">
                      <MoneyText currency={order.currency ?? 'BWP'} amount={order.total} size="sm" tone="ink" />
                      <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted transition-colors group-hover:text-ink">
                        Track →
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
