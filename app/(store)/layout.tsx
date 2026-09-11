import {
  MobileTabBar,
  StorefrontFooter,
  StorefrontNav,
} from '@/components/layout/StorefrontNav';
import { readAll } from '@/lib/db';

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  /*
   * Read here rather than inside the nav: the nav is a client component, and
   * the category list is the one piece of real data the mobile menu needs.
   * Passing seven rows down beats making every storefront page fetch them.
   */
  const [categories, products] = await Promise.all([readAll('categories'), readAll('products')]);

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

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <StorefrontNav categories={categories} hotSearches={hotSearches} />
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
  );
}
