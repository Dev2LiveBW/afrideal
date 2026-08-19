'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Lock, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';

import { GoldButton } from '@/components/brand/GoldButton';
import { MoneyText } from '@/components/brand/MoneyText';
import { EmptyState, Enclosure } from '@/components/brand/Panel';
import { CartLineThumb } from '@/components/storefront/CartLineThumb';
import { NextRungNudge } from '@/components/storefront/NextRungNudge';
import { useAfriDealStore } from '@/store/useAfriDealStore';
import { resolvePrice } from '@/lib/pricing-tiers';
import { nextRung } from '@/lib/tier-doors';
import type { CustomerPrice, CustomerType, Product } from '@/types';

const DELIVERY_FEE = 45;

export function CartClient({
  bands,
  products,
  customerType,
}: {
  /** Published bands for everything in the catalogue, read on the server. */
  bands: CustomerPrice[];
  products: Product[];
  customerType: CustomerType;
}) {
  const cart = useAfriDealStore((state) => state.cart);
  const setQty = useAfriDealStore((state) => state.setQty);
  const removeFromCart = useAfriDealStore((state) => state.removeFromCart);

  // The cart is persisted to localStorage, so nothing that depends on it can
  // render until after hydration without risking a mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  /*
   * Reprice every line for the quantity it currently holds.
   *
   * `CartLine.unit_price` is frozen when the line is added, so a basket that
   * has since crossed a quantity break was showing the old rung — the cart
   * offered "4 more and every unit drops to 161", took the click, and then
   * displayed 182. Checkout was never wrong (the orders route resolves server
   * side, and the client sends no prices at all), but a total that contradicts
   * the offer immediately above it is worse than a wrong total: it is the one
   * claim this storefront cannot afford to break.
   *
   * The arithmetic mirrors the orders route exactly, variant ratio included, so
   * what the cart shows is what the order will charge.
   */
  const priced = cart.map((line) => {
    const product = products.find((candidate) => candidate.id === line.product_id);
    if (!product) return { line, unitPrice: line.unit_price };

    const resolved = resolvePrice(bands, product, line.qty, customerType, line.variant_id);
    const variant = product.variants.find((entry) => entry.id === line.variant_id);
    const variantRatio =
      product.price === 0 || !variant ? 1 : variant.price / product.price;

    return { line, unitPrice: Math.ceil(resolved.unit_price * variantRatio) };
  });

  const unitPriceFor = (line: (typeof cart)[number]) =>
    priced.find(
      (entry) =>
        entry.line.product_id === line.product_id && entry.line.variant_id === line.variant_id,
    )?.unitPrice ?? line.unit_price;

  const subtotal = mounted
    ? priced.reduce((sum, entry) => sum + entry.unitPrice * entry.line.qty, 0)
    : 0;
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
      <h1 className="font-display text-headline-lg font-semibold text-ink">
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
            {cart.map((line) => {
              /*
               * The rung this line is standing on, and the next one down.
               * Resolved through the same functions the product page and the
               * landing ladder use, so the three surfaces cannot quote
               * different prices for the same quantity.
               */
              const product = products.find((candidate) => candidate.id === line.product_id);
              const upcoming = product
                ? nextRung(bands, product.id, line.qty, customerType, line.variant_id)
                : null;

              const here = product
                ? resolvePrice(bands, product, line.qty, customerType, line.variant_id)
                : null;

              return (
              <li
                key={`${line.product_id}-${line.variant_id}`}
                className="flex min-w-0 flex-wrap gap-4 rounded-md border border-hairline bg-surface-raised p-4 sm:flex-nowrap"
              >
                <Link
                  href={`/products/${line.product_id}`}
                  className="shrink-0"
                  aria-label={line.name}
                >
                  <CartLineThumb line={line} className="h-20 w-20" glyphClassName="text-[30px]" />
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
                    <MoneyText amount={unitPriceFor(line)} size="sm" tone="muted" />
                    <span className="ml-1 text-[12.5px] text-muted">each</span>
                    {unitPriceFor(line) < line.unit_price && (
                      <span className="ml-1.5 font-mono text-[11.5px] tabular-nums text-forest">
                        bulk price applied
                      </span>
                    )}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-3">
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

                  {upcoming && here && (
                    <NextRungNudge
                      className="mt-3"
                      unitsAway={upcoming.band.minimum_quantity - line.qty}
                      nextUnitPrice={upcoming.band.unit_price}
                      currentUnitPrice={here.unit_price}
                      locked={upcoming.locked}
                      onTake={() =>
                        setQty(line.product_id, line.variant_id, upcoming.band.minimum_quantity)
                      }
                    />
                  )}
                </div>

                {/*
                  `ml-auto` keeps it right-aligned whether it sits beside the
                  content or wraps beneath it, which is what it does on a phone
                  once the thumbnail and the quantity stepper have taken their
                  width.
                */}
                <div className="ml-auto shrink-0 text-right">
                  <MoneyText amount={unitPriceFor(line) * line.qty} size="md" />
                </div>
              </li>
              );
            })}
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
