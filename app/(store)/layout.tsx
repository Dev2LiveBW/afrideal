import { StorefrontFooter, StorefrontNav } from '@/components/layout/StorefrontNav';
import { readAll } from '@/lib/db';

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  /*
   * Read here rather than inside the nav: the nav is a client component, and
   * the category list is the one piece of real data the mobile menu needs.
   * Passing seven rows down beats making every storefront page fetch them.
   */
  const categories = await readAll('categories');

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <StorefrontNav categories={categories} />
      {/*
        The nav is fixed and detached from the top, so pages that do not open
        with a full-bleed dark hero add their own top padding. The landing page
        deliberately runs underneath it.
      */}
      <main className="flex-1">{children}</main>
      <StorefrontFooter />
    </div>
  );
}
