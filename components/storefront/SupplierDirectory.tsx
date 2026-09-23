import Link from 'next/link';
import { BadgeCheck, CheckCircle2 } from 'lucide-react';

import { PriceTag } from '@/components/brand/MoneyText';
import { Floor } from '@/components/storefront/home/Floor';
import { Swatch } from '@/components/storefront/Swatch';
import { pulaTag } from '@/lib/format';
import { humanise } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { DirectoryListing } from '@/lib/directory';

/**
 * The supplier / product directory. (TICKET-007)
 *
 * Drawn to the Alibaba benchmark - see docs/design/alibaba-benchmark.md §1.
 *
 * Rows, not cards. The previous version was a vertical card with a full-width
 * 4:3 photograph, which put about one listing on a phone screen; the product
 * owner's note was "see how small their boxes are, and this is on a phone."
 * Alibaba's search results are full-width rows with a square image on the
 * left taking about a third of the width, and the trade fields stacked beside
 * it - roughly four and a half to a screen. This does the same.
 *
 * One row is one product-supplier pairing. The same product from two
 * companies is two rows, because the MOQ and the lead time differ and that is
 * the comparison the page exists to support.
 *
 * The fields, top to bottom, follow the benchmark's order: name, price,
 * minimum order, the trust line, the performance line. Verified and the
 * company name are the two that must survive at any density - they are what
 * a trade buyer scans for.
 */

export function SupplierDirectory({
  listings,
  className,
}: {
  listings: DirectoryListing[];
  className?: string;
}) {
  if (listings.length === 0) {
    return (
      <p className={cn('rounded-md border border-hairline bg-surface-raised p-8 text-center text-[14px] text-muted', className)}>
        No supplier listings to show yet.
      </p>
    );
  }

  return (
    /*
     * Two columns of rows from `lg`, one below. A row is wide enough that
     * four across on a desktop would starve the title; two keeps the row's
     * shape and doubles the density the benchmark asks for.
     */
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
                glyphClassName="text-[22px] sm:text-[28px] bottom-1.5 right-2"
                zoomOnHover={false}
              />
              {!listing.in_stock && (
                <span className="absolute left-1.5 top-1.5 rounded bg-ink/75 px-1 py-0.5 font-mono text-[8px] sm:text-[9px] uppercase tracking-[0.12em] text-white">
                  Out of stock
                </span>
              )}
            </div>

            <div className="flex min-w-0 flex-1 flex-col justify-center">
              <h3 className="truncate text-[11.5px] font-medium text-ink transition-colors group-hover:text-forest sm:text-[14px]">
                {listing.product_name}
              </h3>

              <div className="mt-0.5">
                <PriceTag amount={listing.price} size="sm" tone="ink" className="text-[12px] sm:text-[14px]" />
              </div>

              <p className="mt-0.5 text-[10px] text-body truncate sm:text-[12px]">
                Min. order: <span className="font-mono tabular-nums text-ink">{listing.moq}</span> units
              </p>

              {/* The trust line */}
              <p className="mt-0.5 flex min-w-0 items-center gap-1 text-[10px] text-body sm:mt-1 sm:text-[12px]">
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
              <p className="mt-0.5 flex items-center gap-1 text-[9.5px] text-body sm:text-[12px]">
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
 * The directory as a floor on the home page: multiple items per row (2 on mobile, 4 on desktop).
 */
export function SupplierDirectorySection({
  listings,
  href,
  className,
}: {
  listings: DirectoryListing[];
  href: string;
  className?: string;
}) {
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
                  glyphClassName="text-[14px] sm:text-[28px] bottom-1.5 right-2"
                  zoomOnHover={false}
                />
                {listing.verified && (
                  <span className="absolute bottom-0.5 left-0.5 z-10 rounded-[3px] bg-ocean/90 px-0.5 py-0 font-mono text-[5.5px] font-bold text-white sm:px-1 sm:py-0.5 sm:text-[9.5px]">
                    Verified
                  </span>
                )}
              </div>
              <div className="mt-1.5 px-0.5">
                <div className="flex flex-wrap items-baseline gap-1">
                  <span className="font-mono text-[8px] font-bold tabular-nums text-ink sm:text-[14px]">
                    {pulaTag(listing.price)}
                  </span>
                  <span className="text-[6px] text-[#666] sm:text-[11px]">
                    MOQ <span className="font-mono tabular-nums">{listing.moq}</span>
                  </span>
                </div>
                <div className="mt-0.5 truncate text-[7px] font-medium text-[#222] transition-colors group-hover:text-forest sm:text-[12px]">
                  {listing.product_name}
                </div>
                <div className="truncate text-[6px] text-[#666] sm:text-[11px]">
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
