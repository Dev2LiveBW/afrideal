import Link from 'next/link';
import { ArrowRight, BadgeCheck, CheckCircle2, MapPin, ShieldCheck, Star } from 'lucide-react';

import { PriceTag } from '@/components/brand/MoneyText';
import { Floor, Rail, RailCard } from '@/components/storefront/home/Floor';
import { Swatch } from '@/components/storefront/Swatch';
import { humanise, pulaTag } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { DirectoryListing, SupplierWithProducts } from '@/lib/directory';
import type { Product, ProductImage } from '@/types';

const COUNTRY_NAME: Record<'BW' | 'ZA', string> = {
  BW: 'Botswana',
  ZA: 'South Africa',
};

/**
 * Prominent AfriDeal Direct floor on the home page: showcases AfriDeal's own
 * catalogue products on the benchmark's 136px RailCard floor before the
 * supplier directory.
 */
export function AfriDealDirectSection({
  products,
  href = '/browse',
  className,
}: {
  products: Array<Product & { image?: ProductImage; categoryName?: string }>;
  href?: string;
  className?: string;
}) {
  if (products.length === 0) return null;

  return (
    <Floor
      id="afrideal-direct"
      title="AfriDeal Direct products"
      subtitle="In-house AfriDeal stock with 4-tier retail, bulk & wholesale pricing"
      href={href}
      icon={ShieldCheck}
      iconClassName="text-forest"
      className={className}
    >
      <Rail>
        {products.map((product) => (
          <RailCard
            key={product.id}
            href={`/products/${product.id}`}
            image={
              <Swatch
                image={product.image}
                fallback={product.swatch}
                emoji={product.emoji}
                label={product.name}
                className="h-full w-full"
                glyphClassName="text-[1.5rem] bottom-1.5 right-2"
                zoomOnHover={false}
              />
            }
            overlay={
              <span className="absolute left-1.5 top-1.5 z-10 rounded-[3px] bg-forest/95 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-white">
                AfriDeal
              </span>
            }
            tag="Tiered pricing"
            primary={pulaTag(product.price)}
            secondary={product.name}
          />
        ))}
      </Rail>
    </Floor>
  );
}

/**
 * The supplier / product directory. (TICKET-007)
 *
 * Groups verified suppliers with their own respective products and links to
 * each supplier's dedicated storefront (`/suppliers/[id]`), while preserving
 * a flat listing fallback when `listings` is passed directly.
 */

