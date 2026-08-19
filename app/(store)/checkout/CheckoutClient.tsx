'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Lock, ShoppingBag } from 'lucide-react';
import { z } from 'zod';

import { GoldButton } from '@/components/brand/GoldButton';
import { MoneyText } from '@/components/brand/MoneyText';
import { EmptyState, Enclosure } from '@/components/brand/Panel';
import { cartSubtotal, useAfriDealStore } from '@/store/useAfriDealStore';
import { cn } from '@/lib/utils';
import type { PaymentMethod } from '@/types';

const DELIVERY_FEE = 45;

const CheckoutSchema = z.object({
  delivery_address: z.string().min(4, 'Enter a street address or plot number.'),
  delivery_city: z.string().min(2, 'Enter a city or town.'),
  payment_method: z.enum(['DPO_PAY', 'ORANGE_MONEY', 'PAYGATE']),
});

type CheckoutValues = z.infer<typeof CheckoutSchema>;

const GATEWAYS: { value: PaymentMethod; name: string; monogram: string; blurb: string }[] = [
  {
    value: 'DPO_PAY',
    name: 'DPO Pay',
    monogram: 'DPO',
    blurb: 'Card and bank transfer across SADC.',
  },
  {
    value: 'ORANGE_MONEY',
    name: 'Orange Money',
    monogram: 'OM',
    blurb: 'Mobile money, Botswana numbers.',
  },
  {
    value: 'PAYGATE',
    name: 'PayGate',
    monogram: 'PG',
    blurb: 'South African card acquiring.',
  },
];

