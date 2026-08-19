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
  searchParams: { category?: string; q?: string };
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

  return (
    <div className="mx-auto max-w-market px-6 pb-24 pt-28">
      <BrowseClient
        categories={categories}
        products={enriched}
        images={images}
        initialCategory={searchParams.category ?? 'all'}
        initialQuery={searchParams.q ?? ''}
      />
    </div>
  );
}
