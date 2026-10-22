'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, ShieldCheck, ShoppingBag } from 'lucide-react';
import { z } from 'zod';

import { ActionButton } from '@/components/brand/ActionButton';
import { MoneyText } from '@/components/brand/MoneyText';
import { EmptyState, Enclosure } from '@/components/brand/Panel';
import { CartLineThumb } from '@/components/storefront/CartLineThumb';
import { useAfriDealStore } from '@/store/useAfriDealStore';
import { COLLECTION_POINTS } from '@/lib/collection-points';
import { DEFAULT_DELIVERY_COUNTRY, isCrossBorder } from '@/lib/lanes.mjs';
import { priceLine, sellerQuantities } from '@/lib/pricing-tiers';
import { cn } from '@/lib/utils';
import type { CustomerPrice, CustomerType, PaymentMethod, Product } from '@/types';

const DOORSTEP_DELIVERY_FEE = 45;
const COLLECTION_POINT_DELIVERY_FEE = 25;


const CheckoutSchema = z
  .object({
    delivery_method: z.enum(['DOORSTEP', 'COLLECTION_POINT']),
    collection_point: z.string().optional(),
    delivery_address: z.string().optional(),
    delivery_city: z.string().optional(),
    payment_method: z.enum(['DPO_PAY', 'ORANGE_MONEY', 'PAYGATE', 'EFT']),
  })
  .superRefine((data, ctx) => {
    if (data.delivery_method === 'DOORSTEP') {
      if (!data.delivery_address || data.delivery_address.trim().length < 4) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['delivery_address'],
          message: 'Enter a street address or plot number.',
        });
      }
      if (!data.delivery_city || data.delivery_city.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['delivery_city'],
          message: 'Enter a city or town.',
        });
      }
    }
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
  {
    value: 'EFT',
    name: 'Bank transfer',
    monogram: 'EFT',
    blurb: 'Pay from your bank. We start sourcing once it reaches us, usually 1 to 3 working days.',
  },
];

