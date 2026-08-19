'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, BadgeCheck, MapPin, Star } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { Category, Product, Supplier } from '@/types';

/**
 * Category and supplier discovery.
 *
 * Both are image-led in the reference design. With no photography, each tile
 * uses the category's own colour field with the glyph set large and low
 * contrast, which reads as a deliberate treatment rather than a missing asset.
 */

/** Colour field behind a category tile if its photograph is missing. */
const CATEGORY_FIELDS: Record<string, [string, string]> = {
  c1: ['#D4920A', '#8B5E0A'],
  c2: ['#2a2a2a', '#111111'],
  c3: ['#8A918B', '#5A615C'],
  c4: ['#1A5C2A', '#0F3A1B'],
  c5: ['#ECEBE7', '#8A918B'],
  c6: ['#2E7D3F', '#1A5C2A'],
};

export function CategoryTiles({
  categories,
  products,
}: {
  categories: Category[];
  products: Product[];
}) {
  return (
    <section>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-headline-md font-semibold text-ink">Shop by category</h2>
          <p className="mt-1 text-[13.5px] text-body">
            Six trades, one settlement layer and one escrow account behind all of them
          </p>
        </div>
        <Link
          href="/browse"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-gold-dark transition-colors hover:text-ink"
        >
          View all
          <ArrowRight size={14} strokeWidth={1.75} />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {categories.map((category, index) => {
          const [from, to] = CATEGORY_FIELDS[category.id] ?? ['#2a2a2a', '#111111'];
          const count = products.filter((product) => product.category_id === category.id).length;

          return (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              /* 45ms apart: enough to read as a sweep across the row, short
                 enough that the last tile is not still arriving. */
              transition={{ delay: index * 0.045, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
            <Link
              href={`/browse?category=${category.id}`}
              className="group block overflow-hidden rounded-md border border-hairline bg-surface-raised transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-gold/30 hover:shadow-lift"
            >
              <div
                className="relative aspect-[4/3] overflow-hidden"
                style={{ background: `linear-gradient(140deg, ${from} 0%, ${to} 100%)` }}
              >
                {/*
                  Photograph when `npm run images` has fetched one, colour field
                  underneath either way so a missing file degrades to something
                  deliberate rather than a white hole in the grid.
                */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/products/${category.id}.jpg`}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-2 right-2.5 text-[22px] leading-none opacity-60 drop-shadow"
                >
                  {category.emoji}
                </span>
              </div>

              <div className="px-3 py-2.5">
                <p className="truncate text-[13px] font-medium text-ink">{category.name}</p>
                <p className="font-mono text-[10.5px] tabular-nums text-muted">
                  {count} {count === 1 ? 'listing' : 'listings'}
                </p>
              </div>
            </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

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
