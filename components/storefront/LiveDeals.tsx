'use client';

import Link from 'next/link';
import { Plus, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

import { Floor } from '@/components/storefront/home/Floor';
import { Swatch, photoUrl } from '@/components/storefront/Swatch';
import { pulaTag } from '@/lib/format';
import { useAfriDealStore } from '@/store/useAfriDealStore';
import type { Product, ProductImage } from '@/types';

/**
 * Live Deals. (TICKET-004)
 *
 * This was "And on everything else" - a hairline list tucked under the
 * packages board, proving the ladder held across the catalogue. The proof is
 * still the point, but a buyer reads it as an offer, so it is a section in
 * its own right: the lightning mark, the drop, and the quantity that earns it.
 *
 * Now a floor on the benchmark's rail (docs/design/alibaba-benchmark.md
 * §3a): 136px cards, the drop and its rung on the pill at the photograph's
 * foot, the deal price bold with the retail price struck beside it, and the
 * product's name under that. The rows-with-buttons version this replaces
 * was the product owner's first graphic; her later instruction - "adopt
 * their style… see how small their boxes are" - is the one this follows.
 *
 * The pill is the part that matters. "−24%" on its own is a discount a buyer
 * will look for at checkout and not find; "−24% at 50+" is a claim they can
 * act on, because it names the rung the price sits on.
 *
 * Quick-add stays, as the round button on the photograph's corner, because
 * AfriDeal is the seller and the benchmark's cards have no cart for the
 * opposite reason. Every figure comes from the seeded price bands.
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

  if (rows.length === 0) return null;

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
    <Floor
      id="live-deals"
      title="Live Deals"
      subtitle="Limited time offers across all categories"
      href="/browse"
      icon={Zap}
      iconClassName="fill-[#27AE60] text-[#27AE60]"
      className={className}
    >
      <ul className="grid grid-cols-4 gap-1 px-3 pb-3 pt-2 sm:gap-3 sm:px-4">
        {rows.map((row) => {
          const { product, image, from, to, pct, lowestRange } = row;
          // "50–99" → "50+": the pill has 136px and the floor of the rung is the claim.
          const floor = lowestRange.split(/[–-]/)[0];

          return (
            <li key={product.id} className="w-full">
              <Link
                href={`/products/${product.id}`}
                className="press-soft group block h-full rounded-lg border border-hairline bg-surface-raised p-1 outline-none transition-shadow hover:shadow-card sm:p-2"
              >
                <div className="relative aspect-square w-full overflow-hidden rounded-[6px] bg-[#f4f4f4]">
                  <Swatch
                    image={image}
                    fallback={product.swatch}
                    emoji={product.emoji}
                    label={product.name}
                    className="h-full w-full"
                    glyphClassName="text-[16px] sm:text-[34px] bottom-1 right-2"
                    zoomOnHover={false}
                  />
                  <span className="absolute bottom-0.5 left-0.5 z-10 max-w-[calc(100%-4px)] truncate rounded-[3px] bg-[#222]/70 px-0.5 py-0 font-mono text-[5.5px] font-bold text-white sm:px-1.5 sm:text-[10px]">
                    −{pct.toFixed(0)}% at {floor}+
                  </span>
                  <button
                    type="button"
                    onClick={(event) => quickAdd(event, row)}
                    aria-label={`Add ${product.name} to cart`}
                    className="press absolute right-1.5 top-1.5 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-[#E67E22] text-white shadow-md sm:h-7 sm:w-7"
                  >
                    <Plus size={9} strokeWidth={3} aria-hidden="true" className="sm:hidden" />
                    <Plus size={14} strokeWidth={2.5} aria-hidden="true" className="hidden sm:block" />
                  </button>
                </div>
                <div className="mt-0.5 px-0">
                  <div className="flex flex-wrap items-baseline gap-1">
                    <span className="font-mono text-[8px] font-bold tabular-nums text-[#1E8449] sm:text-[14px]">
                      {pulaTag(to)}
                    </span>
                    <span className="font-mono text-[6px] font-normal tabular-nums text-[#888] line-through sm:text-[11px]">
                      {pulaTag(from)}
                    </span>
                  </div>
                  <div className="mt-0 line-clamp-1 text-[7.5px] font-medium text-[#222] transition-colors group-hover:text-[#E67E22] sm:text-[12px]">
                    {product.name}
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </Floor>
  );
}