export function CheckoutClient({
  customerName,
  customerEmail,
}: {
  customerName: string;
  customerEmail: string;
}) {
  const router = useRouter();
  const cart = useAfriDealStore((state) => state.cart);
  const clearCart = useAfriDealStore((state) => state.clearCart);

  const [mounted, setMounted] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutValues>({
    resolver: zodResolver(CheckoutSchema),
    defaultValues: {
      delivery_address: '',
      delivery_city: 'Gaborone',
      payment_method: 'DPO_PAY',
    },
  });

  const selectedGateway = watch('payment_method');
  const subtotal = mounted ? cartSubtotal(cart) : 0;
  const total = subtotal + DELIVERY_FEE;

  const onSubmit = handleSubmit(async (values) => {
    setApiError(null);

    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // Never send prices. The server re-reads them from the catalogue.
        lines: cart.map((line) => ({
          product_id: line.product_id,
          variant_id: line.variant_id,
          qty: line.qty,
        })),
        payment_method: values.payment_method,
        delivery_address: values.delivery_address,
        delivery_city: values.delivery_city,
      }),
    });

    const body = await response.json().catch(() => null);

    if (!response.ok) {
      setApiError(body?.error ?? 'We could not place that order. Please try again.');
      return;
    }

    clearCart();
    router.push(`/orders/${body.order.id}?placed=1`);
  });

  if (!mounted) {
    return (
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
        <div className="skeleton h-96 rounded-md" />
        <div className="skeleton h-80 rounded-xl" />
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingBag size={22} strokeWidth={1.5} />}
        title="There is nothing to check out"
        description="Your cart is empty. Add something to it and come back."
        action={
          <Link href="/browse">
            <GoldButton variant="gold" size="md" withArrow>
              Browse the marketplace
            </GoldButton>
          </Link>
        }
        className="rounded-md border border-hairline bg-surface-raised"
      />
    );
  }

  return (
    <>
      <p className="eyebrow">Checkout</p>
      <h1 className="mt-3 font-display text-headline-lg font-semibold text-ink">
        Confirm and pay into escrow
      </h1>

      <form
        onSubmit={onSubmit}
        className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] lg:gap-12"
      >
        <div className="space-y-8">
          {/* Delivery */}
          <section className="rounded-md border border-hairline bg-surface-raised p-5">
            <h2 className="text-[15px] font-semibold text-ink">Delivery</h2>
            <p className="mt-1 text-[12.5px] text-body">
              Ordering as {customerName}
              {customerEmail && ` (${customerEmail})`}.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label htmlFor="address" className="mb-1.5 block text-[13px] font-medium text-ink">
                  Street address or plot number
                </label>
                <input
                  id="address"
                  {...register('delivery_address')}
                  placeholder="Plot 5412, Extension 12"
                  aria-invalid={errors.delivery_address ? 'true' : undefined}
                  className={cn(
                    'w-full rounded border bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none transition-colors',
                    'placeholder:text-muted focus:border-gold/60',
                    errors.delivery_address ? 'border-danger/60' : 'border-hairline-strong',
                  )}
                />
                {errors.delivery_address && (
                  <p className="mt-1.5 text-[12px] text-danger-ink">
                    {errors.delivery_address.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="city" className="mb-1.5 block text-[13px] font-medium text-ink">
                  City or town
                </label>
                <input
                  id="city"
                  {...register('delivery_city')}
                  placeholder="Gaborone"
                  aria-invalid={errors.delivery_city ? 'true' : undefined}
                  className={cn(
                    'w-full rounded border bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none transition-colors',
                    'placeholder:text-muted focus:border-gold/60',
                    errors.delivery_city ? 'border-danger/60' : 'border-hairline-strong',
                  )}
                />
                {errors.delivery_city && (
                  <p className="mt-1.5 text-[12px] text-danger-ink">{errors.delivery_city.message}</p>
                )}
              </div>
            </div>
          </section>

          {/* Payment */}
          <section className="rounded-md border border-hairline bg-surface-raised p-5">
            <h2 className="text-[15px] font-semibold text-ink">Payment method</h2>
            <p className="mt-1 text-[12.5px] text-body">
              Whichever you choose, the money settles into AfriDeal&rsquo;s escrow account, not to the
              supplier.
            </p>

            <div className="mt-5 space-y-2.5">
              {GATEWAYS.map((gateway) => {
                const active = selectedGateway === gateway.value;

                return (
                  <label
                    key={gateway.value}
                    className={cn(
                      'flex cursor-pointer items-center gap-4 rounded-md border p-4 transition-all duration-250 ease-[cubic-bezier(0.16,1,0.3,1)]',
                      active
                        ? 'border-gold bg-gold-50/60 ring-1 ring-inset ring-gold/30'
                        : 'border-hairline-strong bg-surface hover:border-ink/25',
                    )}
                  >
                    <input
                      type="radio"
                      value={gateway.value}
                      checked={active}
                      onChange={() => setValue('payment_method', gateway.value)}
                      className="sr-only"
                    />

                    <span
                      className={cn(
                        'flex h-11 w-14 shrink-0 items-center justify-center rounded font-mono text-[12px] font-semibold tracking-tight',
                        active ? 'bg-ink text-gold-light' : 'bg-ink/[0.06] text-body',
                      )}
                    >
                      {gateway.monogram}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-medium text-ink">{gateway.name}</span>
                      <span className="mt-0.5 block text-[12.5px] text-body">{gateway.blurb}</span>
                    </span>

                    <span
                      className={cn(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                        active ? 'border-gold bg-gold' : 'border-hairline-strong',
                      )}
                    >
                      {active && <span className="h-1.5 w-1.5 rounded-full bg-ink" />}
                    </span>
                  </label>
                );
              })}
            </div>
          </section>

          {apiError && (
            <div className="flex items-start gap-2.5 rounded-md border border-danger/30 bg-danger-wash px-4 py-3.5">
              <AlertCircle size={16} strokeWidth={1.5} className="mt-0.5 shrink-0 text-danger-ink" />
              <p className="text-[13px] leading-5 text-danger-ink">{apiError}</p>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <Enclosure>
            <div className="p-5">
              <h2 className="text-[15px] font-semibold text-ink">Your order</h2>

              <ul className="mt-4 space-y-3 border-b border-hairline pb-4">
                {cart.map((line) => (
                  <li
                    key={`${line.product_id}-${line.variant_id}`}
                    className="flex items-start gap-3 text-[13px]"
                  >
                    <span aria-hidden="true" className="text-[20px] leading-none">
                      {line.emoji}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-ink">{line.name}</span>
                      <span className="block text-[12px] text-muted">
                        {line.variant_label} · {line.qty} ×{' '}
                        {new Intl.NumberFormat('en-BW', { minimumFractionDigits: 2 }).format(
                          line.unit_price,
                        )}
                      </span>
                    </span>
                    <MoneyText amount={line.unit_price * line.qty} size="sm" bare />
                  </li>
                ))}
              </ul>

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
                  <dt className="font-medium text-ink">Total held in escrow</dt>
                  <dd>
                    <MoneyText amount={total} size="lg" tone="gold" />
                  </dd>
                </div>
              </dl>

              <GoldButton
                type="submit"
                variant="gold"
                size="lg"
                className="mt-5 w-full"
                loading={isSubmitting}
                withArrow
              >
                Place order
              </GoldButton>
            </div>
          </Enclosure>

          <div className="mt-4 flex items-start gap-3 rounded-md border border-gold/25 bg-gold-50/70 px-4 py-3.5">
            <Lock size={16} strokeWidth={1.5} className="mt-0.5 shrink-0 text-gold-700" />
            <p className="text-[12.5px] leading-5 text-gold-700">
              Placing this order moves the total into escrow. Suppliers are notified and can start
              preparing, but none of them are paid until you confirm delivery.
            </p>
          </div>
        </div>
      </form>
    </>
  );
}
