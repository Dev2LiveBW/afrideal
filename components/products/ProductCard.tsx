'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, Plus, ShieldCheck, Star } from 'lucide-react';
import toast from 'react-hot-toast';

import { MoneyText } from '@/components/brand/MoneyText';
import { Swatch } from '@/components/storefront/Swatch';
import { useAfriDealStore } from '@/store/useAfriDealStore';
import { cn } from '@/lib/utils';
import type { Product, ProductImage } from '@/types';

/**
 * Storefront product card.
 *
 * The image slot is a gradient built from the product's own swatch with the
 * category glyph set small and low contrast. That reads as a deliberate
 * placeholder rather than a missing asset, which a large centred emoji does not.
 */

export function ProductCard({
  product,
  supplierCount,
  index = 0,
  href,
  image,
  categoryName,
  primarySupplierId,
  className,
}: {
  product: Product;
  supplierCount?: number;
  index?: number;
  href?: string;
  image?: ProductImage;
  categoryName?: string;
  primarySupplierId?: string;
  className?: string;
}) {
  const addToCart = useAfriDealStore((state) => state.addToCart);
  const [saved, setSaved] = useState(false);

  function toggleSave(event: React.MouseEvent) {
    event.preventDefault();
    setSaved((value) => {
      toast[value ? 'success' : 'success'](
        value ? `Removed ${product.name} from your list` : `Saved ${product.name} for later`,
      );
      return !value;
    });
  }

  function quickAdd(event: React.MouseEvent) {
    event.preventDefault();
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
      supplier_id: primarySupplierId ?? '',
    });

    toast.success(`${product.name} added to cart`);
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ delay: Math.min(index * 0.05, 0.3), duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className={cn('group relative', className)}
    >
      <Link
        href={href ?? `/products/${product.id}`}
        className="flex h-full flex-col overflow-hidden rounded-md border border-hairline bg-surface-raised shadow-card transition-shadow duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-lift"
      >
        <div className="relative">
          <Swatch
            image={image}
            fallback={product.swatch}
            emoji={product.emoji}
            className="aspect-[4/3]"
            glyphClassName="text-[52px] bottom-3 right-4 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110"
            label={product.name}
          />

          {product.promotion ? (
            <span className="absolute left-3 top-3 rounded-full bg-danger px-2 py-0.5 font-mono text-[10px] font-semibold text-white">
              −{product.promotion.discount_pct}%
            </span>
          ) : (
            product.featured && (
              <span className="absolute left-3 top-3 rounded-full bg-ink/70 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-white backdrop-blur-sm">
                Featured
              </span>
            )
          )}

          <button
            onClick={toggleSave}
            aria-label={saved ? `Remove ${product.name} from your list` : `Save ${product.name} for later`}
            aria-pressed={saved}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-surface-raised/90 backdrop-blur-sm transition-colors hover:bg-surface-raised"
          >
            <Heart
              size={14}
              strokeWidth={1.5}
              className={saved ? 'fill-danger text-danger' : 'text-body'}
            />
          </button>
        </div>

        <div className="flex flex-1 flex-col p-4">
          {categoryName && (
            <p className="mb-1 font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted">
              {categoryName}
            </p>
          )}

          <h3 className="text-[14.5px] font-semibold leading-5 text-ink transition-colors group-hover:text-gold-dark">
            {product.name}
          </h3>

          <p className="mt-1.5 line-clamp-2 flex-1 text-[12.5px] leading-5 text-body">
            {product.short_description}
          </p>

          <div className="mt-3 flex items-center gap-3 text-[11.5px] text-muted">
            <span className="inline-flex items-center gap-1">
              <Star size={12} strokeWidth={1.5} className="fill-gold text-gold" />
              <span className="font-mono tabular-nums">{product.rating.toFixed(1)}</span>
              <span>({product.review_count})</span>
            </span>
            {supplierCount !== undefined && supplierCount > 0 && (
              <span className="inline-flex items-center gap-1 text-forest">
                <ShieldCheck size={12} strokeWidth={1.5} />
                {supplierCount} verified
              </span>
            )}
          </div>

          <div className="mt-3 flex items-end justify-between gap-2 border-t border-hairline pt-3">
            <div className="min-w-0">
              <p className="text-[10.5px] text-muted">From</p>
              <MoneyText amount={product.price} size="md" tone="gold" />
              {product.compare_at_price && (
                <span className="ml-1.5 font-mono text-[11px] tabular-nums text-muted line-through">
                  {product.compare_at_price.toFixed(2)}
                </span>
              )}
            </div>

            <button
              onClick={quickAdd}
              aria-label={`Add ${product.name} to cart`}
              className="flex h-8 shrink-0 items-center gap-1 rounded-full border border-hairline-strong px-2.5 text-[12px] font-medium text-ink transition-colors hover:border-gold hover:bg-gold-50"
            >
              <Plus size={13} strokeWidth={1.75} />
              Add
            </button>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-md border border-hairline bg-surface-raised">
      <div className="skeleton aspect-[4/3] rounded-none" />
      <div className="space-y-2.5 p-4">
        <div className="skeleton h-4 w-3/4" />
        <div className="skeleton h-3 w-full" />
        <div className="skeleton h-3 w-2/3" />
        <div className="skeleton mt-3 h-5 w-1/3" />
      </div>
    </div>
  );
}
