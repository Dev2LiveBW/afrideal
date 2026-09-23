import type { Metadata } from 'next';

import { CategoryBrowser } from '@/components/storefront/CategoryBrowser';
import { readAll } from '@/lib/db';

/**
 * Categories - the two-pane browser. Alibaba benchmark §2.
 *
 * The mobile tab bar's "Categories" tab lands here. On a desktop the same
 * frame runs at a comfortable width inside the market container.
 */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Categories',
  description: 'Browse AfriDeal by trade.',
};

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: { category?: string };
}) {
  const [categories, products, images] = await Promise.all([
    readAll('categories'),
    readAll('products'),
    readAll('product-images'),
  ]);

  // Accept a slug or an id, the way /browse does.
  const initial = categories.find(
    (category) => category.slug === searchParams.category || category.id === searchParams.category,
  )?.id;

  return (
    <div className="mx-auto max-w-market pb-24">
      <header className="flex items-center justify-between px-4 pb-2 pt-4">
        <h1 className="font-display text-[18px] font-bold text-ink">Categories</h1>
      </header>

      <CategoryBrowser
        categories={categories}
        products={products}
        images={images}
        initialCategoryId={initial}
        className="border-t border-hairline"
      />
    </div>
  );
}
