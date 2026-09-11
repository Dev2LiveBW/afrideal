'use client';

import { Plus, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

import { Floor, Rail, RailCard } from '@/components/storefront/home/Floor';
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
      <Rail>
        {rows.map((row) => {
          const { product, image, from, to, pct, lowestRange } = row;
          // "50–99" → "50+": the pill has 136px and the floor of the rung is the claim.
          const floor = lowestRange.split(/[–-]/)[0];

          return (
            <RailCard
              key={product.id}
              href={`/products/${product.id}`}
              image={
                <Swatch
                  image={image}
                  fallback={product.swatch}
                  emoji={product.emoji}
                  label={product.name}
                  className="h-full w-full"
                  glyphClassName="text-[34px] bottom-1 right-2"
                  zoomOnHover={false}
                />
              }
              tag={`−${pct.toFixed(0)}% at ${floor}+`}
              overlay={
                <button
                  type="button"
                  onClick={(event) => quickAdd(event, row)}
                  aria-label={`Add ${product.name} to cart`}
                  className="press absolute right-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-[#E67E22] text-white shadow-md"
                >
                  <Plus size={15} strokeWidth={2.5} aria-hidden="true" />
                </button>
              }
              primary={
                <>
                  <span className="font-mono tabular-nums text-[#1E8449]">{pulaTag(to)}</span>
                  <span className="ml-1 font-mono text-[11px] font-normal tabular-nums text-[#888] line-through">
                    {pulaTag(from)}
                  </span>
                </>
              }
              secondary={product.name}
            />
          );
        })}
      </Rail>
    </Floor>
  );
}
