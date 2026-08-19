import { PageHeader } from '@/components/brand/Panel';
import { ConsoleTopbar } from '@/components/layout/ConsoleTopbar';
import { auth } from '@/lib/auth';
import { getCatalogue, getNotifications } from '@/lib/queries';

import { ProductsBoard } from './ProductsBoard';

export const dynamic = 'force-dynamic';

export default async function AdminProductsPage() {
  const [session, catalogue] = await Promise.all([auth(), getCatalogue()]);
  const notifications = session?.user ? await getNotifications(session.user.id) : [];

  const categoryName = new Map(catalogue.categories.map((category) => [category.id, category.name]));
  const products = catalogue.products.map((product) => ({
    ...product,
    categoryName: categoryName.get(product.category_id) ?? 'Uncategorised',
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
