'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Heart, Plus, ShieldCheck, Star } from 'lucide-react';
import toast from 'react-hot-toast';

import { PriceTag } from '@/components/brand/MoneyText';
import { pulaTag } from '@/lib/format';
import { Swatch, photoUrl } from '@/components/storefront/Swatch';
import { useAfriDealStore } from '@/store/useAfriDealStore';
import { cn } from '@/lib/utils';
import type { Product, ProductImage } from '@/types';

/**
 * Storefront product card. Alibaba benchmark §1b.
 *
 * Drawn to the catalogue card in the product owner's second recording, which
 * she sent with "see how small their boxes are, and this is on a phone": two
 * across, a square photograph the full width of the card with no border and
 * no shadow, and four lines under it - name, price, minimum order, a meta
 * line. Measured live on m.alibaba.com: title 12px grey, price 14px bold
 * ink, 8px radius on the photograph. About five cards to a phone screen.
 *
 * What went: the coloured wash ground, the card border and shadow, the
 * two-line description, and the footer band. A card in a grid is identified
 * by its photograph; chrome around it only spends the width the photograph
 * needs. Quick-add stays, as a round button on the photograph's corner - the
 * benchmark has no cart on its cards because Alibaba is not the seller, and
 * AfriDeal is.
 *
 * The image slot is a gradient built from the product's own swatch with the
 * category glyph set small and low contrast. That reads as a deliberate
 * placeholder rather than a missing asset, which a large centred emoji does not.
 *
 * Nothing animates in. The card used to fade and rise as it scrolled into
 * view; the benchmark's grids do not (§4), and on a feed that loads in
 * batches the stagger made each batch arrive as a little parade. The only
 * motion is the benchmark's press state - a 10% dip while the finger is down.
 */

