import type { Metadata } from 'next';
import Link from 'next/link';
import { LogIn, PackageOpen } from 'lucide-react';

import { GoldButton } from '@/components/brand/GoldButton';
import { MoneyText } from '@/components/brand/MoneyText';
import { StatusBadge } from '@/components/brand/StatusBadge';
import { EmptyState } from '@/components/brand/Panel';
import { Swatch } from '@/components/storefront/Swatch';
import { auth } from '@/lib/auth';
import { readAll } from '@/lib/db';
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
          description="Order history and escrow status are tied to your account."
          action={
            <Link href="/login">
              <GoldButton variant="gold" size="md" withArrow>
                Sign in
              </GoldButton>
            </Link>
          }
          className="rounded-md border border-hairline bg-surface-raised"
        />
      </div>
    );
  }

  const [allOrders, allItems, allImages] = await Promise.all([
    readAll('orders'),
    readAll('order-items'),
    readAll('product-images'),
  ]);

  // One lookup for the whole page rather than a scan per line in the stack.
  const primaryImage = new Map(
    allImages.filter((image) => image.sort_order === 0).map((image) => [image.product_id, image]),
  );

  const orders = allOrders
    .filter((order) => order.customer_id === session.user.id)
    .sort((a, b) => b.placed_at.localeCompare(a.placed_at));

  return (
    <div className="mx-auto max-w-market px-6 pb-24 pt-28">
      <h1 className="font-display text-headline-lg font-semibold text-ink">Your orders</h1>
      <p className="measure mt-2 text-[14px] leading-6 text-body">
        Every order here is backed by escrow. Nothing is paid out to a supplier until you confirm it
        arrived.
      </p>

      {orders.length === 0 ? (
        <EmptyState
          icon={<PackageOpen size={22} strokeWidth={1.5} />}
          title="No orders yet"
          description="When you place an order it will appear here with live tracking and its escrow status."
          action={
            <Link href="/browse">
              <GoldButton variant="gold" size="md" withArrow>
                Browse the marketplace
              </GoldButton>
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
                  className="group flex flex-wrap items-center gap-5 rounded-md border border-hairline bg-surface-raised p-5 transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-gold/30 hover:shadow-lift"
                >
                  <div className="flex -space-x-2" aria-hidden="true">
                    {items.slice(0, 3).map((item) => (
                      <Swatch
                        key={item.id}
                        image={primaryImage.get(item.product_id)}
                        fallback={['#ECEBE7', '#8A918B']}
                        emoji={item.emoji}
                        className="h-11 w-11 rounded-full border-2 border-surface-raised"
                        glyphClassName="text-[19px]"
                        zoomOnHover={false}
                      />
                    ))}
                    {items.length > 3 && (
                      <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-surface-raised bg-ink font-mono text-[11px] font-semibold text-white">
                        +{items.length - 3}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[13px] font-medium tabular-nums text-ink">
                      {order.reference}
                    </p>
                    <p className="mt-0.5 text-[12.5px] text-body">
                      {shortDate(order.placed_at)} · {items.length}{' '}
                      {items.length === 1 ? 'item' : 'items'} ·{' '}
                      {PAYMENT_LABELS[order.payment_method] ?? order.payment_method}
                    </p>
                  </div>

                  <StatusBadge status={order.status} />

                  <div className="text-right">
                    <MoneyText amount={order.total} size="md" tone="gold" />
                  </div>

                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted transition-colors group-hover:text-ink">
                    Track →
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
