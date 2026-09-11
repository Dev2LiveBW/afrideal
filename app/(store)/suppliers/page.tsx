import type { Metadata } from 'next';
import Link from 'next/link';
import { BadgeCheck } from 'lucide-react';

import { SupplierDirectory } from '@/components/storefront/SupplierDirectory';
import { readAll } from '@/lib/db';
import { getDirectoryListings } from '@/lib/directory';
import { DIRECTORY_LABEL } from '@/lib/directory-placement';
import { cn } from '@/lib/utils';

/**
 * The supplier / product directory. (TICKET-007)
 *
 * Header drawn to the Alibaba benchmark §1: a compact title bar and a row of
 * filter chips, then the rows. The prose introduction it used to open with
 * put the first listing 450px down a phone screen - two and a bit rows
 * visible where the benchmark shows four and a half. The chips do the
 * introducing now; a buyer who wants the terms reads /how-it-works.
 *
 * TODO(TICKET-007): placement is unresolved. This page is the durable home
 * for the grid; whether it is *also* a homepage section and a nav tab is
 * decided by the flags in `lib/directory-placement.ts`.
 */

export const dynamic = 'force-dynamic';

/* The root layout's title template appends "· AfriDeal" - don't repeat it. */
export const metadata: Metadata = {
  title: DIRECTORY_LABEL,
  description:
    'Products from verified AfriDeal suppliers, with published prices and minimum order quantities.',
};

export default async function SupplierDirectoryPage({
  searchParams,
}: {
  searchParams: { category?: string };
}) {
  const [all, categories] = await Promise.all([getDirectoryListings(), readAll('categories')]);

  const activeCategory = categories.find(
    (category) => category.slug === searchParams.category || category.id === searchParams.category,
  );
  const listings = activeCategory
    ? all.filter((listing) => listing.category_id === activeCategory.id)
    : all;

  const companies = new Set(listings.map((listing) => listing.supplier_id)).size;

  return (
    <div className="mx-auto max-w-market pb-24">
      {/* ── Title bar ─────────────────────────────────────────────────── */}
      <header className="flex items-baseline justify-between gap-3 px-4 pb-1 pt-4">
        <h1 className="truncate font-display text-[18px] font-bold text-ink">
          Verified suppliers
        </h1>
        <p className="shrink-0 font-mono text-[11.5px] tabular-nums text-muted">
          {listings.length} listings · {companies} companies
        </p>
      </header>

      {/* ── Filter chips - one row, scrolls sideways, never wraps ───────── */}
      <nav aria-label="Filter by trade" className="no-scrollbar overflow-x-auto px-4 pb-3 pt-2">
        <ul className="flex w-max gap-2">
          <li>
            <Chip href="/suppliers" active={!activeCategory}>
              All
            </Chip>
          </li>
          <li>
            <span className="inline-flex h-8 items-center gap-1 rounded-full border border-ocean/30 bg-ocean-wash px-3 text-[12px] font-medium text-ocean-ink">
              <BadgeCheck size={13} strokeWidth={2.25} aria-hidden="true" />
              Verified only
            </span>
          </li>
          {categories.map((category) => (
            <li key={category.id}>
              <Chip
                href={`/suppliers?category=${category.slug}`}
                active={activeCategory?.id === category.id}
              >
                {category.name}
              </Chip>
            </li>
          ))}
        </ul>
      </nav>

      <div className="px-4">
        <SupplierDirectory listings={listings} />
      </div>
    </div>
  );
}

/**
 * A filter chip. The "Verified only" one above is not a Chip because it is not
 * a filter - the directory only ever lists verified suppliers, and the chip
 * says so the way the benchmark's does, as a standing condition.
 */
function Chip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'inline-flex h-8 items-center whitespace-nowrap rounded-full border px-3 text-[12px] font-medium transition-colors',
        active
          ? 'border-[#E67E22] bg-[#E67E22] text-white'
          : 'border-hairline-strong bg-surface-raised text-ink hover:border-[#E67E22]/50',
      )}
    >
      {children}
    </Link>
  );
}
