'use client';

import { BadgeCheck, MapPin, Star } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { Supplier } from '@/types';

/**
 * Supplier discovery.
 *
 * `CategoryTiles` used to live here and rendered a second "Popular Categories"
 * heading on the landing page, under the compact icon grid that already
 * carried one. It was removed for TICKET-001; the single canonical block is
 * `components/storefront/PopularCategories.tsx`.
 */

export function SupplierRail({
  suppliers,
  city = 'Gaborone',
}: {
  suppliers: Supplier[];
  city?: string;
}) {
  if (suppliers.length === 0) return null;

  // Local suppliers first; the rest still appear, just further along the rail.
  const ordered = [...suppliers].sort((a, b) => {
    const localA = a.city === city ? 0 : 1;
    const localB = b.city === city ? 0 : 1;
    return localA - localB || b.reliability_score - a.reliability_score;
  });

  return (
    <section>
      <div className="mb-5 flex items-center gap-2.5">
        <MapPin size={17} strokeWidth={1.5} className="text-muted" />
        <h2 className="font-display text-headline-md font-semibold text-ink">
          Suppliers near {city}
        </h2>
      </div>

      <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
        {ordered.map((supplier) => (
          <div
            key={supplier.id}
            className="flex w-[268px] shrink-0 items-center gap-3 rounded-md border border-hairline bg-surface-raised p-3.5"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-forest-wash font-mono text-[13px] font-semibold text-forest">
              {supplier.initials}
            </span>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-medium text-ink">{supplier.name}</p>

              <p className="mt-0.5 flex items-center gap-1 text-[11.5px] text-muted">
                <Star size={11} strokeWidth={1.5} className="fill-gold text-gold" />
                <span className="font-mono tabular-nums">{supplier.rating.toFixed(1)}</span>
                <span>({supplier.orders_count} orders)</span>
              </p>

              <span
                className={cn(
                  'mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5',
                  'bg-forest-wash text-[10px] font-medium text-forest-ink',
                )}
              >
                <BadgeCheck size={10} strokeWidth={2} />
                {supplier.city === city ? 'VERIFIED · LOCAL' : 'VERIFIED SELLER'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
