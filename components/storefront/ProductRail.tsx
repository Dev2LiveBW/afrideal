'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Heart, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

import { MoneyText } from '@/components/brand/MoneyText';
import { Swatch } from '@/components/storefront/Swatch';
import { useAfriDealStore } from '@/store/useAfriDealStore';
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
  cardWidth = 'w-[228px]',
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

    addToCart({
      product_id: product.id,
      variant_id: variant.id,
      name: product.name,
      variant_label: variant.label,
      emoji: product.emoji,
      unit_price: variant.price,
      qty: 1,
      supplier_id: product.primarySupplierId ?? '',
    });

    toast.success(`${product.name} added to cart`);
  }

  if (products.length === 0) return null;

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-headline-md font-semibold text-ink">{title}</h2>
          {description && <p className="mt-1 text-[13.5px] text-body">{description}</p>}
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
        className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2"
      >
        {products.map((product) => {
          const primary = images.find(
            (image) => image.product_id === product.id && image.sort_order === 0,
          );
          const isSaved = saved.has(product.id);

          return (
            <article
              key={product.id}
              className={cn(
                'group relative shrink-0 snap-start overflow-hidden rounded-md border border-hairline bg-surface-raised',
                'shadow-card transition-shadow duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-lift',
                cardWidth,
              )}
            >
              <Link href={`/products/${product.id}`} className="block">
                <Swatch
                  image={primary}
                  fallback={product.swatch}
                  emoji={product.emoji}
                  className="aspect-[5/4]"
                  label={product.name}
                />
              </Link>

              <button
                onClick={() => toggleSave(product.id, product.name)}
                aria-label={isSaved ? `Remove ${product.name} from your list` : `Save ${product.name} for later`}
                aria-pressed={isSaved}
                className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-surface-raised/90 backdrop-blur-sm transition-colors hover:bg-surface-raised"
              >
                <Heart
                  size={14}
                  strokeWidth={1.5}
                  className={isSaved ? 'fill-danger text-danger' : 'text-body'}
                />
              </button>

              {product.promotion && (
                <span className="absolute left-2.5 top-2.5 rounded-full bg-danger px-2 py-0.5 font-mono text-[10px] font-semibold text-white">
                  −{product.promotion.discount_pct}%
                </span>
              )}

              <div className="p-3.5">
                {product.categoryName && (
                  <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted">
                    {product.categoryName}
                  </p>
                )}

                <Link href={`/products/${product.id}`}>
                  <h3 className="mt-1 line-clamp-2 min-h-[2.4em] text-[13.5px] font-medium leading-5 text-ink transition-colors hover:text-gold-dark">
                    {product.name}
                  </h3>
                </Link>

                <div className="mt-2.5 flex items-end justify-between gap-2">
                  <div className="min-w-0">
                    <MoneyText amount={product.price} size="sm" tone="gold" />
                    {product.compare_at_price && (
                      <span className="ml-1.5 font-mono text-[11px] tabular-nums text-muted line-through">
                        {product.compare_at_price.toFixed(2)}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => quickAdd(product)}
                    aria-label={`Add ${product.name} to cart`}
                    className="flex h-8 shrink-0 items-center gap-1 rounded-full border border-hairline-strong px-2.5 text-[12px] font-medium text-ink transition-colors hover:border-gold hover:bg-gold-50"
                  >
                    <Plus size={13} strokeWidth={1.75} />
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
