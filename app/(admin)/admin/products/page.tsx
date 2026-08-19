import { PageHeader } from '@/components/brand/Panel';
import { ConsoleTopbar } from '@/components/layout/ConsoleTopbar';
import { auth } from '@/lib/auth';
import { readAll } from '@/lib/db';
import { getCatalogue, getNotifications } from '@/lib/queries';

import { ProductsBoard } from './ProductsBoard';

export const dynamic = 'force-dynamic';

export default async function AdminProductsPage() {
  const [session, catalogue, images] = await Promise.all([
    auth(),
    getCatalogue(),
    readAll('product-images'),
  ]);
  const notifications = session?.user ? await getNotifications(session.user.id) : [];

  const categoryName = new Map(catalogue.categories.map((category) => [category.id, category.name]));

  // The console shows the same photograph the storefront does, so an admin
  // checking a listing sees what the buyer sees rather than a swatch.
  const primaryImage = new Map(
    images.filter((image) => image.sort_order === 0).map((image) => [image.product_id, image]),
  );

  const products = catalogue.products.map((product) => ({
    ...product,
    categoryName: categoryName.get(product.category_id) ?? 'Uncategorised',
    image: primaryImage.get(product.id),
  }));

  return (
    <>
      <ConsoleTopbar
        title="Products"
        breadcrumb={[{ label: 'Admin console' }, { label: 'Products' }]}
        notifications={notifications}
      />

      <div className="mx-auto max-w-console px-6 py-6">
        <PageHeader
          eyebrow="Commerce"
          title="Product catalogue"
          description={`${products.length} products across ${catalogue.categories.length} categories. Supplier counts reflect verified, active offers only.`}
        />

        <ProductsBoard products={products} categories={catalogue.categories} />
      </div>
    </>
  );
}
