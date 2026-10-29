'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, ShieldCheck, ShoppingBag } from 'lucide-react';
import { z } from 'zod';

import { ActionButton } from '@/components/brand/ActionButton';
import { PriceText } from '@/components/brand/BuyerCurrency';
import { MoneyText } from '@/components/brand/MoneyText';
import { EmptyState, Enclosure } from '@/components/brand/Panel';
import { CartLineThumb } from '@/components/storefront/CartLineThumb';
import { DEFAULT_DELIVER_TO, useAfriDealStore } from '@/store/useAfriDealStore';
import { COLLECTION_POINTS } from '@/lib/collection-points';
import { courierFee, couriersForLane } from '@/lib/couriers.mjs';
import { isCrossBorder } from '@/lib/lanes.mjs';
import { priceLine, sellerQuantities } from '@/lib/pricing-tiers';
import { cn } from '@/lib/utils';
import type { Country, Courier, CustomerPrice, CustomerType, PaymentMethod, Product } from '@/types';

const DOORSTEP_DELIVERY_FEE = 45;
const COLLECTION_POINT_DELIVERY_FEE = 25;


const CheckoutSchema = z
  .object({
    /** Spec 0009: any active country; the server checks it against the data. */
    delivery_country: z.string().length(2, 'Choose a country.'),
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

/** A short label for a method's tile. */
const MONOGRAM: Partial<Record<PaymentMethod, string>> = {
  DPO_PAY: 'CARD',
  PAYGATE: 'CARD',
  ORANGE_MONEY: 'OM',
  EFT: 'EFT',
};
const monogramFor = (name: string, method?: PaymentMethod) =>
  (method && MONOGRAM[method]) ??
  name
    .split(/[\s/]+/)
    .map((word) => word[0])
    .join('')
    .slice(0, 4)
    .toUpperCase();

export function CheckoutClient({
  customerName,
  customerEmail,
  bands,
  products,
  customerType,
  methods,
  countries,
  couriers,
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
  /** Active countries and their towns (spec 0009); checkout starts from "Deliver to". */
  countries: Country[];
  /** Listed couriers and their routes (spec 0008), to quote the courier's own fee. */
  couriers: Courier[];
}) {
  const router = useRouter();
  const cart = useAfriDealStore((state) => state.cart);
  const clearCart = useAfriDealStore((state) => state.clearCart);
  const deliverTo = useAfriDealStore((state) => state.deliverTo);

  const [mounted, setMounted] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  // Set once the order is placed: the cart empties before the next page
  // arrives, and this keeps "nothing to check out" from flashing meanwhile.
  const [leaving, setLeaving] = useState<'payment' | 'order' | null>(null);

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
      delivery_country: DEFAULT_DELIVER_TO.country,
      delivery_method: 'DOORSTEP',
      collection_point: '',
      delivery_address: '',
      delivery_city: DEFAULT_DELIVER_TO.city,
      payment_method: methods[0] ?? 'EFT',
    },
  });

  /*
   * Start from the header's "Deliver to" once the persisted value is readable
   * (spec 0009). The buyer can still change the country or town here.
   */
  useEffect(() => {
    if (!mounted) return;
    setValue('delivery_country', deliverTo.country);
    setValue('delivery_city', deliverTo.city);
  }, [mounted, deliverTo.country, deliverTo.city, setValue]);

  const selectedGateway = watch('payment_method');
  const selectedCountry = watch('delivery_country') ?? DEFAULT_DELIVER_TO.country;
  const countryEntry = countries.find((country) => country.code === selectedCountry);
  const selectedDeliveryMethod = watch('delivery_method') ?? 'DOORSTEP';
  // Only the lockers in the delivery country; a country with none offers doorstep alone.
  const pointsHere = COLLECTION_POINTS.filter((point) => point.country === selectedCountry);
  const selectedCollectionPointName = watch('collection_point');
  const selectedPoint =
    pointsHere.find((p) => p.name === selectedCollectionPointName) ?? pointsHere[0] ?? null;

  useEffect(() => {
    if (selectedDeliveryMethod === 'COLLECTION_POINT' && pointsHere.length === 0) {
      setValue('delivery_method', 'DOORSTEP');
    }
  }, [selectedDeliveryMethod, pointsHere.length, setValue]);
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
    selectedDeliveryMethod === 'COLLECTION_POINT' && selectedPoint
      ? selectedPoint.fee
      : DOORSTEP_DELIVERY_FEE;
  const total = subtotal + deliveryFee;

  const hasImportedItems = cart.some((line) => {
    const product = products.find((candidate) => candidate.id === line.product_id);
    // Spec 0009: cross-border on this order's lane, to the locker's country or the buyer's.
    const deliveryCountry =
      selectedDeliveryMethod === 'COLLECTION_POINT' && selectedPoint
        ? selectedPoint.country
        : selectedCountry;
    return product ? isCrossBorder(product.country_of_origin, deliveryCountry) : false;
  });

  /*
   * Spec 0009, answer 2: the delivery country's payment methods, in its order.
   * One is selectable when the platform can take money through it now; the
   * rest are listed as "coming soon".
   */
  const countryMethods = (countryEntry?.payment_methods ?? []).map((entry) => ({
    ...entry,
    live: entry.method !== undefined && methods.includes(entry.method),
  }));
  const firstLive = countryMethods.find((entry) => entry.live)?.method;
  const selectedIsLive = countryMethods.some((entry) => entry.live && entry.method === selectedGateway);
  useEffect(() => {
    if (!selectedIsLive && firstLive) setValue('payment_method', firstLive);
  }, [selectedCountry, firstLive, selectedIsLive, setValue]);

  /*
   * Spec 0008: the courier's own fee for each cross-border origin on this lane,
   * shown so the buyer knows it, but paid to the courier and never in the total.
   */
  const laneCountry =
    selectedDeliveryMethod === 'COLLECTION_POINT' && selectedPoint ? selectedPoint.country : selectedCountry;
  const laneTown =
    selectedDeliveryMethod === 'COLLECTION_POINT' && selectedPoint
      ? selectedPoint.city
      : (watch('delivery_city') ?? '');
  const goodsByOrigin = new Map<string, number>();
  for (const entry of priced) {
    const origin = products.find((candidate) => candidate.id === entry.line.product_id)?.country_of_origin;
    if (!origin || !isCrossBorder(origin, laneCountry)) continue;
    goodsByOrigin.set(origin, (goodsByOrigin.get(origin) ?? 0) + entry.unitPrice * entry.line.qty);
  }
  const courierQuotes = [...goodsByOrigin].map(([origin, goods]) => {
    const found = couriersForLane(couriers, {
      fromCountry: origin,
      toCountry: laneCountry,
      toCity: laneTown,
    })[0];
    return { origin, courier: found?.courier ?? null, quote: found ? courierFee(found.route, goods) : null };
  });

  const onSubmit = handleSubmit(async (values) => {
    setApiError(null);
    if (!countryMethods.some((entry) => entry.live && entry.method === values.payment_method)) {
      setApiError(
        `No payment method is live for ${countryEntry?.name ?? 'this country'} yet. Card payments open at launch.`,
      );
      return;
    }

    const point =
      pointsHere.find((p) => p.name === values.collection_point) ?? pointsHere[0] ?? null;
    const isCollection = values.delivery_method === 'COLLECTION_POINT' && point !== null;
    const finalAddress = isCollection ? point.name : (values.delivery_address ?? '');
    const finalCity = isCollection ? point.city : (values.delivery_city ?? '');

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
        delivery_country: isCollection ? point.country : values.delivery_country,
      }),
    });

    const body = await response.json().catch(() => null);

    if (!response.ok) {
      setApiError(body?.error ?? 'We could not place that order. Please try again.');
      return;
    }

    setLeaving(body.payment?.redirect_url ? 'payment' : 'order');
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

  if (leaving) {
    return (
      <EmptyState
        icon={<ShieldCheck size={22} strokeWidth={1.5} />}
        title="Order placed"
        description={leaving === 'payment' ? 'Taking you to the card page…' : 'Opening your order…'}
        className="rounded-md border border-hairline bg-surface-raised"
      />
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

            {/* Spec 0009: a buyer can be in any country AfriDeal trades in. */}
            <div className="mt-4">
              <label htmlFor="delivery_country" className="mb-1.5 block text-[13px] font-medium text-ink">
                Country
              </label>
              <select
                id="delivery_country"
                {...register('delivery_country', {
                  onChange: (event) => {
                    const next = countries.find((country) => country.code === event.target.value);
                    setValue('delivery_city', next?.towns[0] ?? '');
                    setValue('collection_point', '');
                  },
                })}
                className="w-full rounded border border-hairline-strong bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none transition-colors focus:border-gold/60"
              >
                {countries.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
            </div>

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
                    By runner to your home or office (<PriceText amount={DOORSTEP_DELIVERY_FEE} />)
                  </span>
                </span>
              </label>

              {pointsHere.length > 0 && (
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
                      setValue('collection_point', pointsHere[0]?.name ?? '');
                    }
                  }}
                  className="mt-0.5 accent-gold"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-medium text-ink">Collection Point</span>
                  <span className="mt-0.5 block text-[12px] text-body">
                    Pickup from smart locker (from <PriceText amount={COLLECTION_POINT_DELIVERY_FEE} />)
                  </span>
                </span>
              </label>
              )}
            </div>

            {selectedDeliveryMethod === 'COLLECTION_POINT' && selectedPoint ? (
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
                    {pointsHere.map((point) => (
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
                    list="delivery-towns"
                    placeholder={countryEntry?.towns[0] ?? 'Town or city'}
                    autoComplete="address-level2"
                    aria-invalid={errors.delivery_city ? 'true' : undefined}
                    aria-describedby={errors.delivery_city ? 'city-error' : undefined}
                    className={cn(
                      'w-full rounded border bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none transition-colors',
                      'placeholder:text-muted focus:border-gold/60',
                      errors.delivery_city ? 'border-danger/60' : 'border-hairline-strong',
                    )}
                  />
                  <datalist id="delivery-towns">
                    {(countryEntry?.towns ?? []).map((town) => (
                      <option key={town} value={town} />
                    ))}
                  </datalist>
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
              {countryMethods.map((gateway) => {
                const active = gateway.live && selectedGateway === gateway.method;

                return (
                  <label
                    key={gateway.name}
                    aria-disabled={!gateway.live}
                    className={cn(
                      'flex items-center gap-4 rounded-md border p-4 transition-all duration-250 ease-[cubic-bezier(0.16,1,0.3,1)]',
                      !gateway.live
                        ? 'cursor-not-allowed border-hairline bg-surface opacity-60'
                        : active
                          ? 'cursor-pointer border-gold bg-gold-50/60 ring-1 ring-inset ring-gold/30'
                          : 'cursor-pointer border-hairline-strong bg-surface hover:border-ink/25',
                    )}
                  >
                    <input
                      type="radio"
                      value={gateway.method ?? gateway.name}
                      checked={active}
                      disabled={!gateway.live}
                      onChange={() => gateway.method && setValue('payment_method', gateway.method)}
                      className="sr-only"
                    />

                    <span
                      className={cn(
                        'flex h-11 w-14 shrink-0 items-center justify-center rounded font-mono text-[12px] font-semibold tracking-tight',
                        active ? 'bg-ink text-gold-light' : 'bg-ink/[0.06] text-body',
                      )}
                    >
                      {monogramFor(gateway.name, gateway.method)}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-[14px] font-medium text-ink">
                        {gateway.name}
                        {!gateway.live && (
                          <span className="rounded bg-ink/[0.06] px-1.5 py-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-wider text-body">
                            Coming soon
                          </span>
                        )}
                      </span>
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
                {courierQuotes.map(({ origin, courier, quote }) => (
                  <div key={origin}>
                    <div className="flex items-center justify-between">
                      <dt className="text-body">Courier{courier ? ` · ${courier.name}` : ''}</dt>
                      <dd className="text-right">
                        {courier && quote ? (
                          <MoneyText currency="BWP" amount={quote.fee} size="sm" tone="muted" />
                        ) : (
                          <span className="text-[12.5px] text-body">Arranged after you order</span>
                        )}
                      </dd>
                    </div>
                    <p className="mt-0.5 text-[11.5px] leading-4 text-muted">
                      Paid to {courier ? courier.name : 'the courier'} on arrival, not to AfriDeal, so it is
                      not in your total. VAT and duty are paid at the border.
                    </p>
                  </div>
                ))}
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