export function CheckoutClient({
  customerName,
  customerEmail,
  bands,
  products,
  customerType,
  methods,
}: {
  customerName: string;
  customerEmail: string;
  /** Published bands, read on the server so the summary cannot quote a stale rung. */
  bands: CustomerPrice[];
  products: Product[];
  customerType: CustomerType;
  /**
   * The methods that can actually take a payment right now, decided on the
   * server. Until a card gateway is live that is bank transfer alone, and a
   * card that could never complete is not shown at all.
   */
  methods: PaymentMethod[];
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
      delivery_method: 'DOORSTEP',
      collection_point: 'Gaborone Central Locker',
      delivery_address: '',
      delivery_city: 'Gaborone',
      payment_method: methods[0] ?? 'EFT',
    },
  });

  const selectedGateway = watch('payment_method');
  const selectedDeliveryMethod = watch('delivery_method') ?? 'DOORSTEP';
  const selectedCollectionPointName = watch('collection_point') ?? 'Gaborone Central Locker';
  const selectedPoint =
    COLLECTION_POINTS.find((p) => p.name === selectedCollectionPointName) ?? COLLECTION_POINTS[0];
  /*
   * Resolved per line through `priceLine()`, the function the orders route
   * charges with, on the same seller-and-category quantity. The summary a buyer
   * approves must be the amount that gets charged.
   */
  const tierQuantityOf = sellerQuantities(cart, products);
  const priced = cart.map((line) => {
    const product = products.find((candidate) => candidate.id === line.product_id);
    if (!product) return { line, unitPrice: line.unit_price };

    const { unit_price } = priceLine(
      bands,
      product,
      line.variant_id,
      line.qty,
      customerType,
      tierQuantityOf(product.id),
    );
    return { line, unitPrice: unit_price };
  });

  const unitPriceFor = (line: (typeof cart)[number]) =>
    priced.find(
      (entry) =>
        entry.line.product_id === line.product_id && entry.line.variant_id === line.variant_id,
    )?.unitPrice ?? line.unit_price;

  const subtotal = mounted
    ? priced.reduce((sum, entry) => sum + entry.unitPrice * entry.line.qty, 0)
    : 0;
  const deliveryFee =
    selectedDeliveryMethod === 'COLLECTION_POINT' ? selectedPoint.fee : DOORSTEP_DELIVERY_FEE;
  const total = subtotal + deliveryFee;

  const hasImportedItems = cart.some((line) => {
    const product = products.find((candidate) => candidate.id === line.product_id);
    // Spec 0009: cross-border on this order's lane, to the locker's country or the buyer's.
    const deliveryCountry =
      selectedDeliveryMethod === 'COLLECTION_POINT' ? selectedPoint.country : DEFAULT_DELIVERY_COUNTRY;
    return product ? isCrossBorder(product.country_of_origin, deliveryCountry) : false;
  });

  const onSubmit = handleSubmit(async (values) => {
    setApiError(null);

    const isCollection = values.delivery_method === 'COLLECTION_POINT';
    const point =
      COLLECTION_POINTS.find((p) => p.name === values.collection_point) ?? COLLECTION_POINTS[0];
    const finalAddress = isCollection
      ? (values.collection_point ?? point.name)
      : (values.delivery_address ?? '');
    const finalCity = isCollection ? point.city : (values.delivery_city ?? 'Gaborone');

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
        delivery_method: values.delivery_method,
        collection_point: isCollection ? finalAddress : null,
        delivery_address: finalAddress,
        delivery_city: finalCity,
      }),
    });

    const body = await response.json().catch(() => null);

    if (!response.ok) {
      setApiError(body?.error ?? 'We could not place that order. Please try again.');
      return;
    }

    clearCart();
    // A hosted card page lives on the gateway's own domain, so this is a full
    // navigation, not a client-side route change.
    if (body.payment?.redirect_url) {
      window.location.assign(body.payment.redirect_url);
      return;
    }
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
            <ActionButton size="md" withArrow>
              Browse the marketplace
            </ActionButton>
          </Link>
        }
        className="rounded-md border border-hairline bg-surface-raised"
      />
    );
  }

  return (
    <>
      <h1 className="font-display text-headline-lg font-semibold text-ink">
        Confirm and pay
      </h1>

      <form
        id="checkout-form"
        onSubmit={onSubmit}
        className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] lg:gap-12"
      >
        <div className="min-w-0 space-y-8">
          {/* Delivery */}
          <section className="rounded-md border border-hairline bg-surface-raised p-5">
            <h2 className="text-[15px] font-semibold text-ink">Delivery</h2>
            <p className="mt-1 text-[12.5px] text-body">
              Ordering as {customerName}
              {customerEmail && ` (${customerEmail})`}.
            </p>

            {/* Delivery method choice */}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-md border p-3.5 transition-all',
                  selectedDeliveryMethod === 'DOORSTEP'
                    ? 'border-gold bg-gold-50/60 ring-1 ring-inset ring-gold/30'
                    : 'border-hairline-strong bg-surface hover:border-ink/25',
                )}
              >
                <input
                  type="radio"
                  value="DOORSTEP"
                  checked={selectedDeliveryMethod === 'DOORSTEP'}
                  onChange={() => setValue('delivery_method', 'DOORSTEP')}
                  className="mt-0.5 accent-gold"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-medium text-ink">Doorstep delivery</span>
                  <span className="mt-0.5 block text-[12px] text-body">
                    By runner to your home or office (BWP 45.00)
                  </span>
                </span>
              </label>

              <label
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-md border p-3.5 transition-all',
                  selectedDeliveryMethod === 'COLLECTION_POINT'
                    ? 'border-gold bg-gold-50/60 ring-1 ring-inset ring-gold/30'
                    : 'border-hairline-strong bg-surface hover:border-ink/25',
                )}
              >
                <input
                  type="radio"
                  value="COLLECTION_POINT"
                  checked={selectedDeliveryMethod === 'COLLECTION_POINT'}
                  onChange={() => {
                    setValue('delivery_method', 'COLLECTION_POINT');
                    if (!watch('collection_point')) {
                      setValue('collection_point', 'Gaborone Central Locker');
                    }
                  }}
                  className="mt-0.5 accent-gold"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-medium text-ink">Collection Point</span>
                  <span className="mt-0.5 block text-[12px] text-body">
                    Pickup from smart locker (from BWP 25.00)
                  </span>
                </span>
              </label>
            </div>

            {selectedDeliveryMethod === 'COLLECTION_POINT' ? (
              <div className="mt-5 space-y-4 rounded-md border border-hairline bg-surface p-4">
                <div>
                  <label htmlFor="collection_point" className="mb-1.5 block text-[13px] font-medium text-ink">
                    Select location
                  </label>
                  <select
                    id="collection_point"
                    aria-label="Select location"
                    {...register('collection_point')}
                    className="w-full rounded border border-hairline-strong bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none transition-colors focus:border-gold/60"
                  >
                    {COLLECTION_POINTS.map((point) => (
                      <option key={point.id} value={point.name}>
                        {point.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-[12.5px] text-body">
                    {selectedPoint.address}, {selectedPoint.city} ·{' '}
                    <span className="text-muted">{selectedPoint.blurb}</span>
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                <div>
                  <label htmlFor="address" className="mb-1.5 block text-[13px] font-medium text-ink">
                    Street address or plot number
                  </label>
                  <input
                    id="address"
                    {...register('delivery_address')}
                    placeholder="Plot 5412, Extension 12"
                    autoComplete="street-address"
                    aria-invalid={errors.delivery_address ? 'true' : undefined}
                    aria-describedby={errors.delivery_address ? 'address-error' : undefined}
                    className={cn(
                      'w-full rounded border bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none transition-colors',
                      'placeholder:text-muted focus:border-gold/60',
                      errors.delivery_address ? 'border-danger/60' : 'border-hairline-strong',
                    )}
                  />
                  {errors.delivery_address && (
                    <p id="address-error" role="alert" className="mt-1.5 text-[12px] text-danger-ink">
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
                    autoComplete="address-level2"
                    aria-invalid={errors.delivery_city ? 'true' : undefined}
                    aria-describedby={errors.delivery_city ? 'city-error' : undefined}
                    className={cn(
                      'w-full rounded border bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none transition-colors',
                      'placeholder:text-muted focus:border-gold/60',
                      errors.delivery_city ? 'border-danger/60' : 'border-hairline-strong',
                    )}
                  />
                  {errors.delivery_city && (
                    <p id="city-error" role="alert" className="mt-1.5 text-[12px] text-danger-ink">
                      {errors.delivery_city.message}
                    </p>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* Payment */}
          <section className="rounded-md border border-hairline bg-surface-raised p-5">
            <h2 className="text-[15px] font-semibold text-ink">Payment method</h2>
            <p className="mt-1 text-[12.5px] text-body">
              {selectedGateway === 'EFT'
                ? 'We will give you our bank details and a reference once you place the order. Nothing is ordered from a supplier until your transfer reaches us.'
                : 'Payments are processed by licensed providers. AfriDeal does not see or store your card or wallet details.'}
            </p>

            <div className="mt-5 space-y-2.5">
              {GATEWAYS.filter((gateway) => methods.includes(gateway.value)).map((gateway) => {
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
                        active ? 'border-forest bg-forest' : 'border-hairline-strong',
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
        <div className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <Enclosure>
            <div className="p-5">
              <h2 className="text-[15px] font-semibold text-ink">Order summary</h2>

              <ul className="mt-4 space-y-3 border-b border-hairline pb-4">
                {cart.map((line) => (
                  <li
                    key={`${line.product_id}-${line.variant_id}`}
                    className="flex items-start gap-3 text-[13px]"
                  >
                    <CartLineThumb
                      line={line}
                      className="h-10 w-10 shrink-0"
                      glyphClassName="text-[20px]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-ink">{line.name}</span>
                      <span className="block text-[12px] text-muted">
                        {line.variant_label} · {line.qty} ×{' '}
                        {new Intl.NumberFormat('en-BW', { minimumFractionDigits: 2 }).format(
                          unitPriceFor(line),
                        )}
                      </span>
                    </span>
                    <MoneyText amount={unitPriceFor(line) * line.qty} size="sm" bare />
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
                  <dt className="text-body">
                    {selectedDeliveryMethod === 'COLLECTION_POINT'
                      ? 'Collection (Locker)'
                      : 'Delivery'}
                  </dt>
                  <dd>
                    <MoneyText amount={deliveryFee} size="sm" />
                  </dd>
                </div>
                {hasImportedItems && (
                  <div className="flex items-center justify-between">
                    <dt className="flex items-center gap-1.5 text-body">
                      <span>Customs & Duty</span>
                    </dt>
                    <dd className="text-right">
                      <span className="text-[12.5px] font-medium text-forest">
                        Cleared by your courier
                      </span>
                    </dd>
                  </div>
                )}
                <div className="flex items-baseline justify-between border-t border-hairline pt-3">
                  <dt className="font-medium text-ink">Total to pay</dt>
                  <dd>
                    <MoneyText amount={total} size="lg" tone="ink" />
                  </dd>
                </div>
              </dl>

              <ActionButton
                type="submit"
                size="lg"
                className="mt-5 hidden w-full lg:inline-flex"
                loading={isSubmitting}
                withArrow
              >
                Place order
              </ActionButton>
            </div>
          </Enclosure>

          <div className="mt-4 flex items-start gap-3 rounded-md border border-gold/25 bg-gold-50/70 px-4 py-3.5">
            <ShieldCheck size={16} strokeWidth={1.5} className="mt-0.5 shrink-0 text-gold-700" />
            <p className="text-[12.5px] leading-5 text-gold-700">
              Placing this order buys the goods from AfriDeal. We procure them from a verified
              supplier and hand them to your courier, who clears customs at the border and
              delivers them to you. We cover the order under our returns and refunds policy until
              seven days after delivery.
            </p>
          </div>
        </div>

        {/* ── Mobile sticky Place Order bar (Benchmark §3a & Feature 5) ── */}
        <div className="fixed bottom-[calc(56px+env(safe-area-inset-bottom))] inset-x-0 z-[60] border-t border-hairline bg-white p-3 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] lg:hidden">
          <div className="mx-auto flex max-w-market items-center justify-between gap-4">
            <div>
              <span className="block text-[11px] text-muted">Total to pay</span>
              <MoneyText amount={total} size="md" tone="ink" />
            </div>
            <ActionButton
              type="submit"
              size="lg"
              className="flex-1 max-w-[200px]"
              loading={isSubmitting}
              withArrow
            >
              Place order
            </ActionButton>
          </div>
        </div>
      </form>
    </>
  );
}
