'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, BadgeCheck, MapPin, Star } from 'lucide-react';

import { CategoryIcon } from '@/components/storefront/CategoryIcon';
import { categoryPalette } from '@/lib/category-palette';
import { cn } from '@/lib/utils';
import type { Category, Product, Supplier } from '@/types';

/**
 * Category and supplier discovery.
 *
 * The tiles used to hold a hand-kept table of gradient pairs that had drifted
 * out of sync with the catalogue: it covered c1 to c6 and the seventh category,
 * Beauty and Personal Care, fell through to a default near-black. Colour now
 * comes from the shared palette, so adding a trade cannot leave a hole.
 *
 * Two of those old pairs were amber and forest, which this system spends on
 * money in motion and on settled state. A category wearing either makes a claim
 * about status it cannot back, so both are gone from the set.
 */

export function CategoryTiles({
  categories,
  products,
}: {
  categories: Category[];
  products: Product[];
}) {
  return (
    <section>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-headline-md font-semibold text-ink">Popular Categories</h2>
          <p className="mt-1 text-[14px] text-body">
            Shop by category, carefully curated for you
          </p>
        </div>
        <Link
          href="/browse"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-forest transition-colors hover:text-ink"
        >
          View all
          <ArrowRight size={14} strokeWidth={1.75} />
        </Link>
      </div>

      <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-6 overflow-x-auto px-4 pb-4 md:mx-0 md:grid md:grid-cols-3 lg:grid-cols-6 md:gap-8 md:px-0 md:overflow-visible md:snap-none">
        {categories.map((category, index) => {
          const palette = categoryPalette(category.id);
          const count = products.filter((product) => product.category_id === category.id).length;

          return (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ delay: index * 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="group flex w-[110px] shrink-0 snap-start flex-col items-center text-center md:w-auto"
            >
              <Link href={`/browse?category=${category.slug}`} className="flex flex-col items-center outline-none">
                <div
                  style={{ backgroundColor: palette.wash }}
                  className="relative flex h-[100px] w-[100px] items-center justify-center rounded-full p-[3px] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105 group-hover:shadow-lg group-focus-visible:ring-2 group-focus-visible:ring-forest group-focus-visible:ring-offset-2 md:h-[130px] md:w-[130px]"
                >
                  <div 
                    className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full border-2 border-white bg-white shadow-sm"
                  >
                    <Image
                      src={`/products/${category.id}.jpg`}
                      alt=""
                      fill
                      sizes="130px"
                      loading="lazy"
                      className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    
                    {/* Floating Icon Badge */}
                    <div 
                      className="absolute bottom-2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white shadow-md transition-transform duration-300 group-hover:-translate-y-1 md:bottom-3"
                      style={{ backgroundColor: palette.hue }}
                    >
                      <CategoryIcon categoryId={category.id} size={14} className="text-white" />
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-[14px] font-semibold text-ink transition-colors group-hover:text-forest">{category.name}</p>
                  <p className="mt-0.5 text-[12px] text-muted">
                    {count} {count === 1 ? 'item' : 'items'}
                  </p>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}export function SupplierRail({
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
