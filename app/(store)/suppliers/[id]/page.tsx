import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, BadgeCheck, CheckCircle2, Clock, MapPin, Package, Star } from 'lucide-react';

import { PriceTag } from '@/components/brand/MoneyText';
import { HomeTabs } from '@/components/storefront/home/HomeTabs';
import { Swatch } from '@/components/storefront/Swatch';
import { getSupplierStorefront } from '@/lib/directory';
import { humanise } from '@/lib/format';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const store = await getSupplierStorefront(params.id);
  if (!store) return { title: 'Supplier not found' };

  return {
    title: `${store.supplier.name} · Verified Supplier`,
    description: `Browse ${store.listings.length} products supplied by ${store.supplier.name} (${store.supplier.city}, ${store.country_name}).`,
  };
}

export default async function SupplierStorefrontPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { category?: string };
}) {
  const store = await getSupplierStorefront(params.id);

  if (!store) notFound();

  const { supplier, country_name: countryName, categories: supplierCategories, listings } = store;
  const isVerified = supplier.status === 'VERIFIED';

  const activeCategory = supplierCategories.find(
    (cat) => cat.slug === searchParams.category || cat.id === searchParams.category,
  );

  const visibleProducts = activeCategory
    ? listings.filter((item) => item.category_id === activeCategory.id)
    : listings;

  return (
    <div className="pb-24">
      <HomeTabs />

      <div className="mx-auto max-w-market px-4 pt-4">
        {/* Back link */}
        <nav aria-label="Breadcrumb" className="mb-3 flex items-center gap-2 text-[12px] text-muted">
          <Link
            href="/suppliers"
            className="inline-flex items-center gap-1 font-medium text-body transition-colors hover:text-ink"
          >
            <ArrowLeft size={13} strokeWidth={1.75} aria-hidden="true" />
            Verified suppliers
          </Link>
          <span aria-hidden="true">/</span>
          <span className="truncate text-ink">{supplier.name}</span>
        </nav>

        {/* Supplier Store Header */}
        <section className="rounded-lg border border-hairline bg-surface-raised p-4 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3.5">
              <span
                aria-hidden="true"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-forest text-[15px] font-bold tracking-wide text-white sm:h-14 sm:w-14 sm:text-[17px]"
              >
                {supplier.initials}
              </span>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-[18px] font-bold text-ink sm:text-[22px]">
                    {supplier.name}
                  </h1>
                  {isVerified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-ocean-wash px-2.5 py-0.5 text-[11px] font-semibold text-ocean-ink">
                      <BadgeCheck size={13} strokeWidth={2.25} className="text-ocean" aria-hidden="true" />
                      Verified Supplier
                    </span>
                  )}
                </div>

                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-body">
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={12} strokeWidth={1.75} className="text-muted" aria-hidden="true" />
                    {supplier.city}, {countryName}
                  </span>
                  <span className="text-muted">·</span>
                  <span>{humanise(supplier.supplier_type ?? 'WHOLESALER')}</span>
                </p>
              </div>
            </div>

            {/* Credentials strip */}
            <dl className="grid grid-cols-4 gap-2 rounded-md border border-hairline bg-canvas px-3 py-2.5 text-center sm:flex sm:items-center sm:gap-5 sm:px-4">
              <div>
                <dt className="text-[10px] uppercase tracking-wider text-muted">Rating</dt>
                <dd className="mt-0.5 inline-flex items-center gap-1 font-mono text-[13px] font-semibold text-ink">
                  <Star size={11} className="fill-gold text-gold" aria-hidden="true" />
                  {supplier.rating.toFixed(1)}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wider text-muted">Fulfilment</dt>
                <dd className="mt-0.5 inline-flex items-center gap-1 font-mono text-[13px] font-semibold text-forest">
                  <CheckCircle2 size={11} strokeWidth={2} aria-hidden="true" />
                  {supplier.fulfilment_rate}%
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wider text-muted">Lead time</dt>
                <dd className="mt-0.5 inline-flex items-center gap-1 font-mono text-[13px] font-semibold text-ink">
                  <Clock size={11} strokeWidth={1.75} className="text-muted" aria-hidden="true" />
                  {supplier.avg_fulfilment_days}d
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wider text-muted">Products</dt>
                <dd className="mt-0.5 inline-flex items-center gap-1 font-mono text-[13px] font-semibold text-ink">
                  <Package size={11} strokeWidth={1.75} className="text-muted" aria-hidden="true" />
                  {listings.length}
                </dd>
              </div>
            </dl>
          </div>
        </section>

        {/* Category Filter Chips */}
        {supplierCategories.length > 1 && (
          <nav
            aria-label="Filter supplier products by category"
            className="no-scrollbar -mx-4 overflow-x-auto px-4 pb-2 pt-4"
          >
            <ul className="flex w-max gap-2">
              <li>
                <Link
                  href={`/suppliers/${supplier.id}`}
                  className={cn(
                    'inline-flex h-8 items-center whitespace-nowrap rounded-full border px-3 text-[12px] font-medium transition-colors',
                    !activeCategory
                      ? 'border-forest bg-forest text-white'
                      : 'border-hairline-strong bg-surface-raised text-ink hover:border-forest/50',
                  )}
                >
                  All products ({listings.length})
                </Link>
              </li>
              {supplierCategories.map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/suppliers/${supplier.id}?category=${cat.slug}`}
                    className={cn(
                      'inline-flex h-8 items-center whitespace-nowrap rounded-full border px-3 text-[12px] font-medium transition-colors',
                      activeCategory?.id === cat.id
                        ? 'border-forest bg-forest text-white'
                        : 'border-hairline-strong bg-surface-raised text-ink hover:border-forest/50',
                    )}
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {/* Supplier's Respective Products Grid */}
        <section className="mt-4" aria-labelledby="supplier-products-heading">
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <h2 id="supplier-products-heading" className="font-display text-[16px] font-semibold text-ink">
              Products from {supplier.name}
            </h2>
            <span className="font-mono text-[11.5px] tabular-nums text-muted">
              {visibleProducts.length} {visibleProducts.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          {visibleProducts.length === 0 ? (
            <p className="rounded-md border border-hairline bg-surface-raised p-8 text-center text-[13.5px] text-muted">
              No products listed in this category yet.
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {visibleProducts.map((item) => {
                const isSupplierDirect = item.is_direct_supplier_product;
                return (
                  <li key={item.product_id}>
                    <Link
                      href={`/products/${item.product_id}`}
                      className="press-soft group flex h-full flex-col overflow-hidden rounded-lg border border-hairline bg-surface-raised p-2 transition-shadow hover:shadow-card sm:p-3"
                    >
                      <div className="relative aspect-square w-full overflow-hidden rounded-[6px] bg-[#f4f4f4]">
                        <Swatch
                          image={item.image}
                          fallback={item.swatch}
                          emoji={item.emoji}
                          label={item.product_name}
                          className="h-full w-full"
                          glyphClassName="text-[1.5rem] sm:text-[2rem] bottom-2 right-2.5"
                          zoomOnHover={false}
                        />
                        <span
                          className={cn(
                            'absolute left-1.5 top-1.5 z-10 rounded px-1.5 py-0.5 font-mono text-[9.5px] font-bold uppercase tracking-wider text-white',
                            isSupplierDirect ? 'bg-ocean/95' : 'bg-forest/95',
                          )}
                        >
                          {isSupplierDirect ? 'Supplier Direct' : 'AfriDeal Line'}
                        </span>
                        {!item.in_stock && (
                          <span className="absolute right-1.5 top-1.5 z-10 rounded bg-ink/80 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white">
                            Out of stock
                          </span>
                        )}
                      </div>

                      <div className="mt-2.5 flex flex-1 flex-col justify-between">
                        <div>
                          <h3 className="line-clamp-2 text-[12.5px] font-medium leading-snug text-ink transition-colors group-hover:text-forest sm:text-[13.5px]">
                            {item.product_name}
                          </h3>
                        </div>

                        <div className="mt-2 border-t border-hairline pt-2">
                          <div className="flex items-baseline justify-between gap-1">
                            <PriceTag
                              amount={item.price}
                              size="sm"
                              tone="ink"
                              className="text-[13px] sm:text-[15px]"
                            />
                            <span className="font-mono text-[10.5px] text-muted">
                              MOQ {item.moq}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[10.5px] text-muted">
                            Lead time: <span className="font-mono text-ink">{item.fulfilment_days}d</span>
                          </p>
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
