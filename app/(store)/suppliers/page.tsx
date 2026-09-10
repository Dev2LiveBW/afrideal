import type { Metadata } from 'next';

import { SupplierDirectory } from '@/components/storefront/SupplierDirectory';
import { getDirectoryListings } from '@/lib/directory';
import { DIRECTORY_LABEL } from '@/lib/directory-placement';

/**
 * The supplier / product directory. (TICKET-007)
 *
 * TODO(TICKET-007): placement is unresolved. This page is the durable home for
 * the grid; whether it is *also* a homepage section and a nav tab is decided by
 * the flags in `lib/directory-placement.ts`, pending the product owner's call.
 */

export const dynamic = 'force-dynamic';

/* The root layout's title template appends "· AfriDeal" - don't repeat it. */
export const metadata: Metadata = {
  title: DIRECTORY_LABEL,
  description:
    'Products from verified AfriDeal suppliers, with published prices and minimum order quantities.',
};

export default async function SupplierDirectoryPage() {
  const listings = await getDirectoryListings();

  const companies = new Set(listings.map((listing) => listing.supplier_id)).size;

  return (
    <div className="mx-auto max-w-market px-4 pb-24 pt-10">
      <header className="mb-8">
        <h1 className="font-display text-headline-lg font-semibold leading-tight text-ink">
          Source from verified suppliers
        </h1>
        <p className="measure mt-3 text-[14.5px] leading-7 text-body">
          Every listing below is a product AfriDeal can route to a supplier it has verified. The
          price is the published customer price and the MOQ is that supplier&apos;s own minimum —
          both are what you would be held to at checkout, not an indication.
        </p>
        <p className="mt-4 font-mono text-[12.5px] tabular-nums text-muted">
          {listings.length} listings · {companies} companies
        </p>
      </header>

      <SupplierDirectory listings={listings} />
    </div>
  );
}
