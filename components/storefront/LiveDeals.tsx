'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, Heart, ShoppingCart, Tag, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

import { PriceTag } from '@/components/brand/MoneyText';
import { Swatch, photoUrl } from '@/components/storefront/Swatch';
import { pulaTag } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useAfriDealStore } from '@/store/useAfriDealStore';
import type { Product, ProductImage } from '@/types';

/**
 * Live Deals. (TICKET-004)
 *
 * This was "And on everything else" - a hairline list tucked under the
 * packages board, proving the ladder held across the catalogue. The proof is
 * still the point, but a buyer reads it as an offer, so it is now a section in
 * its own right, drawn to the client's reference design: a lightning mark, a
 * shelf row per product, and the drop stated twice - once as a corner flag on
 * the photograph and once as a tag that says which quantity earns it.
 *
 * The tag is the part that matters. "−24%" on its own is a discount a buyer
 * will look for at checkout and not find; "−24% at 50–99 units" is a claim
 * they can act on, because it names the rung the price sits on.
 *
 * Rows rather than a card grid. At four products a grid leaves the price and
 * the Add button at four different heights on a phone, and the whole argument
 * of the section is a column of prices you can run your eye down.
 *
 * Every figure comes from the seeded price bands. Nothing here is a percentage
 * invented at render time.
 */

export interface LiveDealRow {
  product: Product;
  image?: ProductImage;
  /** The retail rung's unit price. */
  from: number;
  /** The cheapest published unit price. */
  to: number;
  /** The drop between them, as a percentage of retail. */
  pct: number;
  /** The quantity range that earns `to`, e.g. `50–99`. */
  lowestRange: string;
  categoryName?: string;
  /** The supplier the engine would route a quick-add to. */
  primarySupplierId?: string;
}

export function LiveDeals({ rows, className }: { rows: LiveDealRow[]; className?: string }) {
  const addToCart = useAfriDealStore((state) => state.addToCart);
  const [saved, setSaved] = useState<Set<string>>(new Set());

  if (rows.length === 0) return null;

  function toggleSave(event: React.MouseEvent, product: Product) {
    event.preventDefault();
    setSaved((current) => {
      const next = new Set(current);
      if (next.has(product.id)) {
        next.delete(product.id);
        toast.success(`Removed ${product.name} from your list`);
      } else {
        next.add(product.id);
        toast.success(`Saved ${product.name} for later`);
      }
      return next;
    });
  }

  function quickAdd(event: React.MouseEvent, row: LiveDealRow) {
    event.preventDefault();
    const variant = row.product.variants[0];
    if (!variant) return;

    addToCart({
      product_id: row.product.id,
      variant_id: variant.id,
      name: row.product.name,
      variant_label: variant.label,
      emoji: row.product.emoji,
      unit_price: variant.price,
      qty: 1,
      supplier_id: row.primarySupplierId ?? '',
      image_url: photoUrl(row.image),
    });

    toast.success(`${row.product.name} added to cart`);
  }

  return (
    <section className={cn('mx-auto max-w-market px-4', className)} aria-labelledby="live-deals">
      {/* ── Header: mark, title, route out ──────────────────────────── */}
      <div className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-surface-sunk/60 px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#D8F3E3]">
            <Zap size={20} strokeWidth={2.5} className="fill-[#27AE60] text-[#27AE60]" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 id="live-deals" className="font-display text-[26px] font-bold leading-tight text-ink sm:text-[30px]">
              Live Deals
            </h2>
            <p className="truncate text-[13px] text-muted">Limited time offers across all categories</p>
          </div>
        </div>

        <Link
          href="/browse"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#D8F3E3] px-4 py-2 text-[13px] font-bold text-[#1E8449] transition-colors hover:bg-[#C3EBD3]"
        >
          View all
          <ArrowRight size={14} strokeWidth={2.25} aria-hidden="true" />
        </Link>
      </div>

      {/* ── The shelf ───────────────────────────────────────────────── */}
      <ul className="space-y-3">
        {rows.map((row) => {
          const { product, image, from, to, pct, lowestRange, categoryName } = row;
          const isSaved = saved.has(product.id);

          return (
            <li key={product.id}>
              <div className="group relative flex items-stretch gap-3 overflow-hidden rounded-xl border border-hairline bg-surface-raised p-2.5 shadow-card transition-shadow duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-lift sm:gap-4 sm:p-3">
                {/* Photograph, with the drop flagged on its corner */}
                <Link
                  href={`/products/${product.id}`}
                  className="relative shrink-0 overflow-hidden rounded-lg outline-none"
                >
                  <Swatch
                    image={image}
                    fallback={product.swatch}
                    emoji={product.emoji}
                    label={product.name}
                    className="h-[88px] w-[88px] sm:h-[104px] sm:w-[104px]"
                    glyphClassName="text-[34px] bottom-1 right-2"
                  />
                  <span className="absolute left-0 top-0 rounded-br-lg rounded-tl-lg bg-[#27AE60] px-1.5 py-0.5 font-mono text-[10.5px] font-bold tabular-nums text-white">
                    −{pct.toFixed(0)}%
                  </span>
                </Link>

                {/* Name, the rung the discount lives on, the trade */}
                <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 py-0.5">
                  <Link href={`/products/${product.id}`} className="outline-none">
                    <h3 className="line-clamp-2 text-[14.5px] font-bold leading-snug text-ink transition-colors group-hover:text-[#E67E22] sm:text-[15.5px]">
                      {product.name}
                    </h3>
                  </Link>

                  {/*
                    One text run, not a figure plus a caption. Split across two
                    spans the flex gap opened a hole after the percentage and
                    the tag read as two separate claims.
                  */}
                  <span className="inline-flex w-fit items-center gap-1.5 rounded-md bg-[#E8F6EE] px-2 py-1 text-[11.5px] font-semibold tabular-nums text-[#1E8449]">
                    <Tag size={12} strokeWidth={2.25} aria-hidden="true" />
                    {`−${pct.toFixed(0)}% at ${lowestRange} units`}
                  </span>

                  {categoryName && (
                    <p className="truncate text-[12px] text-muted">{categoryName}</p>
                  )}
                </div>

                {/* Price, and the two things you can do about it */}
                <div className="flex shrink-0 flex-col items-end justify-between gap-1.5 pl-1">
                  <button
                    onClick={(event) => toggleSave(event, product)}
                    aria-label={isSaved ? `Remove ${product.name} from your list` : `Save ${product.name} for later`}
                    aria-pressed={isSaved}
                    className="flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-surface-sunk"
                  >
                    <Heart
                      size={16}
                      strokeWidth={1.75}
                      className={isSaved ? 'fill-danger text-danger' : 'text-muted'}
                    />
                  </button>

                  <div className="text-right">
                    <p className="font-mono text-[11.5px] tabular-nums text-muted line-through">
                      {pulaTag(from)}
                    </p>
                    <PriceTag amount={to} size="md" className="text-[#1E8449] sm:text-[19px]" />
                  </div>

                  <button
                    onClick={(event) => quickAdd(event, row)}
                    aria-label={`Add ${product.name} to cart`}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#E67E22] px-3 text-[12.5px] font-bold text-white transition-colors hover:bg-[#D35400] sm:h-9 sm:px-4 sm:text-[13.5px]"
                  >
                    <ShoppingCart size={14} strokeWidth={2.25} aria-hidden="true" />
                    Add
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
