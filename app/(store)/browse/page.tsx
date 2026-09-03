import type { Metadata } from 'next';

import { readAll } from '@/lib/db';
import { getCatalogue } from '@/lib/queries';
import { rankOffers } from '@/lib/supplier-selection';

import { BrowseClient } from './BrowseClient';

export const metadata: Metadata = { title: 'Browse' };
export const dynamic = 'force-dynamic';

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: { category?: string; q?: string; sort?: string };
}) {
  const [{ categories, products }, images, offers, suppliers] = await Promise.all([
    getCatalogue(),
    readAll('product-images'),
    readAll('supplier-offers'),
    readAll('suppliers'),
  ]);

  const categoryName = new Map(categories.map((category) => [category.id, category.name]));

  // Resolve the routed supplier here so quick-add books against a real one.
  const enriched = products.map((product) => ({
    ...product,
    categoryName: categoryName.get(product.category_id),
    primarySupplierId:
      rankOffers(
        offers.filter((offer) => offer.product_id === product.id),
        suppliers,
      ).primary?.supplier.id ?? '',
  }));

  // The home shortcuts deep-link into a sorted shelf ("New arrivals", "Top
  // rated"), so the sort has to survive the navigation rather than reset to
  // featured the moment the page mounts.
  const SORTS = ['featured', 'price-asc', 'price-desc', 'rating', 'newest'] as const;
  const requested = SORTS.find((option) => option === searchParams.sort) ?? 'featured';

  return (
    <div className="mx-auto max-w-market px-4 pb-16 pt-6 sm:px-6 sm:pb-24 sm:pt-8">
      <BrowseClient
        categories={categories}
        products={enriched}
        images={images}
        initialCategory={searchParams.category ?? 'all'}
        initialQuery={searchParams.q ?? ''}
        initialSort={requested}
      />
    </div>
  );
}