export function SupplierDirectory({
  listings = [],
  suppliers,
  className,
}: {
  listings?: DirectoryListing[];
  suppliers?: SupplierWithProducts[];
  className?: string;
}) {
  if (suppliers && suppliers.length > 0) {
    return (
      <div className={cn('space-y-4 sm:space-y-5', className)}>
        {suppliers.map(({ supplier, listings: supplierListings }) => {
          const isVerified = supplier.status === 'VERIFIED';
          return (
            <section
              key={supplier.id}
              aria-label={supplier.name}
              className="rounded-lg border border-hairline bg-surface-raised p-3 sm:p-4"
            >
              {/* Supplier Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline pb-2.5 sm:pb-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    aria-hidden="true"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-forest text-[12px] font-bold tracking-wide text-white sm:h-10 sm:w-10 sm:text-[13px]"
                  >
                    {supplier.initials}
                  </span>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Link
                        href={`/suppliers/${supplier.id}`}
                        className="truncate font-display text-[14px] font-bold text-ink transition-colors hover:text-forest sm:text-[15.5px]"
                      >
                        {supplier.name}
                      </Link>
                      {isVerified && (
                        <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-ocean-wash px-2 py-0.5 text-[10px] font-semibold text-ocean-ink">
                          <BadgeCheck size={11} strokeWidth={2.25} className="text-ocean" aria-hidden="true" />
                          Verified
                        </span>
                      )}
                    </div>

                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-body sm:text-[12px]">
                      <span className="inline-flex items-center gap-0.5">
                        <MapPin size={10} strokeWidth={1.75} className="text-muted" aria-hidden="true" />
                        {supplier.city}, {COUNTRY_NAME[supplier.country]}
                      </span>
                      <span className="text-muted">·</span>
                      <span>{humanise(supplier.supplier_type ?? 'WHOLESALER')}</span>
                      <span className="text-muted">·</span>
                      <span className="inline-flex items-center gap-0.5 font-mono tabular-nums text-ink">
                        <Star size={10} className="fill-gold text-gold" aria-hidden="true" />
                        {supplier.rating.toFixed(1)}
                      </span>
                      <span className="text-muted">·</span>
                      <span className="inline-flex items-center gap-0.5 font-mono tabular-nums text-forest">
                        <CheckCircle2 size={10} strokeWidth={2} aria-hidden="true" />
                        {supplier.fulfilment_rate}% fulfilment
                      </span>
                    </p>
                  </div>
                </div>

                <Link
                  href={`/suppliers/${supplier.id}`}
                  className="press-soft inline-flex shrink-0 items-center gap-1 rounded-full border border-hairline-strong bg-canvas px-3 py-1.5 text-[11.5px] font-medium text-ink transition-colors hover:border-forest hover:text-forest"
                >
                  Visit store ({supplierListings.length})
                  <ArrowRight size={12} strokeWidth={1.75} aria-hidden="true" />
                </Link>
              </div>

              {/* Supplier's Respective Products */}
              <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
                {supplierListings.map((item) => {
                  const isSupplierDirect = item.is_direct_supplier_product;
                  return (
                    <li key={item.product_id}>
                      <Link
                        href={`/products/${item.product_id}`}
                        className="press-soft group flex h-full flex-col rounded-md border border-hairline bg-canvas p-2 outline-none transition-shadow hover:bg-surface-raised hover:shadow-card"
                      >
                        <div className="relative aspect-square w-full overflow-hidden rounded-[5px] bg-[#f4f4f4]">
                          <Swatch
                            image={item.image}
                            fallback={item.swatch}
                            emoji={item.emoji}
                            label={item.product_name}
                            className="h-full w-full"
                            glyphClassName="text-[1.25rem] sm:text-[1.625rem] bottom-1.5 right-2"
                            zoomOnHover={false}
                          />
                          <span
                            className={cn(
                              'absolute left-1.5 top-1.5 z-10 rounded px-1.5 py-0.5 font-mono text-[8.5px] font-bold uppercase tracking-wider text-white',
                              isSupplierDirect ? 'bg-ocean/95' : 'bg-forest/95',
                            )}
                          >
                            {isSupplierDirect ? 'Supplier Product' : 'AfriDeal Line'}
                          </span>
                          {!item.in_stock && (
                            <span className="absolute right-1.5 top-1.5 rounded bg-ink/75 px-1 py-0.5 font-mono text-[8px] uppercase tracking-wider text-white">
                              Out of stock
                            </span>
                          )}
                        </div>

                        <div className="mt-2 flex flex-1 flex-col justify-between">
                          <h3 className="line-clamp-2 text-[11.5px] font-medium leading-snug text-ink transition-colors group-hover:text-forest sm:text-[12.5px]">
                            {item.product_name}
                          </h3>

                          <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-1 border-t border-hairline pt-1.5">
                            <PriceTag
                              amount={item.price}
                              size="sm"
                              tone="ink"
                              className="text-[12px] sm:text-[13.5px]"
                            />
                            <span className="font-mono text-[10px] tabular-nums text-muted">
                              MOQ {item.moq}
                            </span>
                          </div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <p className={cn('rounded-md border border-hairline bg-surface-raised p-8 text-center text-[0.875rem] text-muted', className)}>
        No supplier listings to show yet.
      </p>
    );
  }

  return (
    <ul className={cn('grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-2', className)}>
      {listings.map((listing) => (
        <li key={listing.id} className="border-b border-hairline pb-2 sm:pb-3 last:border-b-0 lg:[&:nth-last-child(2)]:border-b-0">
          <Link
            href={`/products/${listing.product_id}`}
            className="group flex flex-col sm:flex-row gap-2 py-1 outline-none sm:gap-3 sm:py-3"
          >
            {/* Square, full-width on mobile card, third on desktop */}
            <div className="relative w-full sm:w-[31%] sm:max-w-[132px] shrink-0">
              <Swatch
                image={listing.image}
                fallback={listing.swatch}
                emoji={listing.emoji}
                label={listing.product_name}
                className="aspect-square rounded-md"
                glyphClassName="text-[1.375rem] sm:text-[1.75rem] bottom-1.5 right-2"
                zoomOnHover={false}
              />
              {!listing.in_stock && (
                <span className="absolute left-1.5 top-1.5 rounded bg-ink/75 px-1 py-0.5 font-mono text-[0.5rem] sm:text-[0.5625rem] uppercase tracking-[0.12em] text-white">
                  Out of stock
                </span>
              )}
            </div>

            <div className="flex min-w-0 flex-1 flex-col justify-center">
              <h3 className="truncate text-[0.71875rem] font-medium text-ink transition-colors group-hover:text-forest sm:text-[0.875rem]">
                {listing.product_name}
              </h3>

              <div className="mt-0.5">
                <PriceTag amount={listing.price} size="sm" tone="ink" className="text-[0.75rem] sm:text-[0.875rem]" />
              </div>

              <p className="mt-0.5 text-[0.625rem] text-body truncate sm:text-[0.75rem]">
                Min. order: <span className="font-mono tabular-nums text-ink">{listing.moq}</span> units
              </p>

              {/* The trust line */}
              <p className="mt-0.5 flex min-w-0 items-center gap-1 text-[0.625rem] text-body sm:mt-1 sm:text-[0.75rem]">
                {listing.verified && (
                  <span className="inline-flex shrink-0 items-center gap-0.5 font-semibold text-ocean">
                    <BadgeCheck size={11} strokeWidth={2.25} aria-hidden="true" className="sm:hidden" />
                    <BadgeCheck size={13} strokeWidth={2.25} aria-hidden="true" className="hidden sm:block" />
                    Verified
                  </span>
                )}
                <span className="truncate">
                  {listing.supplier_name}
                </span>
              </p>

              {/* The performance line */}
              <p className="mt-0.5 flex items-center gap-1 text-[0.59375rem] text-body sm:text-[0.75rem]">
                <CheckCircle2 size={10} strokeWidth={2} className="shrink-0 text-forest sm:hidden" aria-hidden="true" />
                <CheckCircle2 size={12} strokeWidth={2} className="shrink-0 text-forest hidden sm:block" aria-hidden="true" />
                <span className="font-mono tabular-nums">{listing.fulfilment_rate}%</span>
                <span className="text-muted">·</span>
                <span className="truncate">{humanise(listing.supplier_type)}</span>
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * The directory as a floor on the home page: verified suppliers grouped with
 * their own respective products.
 */
export function SupplierDirectorySection({
  listings = [],
  suppliers,
  href,
  className,
}: {
  listings?: DirectoryListing[];
  suppliers?: SupplierWithProducts[];
  href: string;
  className?: string;
}) {
  if (suppliers && suppliers.length > 0) {
    return (
      <Floor
        id="supplier-directory"
        title="Verified suppliers & their products"
        subtitle="Browse verified suppliers and their own respective products and minimum orders"
        href={href}
        icon={BadgeCheck}
        iconClassName="text-ocean"
        className={className}
      >
        <div className="grid grid-cols-1 gap-2.5 px-3 pb-3 pt-2 sm:grid-cols-2 sm:gap-3 sm:px-4">
          {suppliers.map(({ supplier, listings: supplierListings }) => (
            <div
              key={supplier.id}
              className="flex flex-col justify-between rounded-lg border border-hairline bg-surface-raised p-2.5 sm:p-3"
            >
              {/* Supplier Store Header */}
              <div className="flex items-center justify-between gap-2 pb-2">
                <Link
                  href={`/suppliers/${supplier.id}`}
                  className="group flex min-w-0 items-center gap-2 outline-none"
                >
                  <span
                    aria-hidden="true"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-forest text-[11px] font-bold tracking-wide text-white"
                  >
                    {supplier.initials}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="truncate text-[12.5px] font-bold text-ink transition-colors group-hover:text-forest sm:text-[13.5px]">
                        {supplier.name}
                      </span>
                      <BadgeCheck
                        size={13}
                        strokeWidth={2.25}
                        className="shrink-0 text-ocean"
                        aria-label="Verified"
                      />
                    </div>
                    <p className="truncate text-[10.5px] text-muted sm:text-[11px]">
                      {supplier.city} · {humanise(supplier.supplier_type ?? 'WHOLESALER')} · {supplier.fulfilment_rate}% fulfilment
                    </p>
                  </div>
                </Link>

                <Link
                  href={`/suppliers/${supplier.id}`}
                  className="press-soft shrink-0 rounded-full border border-hairline-strong bg-canvas px-2.5 py-1 text-[10.5px] font-semibold text-ink transition-colors hover:border-forest hover:text-forest"
                >
                  Store ({supplierListings.length}) →
                </Link>
              </div>

              {/* Supplier's Respective Products Rail */}
              <ul className="grid grid-cols-3 gap-1.5 pt-1 sm:gap-2">
                {supplierListings.slice(0, 3).map((item) => (
                  <li key={item.product_id}>
                    <Link
                      href={`/products/${item.product_id}`}
                      className="press-soft group block h-full rounded-md border border-hairline bg-canvas p-1.5 outline-none transition-shadow hover:bg-surface-raised hover:shadow-card"
                    >
                      <div className="relative aspect-square w-full overflow-hidden rounded-[4px] bg-[#f4f4f4]">
                        <Swatch
                          image={item.image}
                          fallback={item.swatch}
                          emoji={item.emoji}
                          label={item.product_name}
                          className="h-full w-full"
                          glyphClassName="text-[1rem] sm:text-[1.35rem] bottom-1 right-1.5"
                          zoomOnHover={false}
                        />
                        {item.is_direct_supplier_product && (
                          <span className="absolute bottom-0.5 left-0.5 z-10 rounded-[2px] bg-ocean/90 px-1 py-0 font-mono text-[8px] font-bold text-white">
                            MOQ {item.moq}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 px-0.5">
                        <div className="font-mono text-[11px] font-bold tabular-nums text-ink sm:text-[12px]">
                          {pulaTag(item.price)}
                        </div>
                        <div className="truncate text-[10px] font-medium text-[#222] transition-colors group-hover:text-forest sm:text-[11px]">
                          {item.product_name}
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Floor>
    );
  }

  if (listings.length === 0) return null;

  return (
    <Floor
      id="supplier-directory"
      title="Verified suppliers"
      subtitle="Published prices and minimum orders from companies we have checked"
      href={href}
      icon={BadgeCheck}
      iconClassName="text-ocean"
      className={className}
    >
      <ul className="grid grid-cols-4 gap-1 px-3 pb-3 pt-2 sm:gap-3 sm:px-4">
        {listings.map((listing) => (
          <li key={listing.id} className="w-full">
            <Link
              href={`/products/${listing.product_id}`}
              className="press-soft group block h-full rounded-lg border border-hairline bg-surface-raised p-1 outline-none transition-shadow hover:shadow-card sm:p-2"
            >
              <div className="relative aspect-square w-full overflow-hidden rounded-[6px] bg-[#f4f4f4]">
                <Swatch
                  image={listing.image}
                  fallback={listing.swatch}
                  emoji={listing.emoji}
                  label={listing.product_name}
                  className="h-full w-full"
                  glyphClassName="text-[0.875rem] sm:text-[1.75rem] bottom-1.5 right-2"
                  zoomOnHover={false}
                />
                {listing.verified && (
                  <span className="absolute bottom-0.5 left-0.5 z-10 rounded-[3px] bg-ocean/90 px-0.5 py-0 font-mono text-[0.34375rem] font-bold text-white sm:px-1 sm:py-0.5 sm:text-[0.59375rem]">
                    Verified
                  </span>
                )}
              </div>
              <div className="mt-1.5 px-0.5">
                <div className="flex flex-wrap items-baseline gap-1">
                  <span className="font-mono text-[0.5rem] font-bold tabular-nums text-ink sm:text-[0.875rem]">
                    {pulaTag(listing.price)}
                  </span>
                  <span className="text-[0.375rem] text-[#666] sm:text-[0.6875rem]">
                    MOQ <span className="font-mono tabular-nums">{listing.moq}</span>
                  </span>
                </div>
                <div className="mt-0.5 truncate text-[0.4375rem] font-medium text-[#222] transition-colors group-hover:text-forest sm:text-[0.75rem]">
                  {listing.product_name}
                </div>
                <div className="truncate text-[0.375rem] text-[#666] sm:text-[0.6875rem]">
                  {listing.supplier_name} · {listing.city}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </Floor>
  );
}

