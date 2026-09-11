import Link from 'next/link';
import { ArrowRight, BadgeCheck, CheckCircle2 } from 'lucide-react';

import { PriceTag } from '@/components/brand/MoneyText';
import { Swatch } from '@/components/storefront/Swatch';
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
    <ul className={cn('grid grid-cols-1 gap-x-6 lg:grid-cols-2', className)}>
      {listings.map((listing) => (
        <li key={listing.id} className="border-b border-hairline last:border-b-0 lg:[&:nth-last-child(2)]:border-b-0">
          <Link
            href={`/products/${listing.product_id}`}
            className="group flex gap-2.5 py-2.5 outline-none sm:gap-3 sm:py-3"
          >
            {/* Square, a third of the row, radius on the image not the row */}
            <div className="relative w-[31%] max-w-[132px] shrink-0">
              <Swatch
                image={listing.image}
                fallback={listing.swatch}
                emoji={listing.emoji}
                label={listing.product_name}
                className="aspect-square rounded-md"
                glyphClassName="text-[28px] bottom-1.5 right-2"
                zoomOnHover={false}
              />
              {!listing.in_stock && (
                <span className="absolute left-1.5 top-1.5 rounded bg-ink/75 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-white">
                  Out of stock
                </span>
              )}
            </div>

            <div className="flex min-w-0 flex-1 flex-col justify-center">
              <h3 className="truncate text-[13.5px] font-medium text-ink transition-colors group-hover:text-forest sm:text-[14px]">
                {listing.product_name}
              </h3>

              <div className="mt-0.5">
                <PriceTag amount={listing.price} size="md" tone="ink" />
              </div>

              <p className="mt-0.5 text-[12px] text-body">
                Min. order: <span className="font-mono tabular-nums text-ink">{listing.moq}</span> units
              </p>

              {/* The trust line. Verified is the word a buyer looks for first. */}
              <p className="mt-1 flex min-w-0 items-center gap-1 text-[12px] text-body">
                {listing.verified && (
                  <span className="inline-flex shrink-0 items-center gap-0.5 font-semibold text-ocean">
                    <BadgeCheck size={13} strokeWidth={2.25} aria-hidden="true" />
                    Verified
                  </span>
                )}
                <span className="truncate">
                  {listing.supplier_name} · {listing.city}
                </span>
              </p>

              {/* The performance line. Alibaba shows reorder rate; we hold fulfilment. */}
              <p className="mt-0.5 flex items-center gap-1 text-[12px] text-body">
                <CheckCircle2 size={12} strokeWidth={2} className="shrink-0 text-forest" aria-hidden="true" />
                <span className="font-mono tabular-nums">{listing.fulfilment_rate}%</span> fulfilment
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
 * The directory as a homepage section: heading, the first few rows, and a
 * route through to the full page.
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
    <section className={cn('mx-auto max-w-market px-4', className)} aria-labelledby="supplier-directory">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 id="supplier-directory" className="font-display text-headline-md font-semibold text-ink">
            Source from verified suppliers
          </h2>
          <p className="mt-1 text-[13px] leading-5 text-body">
            Published prices and minimum order quantities, from companies AfriDeal has verified.
          </p>
        </div>

        <Link
          href={href}
          className="inline-flex shrink-0 items-center gap-1.5 text-[13px] font-medium text-forest transition-colors hover:text-ink"
        >
          Browse the directory
          <ArrowRight size={14} strokeWidth={1.75} aria-hidden="true" />
        </Link>
      </div>

      <SupplierDirectory listings={listings} />
    </section>
  );
}
