import Link from 'next/link';
import { ArrowRight, BadgeCheck, MapPin, Package, Star } from 'lucide-react';

import { MoneyText } from '@/components/brand/MoneyText';
import { Swatch } from '@/components/storefront/Swatch';
import { humanise } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { DirectoryListing } from '@/lib/directory';

/**
 * The supplier / product directory grid. (TICKET-007)
 *
 * An Alibaba-style listing card: the product photograph, the published price,
 * the minimum order quantity, the verified badge and the company behind it.
 * MOQ and the company name are the two fields a trade buyer scans for and
 * neither appears on the retail `ProductCard`, which is why this is its own
 * card rather than a variant of that one.
 *
 * One card is one product-supplier pairing. The same product from two
 * companies is two cards, because the MOQ and the lead time differ and that is
 * the comparison the page exists to support.
 *
 * Structure and tokens are the storefront's own - `shadow-card` / `shadow-lift`
 * on a hairline border, `MoneyText` for every figure, `Swatch` for the image
 * slot with its gradient fallback - so the grid sits beside the catalogue
 * rather than beside it looking imported.
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
    <ul className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4', className)}>
      {listings.map((listing) => (
        <li key={listing.id}>
          <Link
            href={`/products/${listing.product_id}`}
            className="group flex h-full flex-col overflow-hidden rounded-md border border-hairline bg-surface-raised shadow-card transition-shadow duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-lift"
          >
            <div className="relative">
              <Swatch
                image={listing.image}
                fallback={listing.swatch}
                emoji={listing.emoji}
                label={listing.product_name}
                className="aspect-[4/3]"
                glyphClassName="text-[48px] bottom-3 right-4"
              />

              {!listing.in_stock && (
                <span className="absolute left-3 top-3 rounded-full bg-ink/70 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-white backdrop-blur-sm">
                  Out of stock
                </span>
              )}
            </div>

            <div className="flex flex-1 flex-col p-4">
              <h3 className="line-clamp-2 text-[14px] font-medium leading-5 text-ink transition-colors group-hover:text-forest">
                {listing.product_name}
              </h3>

              <div className="mt-3">
                <p className="text-[10.5px] text-muted">From</p>
                <MoneyText amount={listing.price} size="md" tone="ink" />
              </div>

              {/*
                MOQ next to the price rather than in the metadata row: at trade
                quantities the two figures are one fact, and a buyer who reads
                the price without the minimum has read half of it.
              */}
              <p className="mt-1.5 inline-flex w-fit items-center gap-1.5 rounded-full bg-surface-sunk px-2.5 py-1 text-[11.5px] text-body">
                <Package size={12} strokeWidth={1.6} aria-hidden="true" />
                MOQ <span className="font-mono tabular-nums text-ink">{listing.moq}</span> units
              </p>

              {/* ── The company ─────────────────────────────────────── */}
              <div className="mt-4 border-t border-hairline pt-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-forest-wash font-mono text-[11px] font-semibold text-forest">
                    {listing.supplier_initials}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-medium text-ink">
                      {listing.supplier_name}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted">
                      <MapPin size={10} strokeWidth={1.6} aria-hidden="true" />
                      <span className="truncate">
                        {listing.city}, {listing.country}
                      </span>
                      <span aria-hidden="true">·</span>
                      <Star size={10} strokeWidth={1.5} className="shrink-0 fill-gold text-gold" />
                      <span className="font-mono tabular-nums">{listing.rating.toFixed(1)}</span>
                    </p>
                  </div>
                </div>

                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  {listing.verified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-forest-wash px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-forest-ink">
                      <BadgeCheck size={11} strokeWidth={2} aria-hidden="true" />
                      Verified supplier
                    </span>
                  )}
                  <span className="rounded-full bg-surface-sunk px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-body">
                    {humanise(listing.supplier_type)}
                  </span>
                </div>
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * The directory as a homepage section: heading, the first few cards, and a
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
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
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