export function ProductCard({
  product,
  supplierCount,
  href,
  image,
  categoryName,
  primarySupplierId,
  tierPrice,
  tierSavingPct,
  tierByQuotation,
  tierMinQty,
  className,
}: {
  product: Product;
  supplierCount?: number;
  /** Accepted for call-site compatibility; the card no longer staggers. */
  index?: number;
  href?: string;
  image?: ProductImage;
  categoryName?: string;
  primarySupplierId?: string;
  /** Published price at the rung the catalogue is filtered to, when there is one. */
  tierPrice?: number | null;
  tierSavingPct?: number;
  /** The rung is real but this account cannot buy at it yet. */
  tierByQuotation?: boolean;
  /** Smallest quantity that actually earns the rung price shown on this card. */
  tierMinQty?: number;
  className?: string;
}) {
  const addToCart = useAfriDealStore((state) => state.addToCart);
  const [saved, setSaved] = useState(false);

  const showingTier = tierPrice !== null && tierPrice !== undefined;

  function toggleSave(event: React.MouseEvent) {
    event.preventDefault();
    setSaved((value) => {
      toast.success(
        value ? `Removed ${product.name} from your list` : `Saved ${product.name} for later`,
      );
      return !value;
    });
  }

  function quickAdd(event: React.MouseEvent) {
    event.preventDefault();
    const variant = product.variants[0];
    if (!variant) return;

    /*
     * On a tier-filtered grid the card is quoting a band price, so adding a
     * single unit would land the buyer in a cart showing the list price they
     * were not offered. Quick-add takes the quantity that actually earns the
     * figure on the card. The quoted rung is excluded: there is no published
     * that price at any quantity.
     */
    const qty = showingTier && !tierByQuotation && tierMinQty ? Math.max(1, tierMinQty) : 1;

    addToCart({
      product_id: product.id,
      variant_id: variant.id,
      name: product.name,
      variant_label: variant.label,
      emoji: product.emoji,
      unit_price: variant.price,
      qty,
      supplier_id: primarySupplierId ?? '',
      image_url: photoUrl(image),
    });

    toast.success(
      qty === 1
        ? `${product.name} added to cart`
        : `${qty} × ${product.name} added - bulk price applied`,
    );
  }

  return (
    <article className={cn('press-soft group relative', className)}>
      <Link
        href={href ?? `/products/${product.id}`}
        className="flex h-full flex-col outline-none"
      >
        {/* ── The photograph, and the two things you can do on it ─────── */}
        <div className="relative overflow-hidden rounded-[8px] bg-surface-sunk">
          <Swatch
            image={image}
            fallback={product.swatch}
            emoji={product.emoji}
            className="aspect-square"
            glyphClassName="text-[40px] bottom-2 right-3 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110"
            label={product.name}
          />

          {product.promotion ? (
            <span className="absolute left-2 top-2 rounded bg-danger px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white">
              −{product.promotion.discount_pct}%
            </span>
          ) : (
            product.featured && (
              <span className="absolute left-2 top-2 rounded bg-ink/70 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-white backdrop-blur-sm">
                Featured
              </span>
            )
          )}

          <button
            onClick={toggleSave}
            aria-label={saved ? `Remove ${product.name} from your list` : `Save ${product.name} for later`}
            aria-pressed={saved}
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-surface-raised/90 backdrop-blur-sm transition-colors hover:bg-surface-raised"
          >
            <Heart
              size={13}
              strokeWidth={1.75}
              className={saved ? 'fill-danger text-danger' : 'text-body'}
            />
          </button>

          <button
            onClick={quickAdd}
            aria-label={`Add ${product.name} to cart`}
            className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-[#E67E22] text-white shadow-md transition-colors hover:bg-[#D35400]"
          >
            <Plus size={16} strokeWidth={2.25} />
          </button>
        </div>

        {/* ── Four lines, in the benchmark's order ─────────────────────── */}
        <div className="flex flex-1 flex-col pt-2">
          <h3 className="line-clamp-2 text-[12px] font-normal leading-[1.35] text-body transition-colors group-hover:text-ink">
            {product.name}
          </h3>

          {/*
            When the catalogue is priced at a rung, that price is the one on
            the card and the list price sits struck through beside it. The
            card must never show a cheaper headline than the grid was
            filtered to, or the sort order stops matching what is read.
          */}
          <p className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
            <PriceTag
              amount={showingTier ? tierPrice! : product.price}
              size="sm"
              tone={tierByQuotation ? 'muted' : 'ink'}
              className="text-[14px]"
            />
            {showingTier ? (
              tierPrice! < product.price && (
                <span className="text-[11px] tabular-nums text-muted line-through">
                  {pulaTag(product.price)}
                </span>
              )
            ) : (
              product.compare_at_price && (
                <span className="text-[11px] tabular-nums text-muted line-through">
                  {pulaTag(product.compare_at_price)}
                </span>
              )
            )}
            {showingTier && (tierSavingPct ?? 0) > 0 && (
              <span className="font-mono text-[10.5px] tabular-nums text-forest">
                −{Math.round(tierSavingPct!)}%
              </span>
            )}
          </p>

          {/*
            The rung's minimum, or one - the retail rung has no floor. "On
            quotation" replaces the figure on the custom rung, where there is
            no published price to have a minimum for.
          */}
          <p className="mt-0.5 text-[12px] leading-tight text-body">
            {tierByQuotation
              ? 'On quotation'
              : <>Min. order: <span className="font-mono tabular-nums text-ink">{showingTier && tierMinQty ? tierMinQty : 1}</span> {showingTier && tierMinQty && tierMinQty > 1 ? 'units' : 'unit'}</>}
          </p>

          <p className="mt-0.5 flex min-w-0 items-center gap-1 text-[11px] leading-tight text-muted">
            {supplierCount !== undefined && supplierCount > 0 && (
              <span className="inline-flex shrink-0 items-center gap-0.5 font-semibold text-ocean">
                <ShieldCheck size={11} strokeWidth={2.25} />
                {supplierCount} verified
              </span>
            )}
            {supplierCount !== undefined && supplierCount > 0 && <span aria-hidden="true">·</span>}
            <span className="inline-flex items-center gap-0.5">
              <Star size={10} strokeWidth={1.5} className="fill-gold text-gold" />
              <span className="font-mono tabular-nums">{product.rating.toFixed(1)}</span>
            </span>
            {categoryName && (
              <>
                <span aria-hidden="true">·</span>
                <span className="truncate">{categoryName}</span>
              </>
            )}
          </p>
        </div>
      </Link>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div>
      <div className="skeleton aspect-square rounded-[8px]" />
      <div className="space-y-1.5 pt-2">
        <div className="skeleton h-3.5 w-full" />
        <div className="skeleton h-3.5 w-2/3" />
        <div className="skeleton h-4 w-1/3" />
        <div className="skeleton h-3 w-1/2" />
      </div>
    </div>
  );
}
