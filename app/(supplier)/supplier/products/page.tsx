import Link from 'next/link';
import { ArrowUpRight, ShieldAlert } from 'lucide-react';

import { EmptyState, PageHeader } from '@/components/brand/Panel';
import { auth } from '@/lib/auth';
import { readAll } from '@/lib/db';
import { DIRECTORY_ROUTE } from '@/lib/directory-placement';
import { getSupplierWorkspace } from '@/lib/queries';
import { ProductsClient } from './ProductsClient';

export const dynamic = 'force-dynamic';

export default async function SupplierProductsPage() {
  const session = await auth();
  const supplierId = session?.user.supplier_id ?? null;
  const workspace = supplierId ? await getSupplierWorkspace(supplierId) : null;

  if (!workspace?.supplier) {
    return (
      <EmptyState
        icon={<ShieldAlert size={22} strokeWidth={1.5} />}
        title="No supplier profile linked"
        description="This account isn't linked to a supplier record, so there's no catalogue to show."
      />
    );
  }

  const [categories, images] = await Promise.all([
    readAll('categories'),
    readAll('product-images'),
  ]);

  const rows = workspace.offers
    .map((offer) => {
      const product = workspace.products.find((candidate) => candidate.id === offer.product_id);
      if (!product) return null;
      const category = categories.find((c) => c.id === product.category_id) ?? null;
      const image = images.find(
        (candidate) => candidate.product_id === product.id && candidate.sort_order === 0,
      );
      return { offer, product, category, image };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .sort((a, b) => a.product.name.localeCompare(b.product.name));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Catalogue"
        title="Your products"
        description="Everything you currently list on AfriDeal, with the price customers pay alongside what you're paid per unit."
        action={
          /*
           * TICKET-007 - the supplier side of the directory. A supplier
           * managing listings here cannot otherwise see what a buyer sees:
           * the same rows appear in the public grid with their MOQ, the
           * verified badge and the company name attached.
           *
           * TODO(TICKET-007): the directory's placement is unconfirmed, so
           * this link follows DIRECTORY_ROUTE rather than hard-coding a path.
           */
          <Link
            href={DIRECTORY_ROUTE}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-forest underline-offset-4 hover:underline"
          >
            View your public listings
            <ArrowUpRight size={14} strokeWidth={1.75} aria-hidden="true" />
          </Link>
        }
      />

      <ProductsClient rows={rows} categories={categories} />
    </div>
  );
}
