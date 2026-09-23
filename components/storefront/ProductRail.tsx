'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Heart, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

import { PriceTag } from '@/components/brand/MoneyText';
import { pulaTag } from '@/lib/format';
import { CategoryIcon } from '@/components/storefront/CategoryIcon';
import { Swatch, photoUrl } from '@/components/storefront/Swatch';
import { useAfriDealStore } from '@/store/useAfriDealStore';
import { categoryPalette } from '@/lib/category-palette';
import { cn } from '@/lib/utils';
import type { Product, ProductImage } from '@/types';

/**
 * Horizontal product rail with inline add-to-cart.
 *
 * Used for new arrivals and for frequently-bought-together. Scrolls natively so
 * it stays usable with a trackpad, touch and a keyboard; the arrows nudge it
 * rather than reimplementing scrolling in JavaScript.
 */

export interface RailProduct extends Product {
  supplierCount?: number;
  categoryName?: string;
  primarySupplierId?: string;
}

export function ProductRail({
  products,
  images,
  title,
  description,
  action,
  cardWidth = 'w-[130px] sm:w-[180px] md:w-[228px]',
}: {
  products: RailProduct[];
  images: ProductImage[];
  title: string;
  description?: string;
  action?: React.ReactNode;
  cardWidth?: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const addToCart = useAfriDealStore((state) => state.addToCart);
  const [saved, setSaved] = useState<Set<string>>(new Set());

  function nudge(direction: -1 | 1) {
    scroller.current?.scrollBy({ left: direction * 480, behavior: 'smooth' });
  }

  function toggleSave(productId: string, name: string) {
    setSaved((previous) => {
      const next = new Set(previous);
      if (next.has(productId)) {
        next.delete(productId);
        toast(`Removed ${name} from your list`);
      } else {
        next.add(productId);
        toast.success(`Saved ${name} for later`);
      }
      return next;
    });
  }

  function quickAdd(product: RailProduct) {
    const variant = product.variants[0];
    if (!variant) return;

    const primary = images.find(
      (image) => image.product_id === product.id && image.sort_order === 0,
    );

    addToCart({
      product_id: product.id,
      variant_id: variant.id,
      name: product.name,
      variant_label: variant.label,
      emoji: product.emoji,
      unit_price: variant.price,
      qty: 1,
      supplier_id: product.primarySupplierId ?? '',
      image_url: photoUrl(primary),
    });

    toast.success(`${product.name} added to cart`);
  }

  if (products.length === 0) return null;

  return (
    <section>
      <div className="mb-3 sm:mb-5 flex flex-wrap items-end justify-between gap-2 sm:gap-4">
        <div>
          <h2 className="font-display text-[1.0625rem] sm:text-headline-md font-semibold text-ink">{title}</h2>
          {description && <p className="mt-0.5 sm:mt-1 text-[0.71875rem] sm:text-[0.84375rem] text-body">{description}</p>}
        </div>

        <div className="flex items-center gap-2">
          {action}
          <div className="hidden items-center gap-1.5 sm:flex">
            {([-1, 1] as const).map((direction) => (
              <button
                key={direction}
                onClick={() => nudge(direction)}
                aria-label={direction === -1 ? 'Scroll left' : 'Scroll right'}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-hairline-strong bg-surface-raised text-body transition-colors hover:bg-ink/[0.04] hover:text-ink"
              >
                {direction === -1 ? (
                  <ChevronLeft size={15} strokeWidth={1.5} />
                ) : (
                  <ChevronRight size={15} strokeWidth={1.5} />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        ref={scroller}
        className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-2 sm:gap-4 overflow-x-auto px-1 pb-2"
      >
        {products.map((product) => {
          const primary = images.find(
            (image) => image.product_id === product.id && image.sort_order === 0,
          );
          const isSaved = saved.has(product.id);
          const palette = categoryPalette(product.category_id);

          return (
            /*
              The rail card carries its trade's colour, matching ProductCard.
              Both exist because the rail scrolls horizontally and needs its own
              width and snap behaviour, but they must not disagree about what a
              product looks like.
            */
            <article
              key={product.id}
              className={cn(
                'group relative shrink-0 snap-start flex flex-col items-center text-center outline-none',
                cardWidth,
              )}
            >
              <Link href={`/products/${product.id}`} className="block relative outline-none">
                <div 
                  className="relative flex h-[90px] w-[90px] sm:h-[140px] sm:w-[140px] items-center justify-center rounded-full p-[3px] sm:p-[4px] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105 group-hover:shadow-lg md:h-[180px] md:w-[180px]"
                  style={{ backgroundColor: palette.wash }}
                >
                  <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full border-[2px] sm:border-[3px] border-white bg-white shadow-sm">
                    <Swatch
                      image={primary}
                      fallback={product.swatch}
                      emoji={product.emoji}
                      className="absolute inset-0 h-full w-full rounded-full"
                      label={product.name}
                    />
                    
                    <div className="absolute inset-0 bg-black/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  </div>
                  
                  {product.promotion && (
                    <span 
                      className="absolute -right-1 top-1 flex h-7 w-7 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-white sm:border-2 bg-[#E67E22] font-mono text-[0.5625rem] sm:text-[0.6875rem] font-bold text-white shadow-md transition-transform duration-300 group-hover:scale-110 md:-right-0 md:top-4"
                    >
                      -{product.promotion.discount_pct}%
                    </span>
                  )}
                </div>
              </Link>

              <div className="mt-2.5 sm:mt-5 flex w-full flex-col items-center px-1 sm:px-2">
                <Link href={`/products/${product.id}`} className="block">
                  <h3 className="line-clamp-2 text-[0.71875rem] sm:text-[0.875rem] font-medium leading-tight text-ink transition-colors group-hover:text-[#E67E22]">
                    {product.name}
                  </h3>
                </Link>

                <div className="mt-1.5 sm:mt-2.5 flex flex-col items-center gap-1 sm:gap-1.5">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <PriceTag amount={product.price} size="sm" tone="ink" className="text-[0.75rem] sm:text-[0.875rem]" />
                    {product.compare_at_price && (
                      <span className="text-[0.625rem] sm:text-[0.78125rem] tabular-nums text-muted line-through">
                        {pulaTag(product.compare_at_price)}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => quickAdd(product)}
                    aria-label={`Add ${product.name} to cart`}
                    className="mt-1 sm:mt-2 flex h-7 sm:h-9 items-center justify-center gap-1 sm:gap-1.5 rounded-full bg-white px-3 sm:px-5 text-[0.6875rem] sm:text-[0.8125rem] font-bold text-gray-800 shadow-sm ring-1 ring-inset ring-gray-200 transition-all hover:bg-[#E67E22] hover:text-white hover:ring-[#E67E22]"
                  >
                    <Plus size={13} strokeWidth={2} />
                    Add
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
