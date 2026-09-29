'use client';

import Link from 'next/link';
import { useState } from 'react';
import { LayoutGrid } from 'lucide-react';

import { CategoryIcon } from '@/components/storefront/CategoryIcon';
import { Swatch } from '@/components/storefront/Swatch';
import { categoryPalette } from '@/lib/category-palette';
import { cn } from '@/lib/utils';
import type { Category, Product, ProductImage } from '@/types';

/**
 * The two-pane category browser. Alibaba benchmark §2.
 *
 * A rail of trades on the left, a grid of round tiles on the right, and the
 * rail changes the grid. It is the pattern the product owner pointed at
 * ("also adopt their categories") and it is how every large marketplace app
 * does category browsing on a phone, because a flat grid of seven tiles
 * cannot grow and this can.
 *
 * Alibaba's tiles are sub-categories. AfriDeal has no second level yet - see
 * docs/research/alibaba-1688-features.md §2.1 - so the tiles are the
 * category's products, and the set closes with the same "View all" tile the
 * benchmark uses, routing to the filtered catalogue. When sub-categories are
 * seeded the tiles change; the frame does not.
 *
 * Client-side rail state only, which is also what the live site does: a rail
 * tap swaps the pane in place with no navigation. The catalogue is seven
 * categories and seventeen products, all already on the page.
 *
 * Rail and tiles measured live on m.alibaba.com/category.html at 390px:
 * rail 100px, items 13px on a 48px pitch, bold on white when active; discs
 * 78px on a 16px column gap; captions 11px.
 */

export function CategoryBrowser({
  categories,
  products,
  images,
  initialCategoryId,
  className,
}: {
  categories: Category[];
  products: Product[];
  images: ProductImage[];
  initialCategoryId?: string;
  className?: string;
}) {
  // categories.json is already in display order; the type does not carry sort_order.
  const ordered = categories;
  const [activeId, setActiveId] = useState(initialCategoryId ?? ordered[0]?.id);

  const active = ordered.find((category) => category.id === activeId) ?? ordered[0];
  if (!active) return null;

  const tiles = products.filter((product) => product.category_id === active.id);
  const primaryImage = (productId: string) =>
    images.find((image) => image.product_id === productId && image.sort_order === 0);
  const palette = categoryPalette(active.id);

  return (
    <div className={cn('flex min-h-[70vh]', className)}>
      {/* ── The rail ──────────────────────────────────────────────────
        A quarter of the width, grey, and scrolls on its own. The active
        trade goes white with a bar on its left edge - the benchmark's cue,
        and the one thing that has to read at a glance.
      */}
      <nav
        aria-label="Categories"
        className="w-[26%] max-w-[120px] shrink-0 overflow-y-auto border-r border-hairline bg-surface"
      >
        <ul>
          {ordered.map((category) => {
            const isActive = category.id === active.id;
            return (
              <li key={category.id}>
                <button
                  type="button"
                  onClick={() => setActiveId(category.id)}
                  aria-current={isActive ? 'true' : undefined}
                  className={cn(
                    'relative flex min-h-[48px] w-full items-center px-2.5 py-2 text-left text-[13px] leading-[1.25] transition-colors sm:px-3',
                    isActive
                      ? 'bg-surface-raised font-semibold text-ink'
                      : 'text-body hover:bg-surface-raised/60 hover:text-ink',
                  )}
                >
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-2 left-0 w-[3px] rounded-r bg-[#E67E22]"
                    />
                  )}
                  <span className="line-clamp-2">{category.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ── The pane ──────────────────────────────────────────────────── */}
      <div className="min-w-0 flex-1 bg-surface-raised px-3 py-4 sm:px-5">
        <div className="mb-3 flex items-center gap-2">
          <span
            className="flex h-6 w-6 items-center justify-center rounded-full"
            style={{ backgroundColor: palette.wash, color: palette.hue }}
          >
            <CategoryIcon categoryId={active.id} size={13} />
          </span>
          <h2 className="truncate text-[14px] font-semibold text-ink">{active.name}</h2>
        </div>

        {/*
          Three across, round, a caption under each. The disc is the
          benchmark's ~78px on a 384px screen; here it is the column width
          less the gap so it scales with the pane rather than with the phone.
        */}
        <ul className="grid grid-cols-3 gap-x-4 gap-y-5">
          {tiles.map((product) => (
            <li key={product.id}>
              <Link
                href={`/products/${product.id}`}
                className="group flex flex-col items-center text-center outline-none"
              >
                <div className="relative aspect-square w-full max-w-[84px] overflow-hidden rounded-full bg-surface-sunk ring-1 ring-black/5 transition-shadow group-hover:shadow-card group-focus-visible:ring-2 group-focus-visible:ring-[#E67E22]">
                  <Swatch
                    image={primaryImage(product.id)}
                    fallback={product.swatch}
                    emoji={product.emoji}
                    label={product.name}
                    className="h-full w-full"
                    glyphClassName="text-[22px]"
                  />
                </div>
                <span className="mt-1.5 line-clamp-2 text-[11px] leading-[1.25] text-ink group-hover:text-[#E67E22]">
                  {product.name}
                </span>
              </Link>
            </li>
          ))}

          {/* The set's terminator, as the benchmark draws it. */}
          <li>
            <Link
              href={`/browse?category=${active.slug}`}
              className="group flex flex-col items-center text-center outline-none"
            >
              <span className="flex aspect-square w-full max-w-[84px] items-center justify-center rounded-full bg-surface-sunk text-body ring-1 ring-black/5 transition-colors group-hover:bg-[#E67E22]/10 group-hover:text-[#E67E22]">
                <LayoutGrid size={22} strokeWidth={1.6} aria-hidden="true" />
              </span>
              <span className="mt-1.5 text-[11px] leading-[1.25] text-ink group-hover:text-[#E67E22]">
                View all
              </span>
            </Link>
          </li>
        </ul>

        {tiles.length === 0 && (
          <p className="mt-2 text-[12px] text-muted">Nothing listed in this trade yet.</p>
        )}
      </div>
    </div>
  );
}
