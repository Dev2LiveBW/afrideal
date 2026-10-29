import {
  MobileTabBar,
  StorefrontFooter,
  StorefrontNav,
} from '@/components/layout/StorefrontNav';
import { cookies } from 'next/headers';

import { BuyerCurrencyProvider } from '@/components/brand/BuyerCurrency';
import { activeCountries } from '@/lib/countries';
import { readAll } from '@/lib/db';
import { DELIVER_TO_COOKIE, decodeDeliverTo } from '@/lib/deliver-to';

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  /*
   * Read here rather than inside the nav: the nav is a client component, and
   * the category list is the one piece of real data the mobile menu needs.
   * Passing seven rows down beats making every storefront page fetch them.
   */
  const [categories, products, countries] = await Promise.all([
    readAll('categories'),
    readAll('products'),
    activeCountries(),
  ]);

  /*
   * What the search field suggests while it is empty (benchmark §3a, the
   * rolling placeholder). The benchmark uses live search volume; the
   * nearest honest stand-in here is the best-rated listed products.
   */
  const hotSearches = products
    .filter((product) => product.status === 'ACTIVE')
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 6)
    .map((product) => product.name);

  // Spec 0009: what each country's buyers pay in, for the storefront's prices.
  const buyerCurrencies = Object.fromEntries(
    countries.map((country) => [country.code, country.buyer_currency]),
  );

  // The shopper's "Deliver to", so the first paint is already in their town and currency.
  const initialDeliverTo = decodeDeliverTo(cookies().get(DELIVER_TO_COOKIE)?.value, countries);

  return (
    <BuyerCurrencyProvider buyerCurrencies={buyerCurrencies} initialDeliverTo={initialDeliverTo}>
    <div className="flex min-h-[100dvh] flex-col">
      <StorefrontNav categories={categories} hotSearches={hotSearches} countries={countries} />
      {/*
        The nav is fixed and detached from the top, so pages that do not open
        with a full-bleed dark hero add their own top padding. The landing page
        deliberately runs underneath it.
      */}
      <main className="flex-1">{children}</main>
      <StorefrontFooter />

      {/*
        The tab bar floats over the page on phones, so the foot of every screen
        reserves its height plus the home indicator. The space is given back
        from `md` up, where the bar is not rendered at all.
      */}
      <div
        aria-hidden="true"
        className="h-[calc(56px+env(safe-area-inset-bottom))] shrink-0 md:hidden"
      />
      <MobileTabBar />
    </div>
    </BuyerCurrencyProvider>
  );
}
