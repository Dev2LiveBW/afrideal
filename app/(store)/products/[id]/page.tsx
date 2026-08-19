import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BadgeCheck, Lock, Star, Truck } from 'lucide-react';

import { SupplierComparisonMatrix } from '@/components/procurement/SupplierComparisonMatrix';
import { ProductGallery } from '@/components/storefront/ProductGallery';
import { Breadcrumb, DeliveryEstimate, SellerCard } from '@/components/storefront/ProductPanels';
import { ProductRail } from '@/components/storefront/ProductRail';
import { ProductTabs } from '@/components/storefront/ProductTabs';
import { auth } from '@/lib/auth';
import { readAll } from '@/lib/db';
import { getCatalogue, getProductDetail, toPublicOffers } from '@/lib/queries';
import { rankOffers } from '@/lib/supplier-selection';

import { ProductBuyPanel } from './ProductBuyPanel';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const detail = await getProductDetail(params.id);
  return { title: detail?.product.name ?? 'Product' };
}

export default async function ProductPage({ params }: { params: { id: string } }) {
  const detail = await getProductDetail(params.id);
  if (!detail) notFound();

  const { product, categoryName, selection } = detail;

  const [{ products, categories }, allBands, allImages, offers, suppliers, session] =
    await Promise.all([
      getCatalogue(),
      readAll('customer-prices'),
      readAll('product-images'),
      readAll('supplier-offers'),
      readAll('suppliers'),
      auth(),
    ]);

  // §7 — the tier comes from the account, resolved server-side.
  const customerType = session?.user?.customer_type ?? 'GUEST';
  const bands = allBands.filter((band) => band.product_id === product.id);
  const images = allImages.filter((image) => image.product_id === product.id);

  // §5 — redacted at the server boundary. Passing selection.all straight to a
  // client component would serialise every supplier_cost into the page payload.
  const publicOffers = toPublicOffers(selection.all);

  const categoryLookup = new Map(categories.map((category) => [category.id, category.name]));
  const related = products
    .filter((entry) => entry.category_id === product.category_id && entry.id !== product.id)
    .slice(0, 6)
    .map((entry) => ({
      ...entry,
      categoryName: categoryLookup.get(entry.category_id),
      primarySupplierId:
        rankOffers(
          offers.filter((offer) => offer.product_id === entry.id),
          suppliers,
        ).primary?.supplier.id ?? '',
    }));

  const inStock = publicOffers.some((offer) => offer.in_stock);
  const fastest = publicOffers
    .filter((offer) => offer.in_stock)
    .reduce<number | null>(
      (best, offer) => (best === null || offer.fulfilment_days < best ? offer.fulfilment_days : best),
      null,
    );

  return (
    <div className="mx-auto max-w-market px-6 pb-24 pt-28">
      <Breadcrumb
        trail={[
          { label: 'Home', href: '/' },
          { label: categoryName, href: `/browse?category=${product.category_id}` },
          { label: product.name },
        ]}
      />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:gap-14">
        {/* ── Gallery ──────────────────────────────────────────────────── */}
        <div>
          <ProductGallery product={product} images={images} />
        </div>

        {/* ── Buy panel ────────────────────────────────────────────────── */}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {product.rating >= 4.5 && (
              <span className="rounded-full bg-forest-wash px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-forest-ink">
                Top rated
              </span>
            )}
            {product.promotion && (
              <span className="rounded-full bg-danger px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
                −{product.promotion.discount_pct}% this week
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 text-[12.5px] text-body">
              <Star size={13} strokeWidth={1.5} className="fill-gold text-gold" />
              <span className="font-mono tabular-nums text-ink">{product.rating.toFixed(1)}</span>
              <span className="text-muted">({product.review_count} reviews)</span>
            </span>
          </div>

          <h1 className="mt-3 font-display text-[28px] font-bold leading-[1.15] tracking-[-0.025em] text-ink">
            {product.name}
          </h1>
          <p className="measure mt-3 text-[14px] leading-6 text-body">{product.short_description}</p>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-[12.5px]">
            {publicOffers.length > 0 && (
              <span className="inline-flex items-center gap-1.5 text-forest">
                <BadgeCheck size={13} strokeWidth={1.5} />
                {publicOffers.length} verified{' '}
                {publicOffers.length === 1 ? 'supplier' : 'suppliers'}
              </span>
            )}
            {fastest !== null && (
              <span className="inline-flex items-center gap-1.5 text-body">
                <Truck size={13} strokeWidth={1.5} className="text-muted" />
                From {fastest} {fastest === 1 ? 'day' : 'days'}
              </span>
            )}
          </div>

          <ProductBuyPanel
            product={product}
            bands={bands}
            customerType={customerType}
            inStock={inStock}
            primarySupplierId={selection.primary?.supplier.id ?? ''}
          />

          <DeliveryEstimate offers={publicOffers} city="Gaborone" />
          <SellerCard offer={publicOffers.find((offer) => offer.is_primary)} />

          <div className="mt-3 flex items-start gap-3 rounded-md border border-hairline bg-gold-50/60 px-4 py-3.5">
            <Lock size={15} strokeWidth={1.5} className="mt-0.5 shrink-0 text-gold-700" />
            <p className="text-[12.5px] leading-5 text-gold-700">
              Your payment is held by AfriDeal and released to the supplier only once you confirm the
              order arrived. If it does not, you raise a dispute and the funds stay frozen.
            </p>
          </div>
        </div>
      </div>

      <ProductTabs product={product} />

      <section className="mt-14">
        <SupplierComparisonMatrix productName={product.name} offers={publicOffers} />
      </section>

      {related.length > 0 && (
        <section className="mt-16">
          <ProductRail
            products={related}
            images={allImages}
            title="Frequently bought together"
            description={`Other ${categoryName.toLowerCase()} lines buyers add to the same order`}
          />
        </section>
      )}
    </div>
  );
}
