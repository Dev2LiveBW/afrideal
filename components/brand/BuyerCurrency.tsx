'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { BASE_CURRENCY, fromPula, moneyTag } from '@/lib/currency.mjs';
import { DEFAULT_DELIVER_TO, type DeliverTo } from '@/lib/deliver-to';
import { useAfriDealStore } from '@/store/useAfriDealStore';
import type { CountryCode, CurrencyCode } from '@/types';

/**
 * The storefront's display currency (spec 0009, answer 1): the buyer currency
 * of the shopper's "Deliver to" country. Only the storefront is wrapped, so
 * console screens (finance, suppliers, admin) keep showing pula, the currency
 * AfriDeal books in.
 */
const BuyerCurrencyContext = createContext<CurrencyCode | null>(null);

/** The shopper's "Deliver to", the same on the server's first paint and after hydration. */
const DeliverToContext = createContext<DeliverTo>(DEFAULT_DELIVER_TO);

export function BuyerCurrencyProvider({
  buyerCurrencies,
  initialDeliverTo = DEFAULT_DELIVER_TO,
  children,
}: {
  /** Country code → the currency its buyers pay in, from the `countries` data. */
  buyerCurrencies: Record<CountryCode, CurrencyCode>;
  /**
   * "Deliver to" as the server read it from its cookie. The persisted store is
   * only readable after hydration; until then this stands in for it, and the
   * two agree because the store writes the cookie.
   */
  initialDeliverTo?: DeliverTo;
  children: ReactNode;
}) {
  const stored = useAfriDealStore((state) => state.deliverTo);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const deliverTo = mounted ? stored : initialDeliverTo;
  const currency = buyerCurrencies[deliverTo.country] ?? BASE_CURRENCY;
  return (
    <DeliverToContext.Provider value={deliverTo}>
      <BuyerCurrencyContext.Provider value={currency}>{children}</BuyerCurrencyContext.Provider>
    </DeliverToContext.Provider>
  );
}

/** The shopper's currency inside the storefront; null outside it (console screens). */
export function useBuyerCurrency(): CurrencyCode | null {
  return useContext(BuyerCurrencyContext);
}

/** The shopper's "Deliver to" inside the storefront; the default outside it. */
export function useDeliverTo(): DeliverTo {
  return useContext(DeliverToContext);
}

/** A pula price as the shopper's shelf tag: `P420` in Botswana, `R420` elsewhere. */
export function PriceText({ amount }: { amount: number }) {
  const currency = useBuyerCurrency() ?? BASE_CURRENCY;
  return <>{moneyTag(fromPula(amount, currency), currency)}</>;
}
