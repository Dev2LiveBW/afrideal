'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { BASE_CURRENCY, fromPula, moneyTag } from '@/lib/currency.mjs';
import { DEFAULT_DELIVER_TO, useAfriDealStore } from '@/store/useAfriDealStore';
import type { CountryCode, CurrencyCode } from '@/types';

/**
 * The storefront's display currency (spec 0009, answer 1): the buyer currency
 * of the shopper's "Deliver to" country. Only the storefront is wrapped, so
 * console screens (finance, suppliers, admin) keep showing pula, the currency
 * AfriDeal books in. Read after hydration, like the header.
 */
const BuyerCurrencyContext = createContext<CurrencyCode | null>(null);

export function BuyerCurrencyProvider({
  buyerCurrencies,
  children,
}: {
  /** Country code → the currency its buyers pay in, from the `countries` data. */
  buyerCurrencies: Record<CountryCode, CurrencyCode>;
  children: ReactNode;
}) {
  const country = useAfriDealStore((state) => state.deliverTo.country);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const currency = buyerCurrencies[mounted ? country : DEFAULT_DELIVER_TO.country] ?? BASE_CURRENCY;
  return <BuyerCurrencyContext.Provider value={currency}>{children}</BuyerCurrencyContext.Provider>;
}

/** The shopper's currency inside the storefront; null outside it (console screens). */
export function useBuyerCurrency(): CurrencyCode | null {
  return useContext(BuyerCurrencyContext);
}

/** A pula price as the shopper's shelf tag: `P420` in Botswana, `R420` elsewhere. */
export function PriceText({ amount }: { amount: number }) {
  const currency = useBuyerCurrency() ?? BASE_CURRENCY;
  return <>{moneyTag(fromPula(amount, currency), currency)}</>;
}
