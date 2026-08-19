'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Lock, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';

import { GoldButton } from '@/components/brand/GoldButton';
import { MoneyText } from '@/components/brand/MoneyText';
import { EmptyState, Enclosure } from '@/components/brand/Panel';
import { cartSubtotal, useAfriDealStore } from '@/store/useAfriDealStore';

const DELIVERY_FEE = 45;

export default function CartPage() {
  const cart = useAfriDealStore((state) => state.cart);
  const setQty = useAfriDealStore((state) => state.setQty);
  const removeFromCart = useAfriDealStore((state) => state.removeFromCart);

  // The cart is persisted to localStorage, so nothing that depends on it can
  // render until after hydration without risking a mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const subtotal = mounted ? cartSubtotal(cart) : 0;
  const total = subtotal + (cart.length > 0 ? DELIVERY_FEE : 0);

  if (!mounted) {
    return (
      <div className="mx-auto max-w-market px-6 pb-24 pt-28">
        <div className="skeleton h-9 w-48" />
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
          <div className="space-y-3">
            {[0, 1].map((index) => (
              <div key={index} className="skeleton h-28 rounded-md" />
            ))}
          </div>
          <div className="skeleton h-72 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-market px-6 pb-24 pt-28">
      <p className="eyebrow">Cart</p>
      <h1 className="mt-3 font-display text-headline-lg font-semibold text-ink">
        {cart.length === 0
          ? 'Your cart'
          : `Your cart (${cart.reduce((sum, line) => sum + line.qty, 0)})`}
      </h1>

      {cart.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag size={22} strokeWidth={1.5} />}
          title="Nothing in the cart yet"
          description="Everything on AfriDeal settles through escrow, so you can fill this without committing your money up front."
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
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)] lg:gap-12">
          {/* Lines */}
          <ul className="space-y-3">
            {cart.map((line) => (
              <li
                key={`${line.product_id}-${line.variant_id}`}
                className="flex gap-4 rounded-md border border-hairline bg-surface-raised p-4"
              >
                <Link
                  href={`/products/${line.product_id}`}
                  className="flex h-20 w-20 shrink-0 items-center justify-center rounded bg-surface-sunk text-[30px]"
                  aria-hidden="true"
                >
                  {line.emoji}
                </Link>

                <div className="min-w-0 flex-1">
                  <Link
                    href={`/products/${line.product_id}`}
                    className="text-[14.5px] font-semibold text-ink transition-colors hover:text-gold-dark"
                  >
                    {line.name}
                  </Link>
                  <p className="mt-0.5 text-[12.5px] text-body">{line.variant_label}</p>
                  <p className="mt-1">
                    <MoneyText amount={line.unit_price} size="sm" tone="muted" /># each
                  </p>

                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex items-center rounded-full ring-1 ring-inset ring-hairline-strong">
                      <button
                        onClick={() => setQty(line.product_id, line.variant_id, line.qty - 1)}
                        aria-label={`Decrease quantity of ${line.name}`}
                        className="flex h-8 w-8 items-center justify-center rounded-l-full text-body transition-colors hover:bg-ink/[0.04] hover:text-ink"
                      >
                        <Minus size={13} strokeWidth={1.5} />
                      </button>
                      <span className="w-9 text-center font-mono text-[13px] tabular-nums text-ink">
                        {line.qty}
                      </span>
                      <button
                        onClick={() => setQty(line.product_id, line.variant_id, line.qty + 1)}
                        aria-label={`Increase quantity of ${line.name}`}
                        className="flex h-8 w-8 items-center justify-center rounded-r-full text-body transition-colors hover:bg-ink/[0.04] hover:text-ink"
                      >
                        <Plus size={13} strokeWidth={1.5} />
                      </button>
                    </div>

                    <button
                      onClick={() => removeFromCart(line.product_id, line.variant_id)}
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12.5px] text-muted transition-colors hover:bg-danger-wash hover:text-danger-ink"
                    >
                      <Trash2 size={13} strokeWidth={1.5} />
                      Remove
                    </button>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <MoneyText amount={line.unit_price * line.qty} size="md" />
                </div>
              </li>
            ))}
          </ul>

          {/* Summary */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <Enclosure>
              <div className="p-5">
                <h2 className="text-[15px] font-semibold text-ink">Order summary</h2>

                <dl className="mt-4 space-y-3 text-[13.5px]">
                  <div className="flex items-center justify-between">
                    <dt className="text-body">Subtotal</dt>
                    <dd>
                      <MoneyText amount={subtotal} size="sm" />
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-body">Delivery</dt>
                    <dd>
                      <MoneyText amount={DELIVERY_FEE} size="sm" />
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between border-t border-hairline pt-3">
                    <dt className="font-medium text-ink">Total</dt>
                    <dd>
                      <MoneyText amount={total} size="lg" tone="gold" />
                    </dd>
                  </div>
                </dl>

                <Link href="/checkout" className="mt-5 block">
                  <GoldButton variant="gold" size="lg" className="w-full" withArrow>
                    Checkout
                  </GoldButton>
                </Link>

                <Link href="/browse" className="mt-2 block">
                  <GoldButton variant="ghost" size="md" className="w-full">
                    Keep browsing
                  </GoldButton>
                </Link>
              </div>
            </Enclosure>

            {/* Always visible, per the brief. */}
            <div className="mt-4 flex items-start gap-3 rounded-md border border-gold/25 bg-gold-50/70 px-4 py-3.5">
              <Lock size={16} strokeWidth={1.5} className="mt-0.5 shrink-0 text-gold-700" />
              <div>
                <p className="text-[13px] font-semibold text-gold-700">Protected by escrow</p>
                <p className="mt-1 text-[12.5px] leading-5 text-gold-700/85">
                  AfriDeal holds your payment. The supplier is paid only after you confirm the goods
                  arrived, and nothing releases on a timer.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
