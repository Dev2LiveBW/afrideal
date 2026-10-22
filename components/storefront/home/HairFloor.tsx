import { Sparkles } from 'lucide-react';

import { Floor, Rail, RailCard } from '@/components/storefront/home/Floor';
import { Swatch } from '@/components/storefront/Swatch';
import { PriceText } from '@/components/brand/BuyerCurrency';
import type { Product, ProductImage } from '@/types';

/** The hair category: wigs, weaves, frontals and braiding hair. */
export const HAIR_CATEGORY = 'c1';

/**
 * The hair floor: AfriDeal's primary line, first on the home page.
 *
 * Product owner, 2026-10-20: "hair and weaves should be prominent as it's the
 * primary product for AfriDeal". So hair gets a floor of its own directly under
 * the hero, ahead of the category grid, in the benchmark's floor grammar
 * (docs/design/alibaba-benchmark.md §3a): a linked header over a rail of 136px
 * cards. AfriDeal's own wigs lead, then the rest of the category.
 *
 * A wig is sold by length, so its card shows the shortest length's price as
 * "From"; one price for every length would be wrong for all but one of them.
 */
export function HairFloor({
  products,
  className,
}: {
  products: Array<Product & { image?: ProductImage }>;
  className?: string;
}) {
  const hair = products
    .filter((product) => product.category_id === HAIR_CATEGORY)
    .sort(
      (a, b) =>
        Number(b.brand_id === 'b007') - Number(a.brand_id === 'b007') ||
        Number(a.owner_type === 'SUPPLIER') - Number(b.owner_type === 'SUPPLIER') ||
        Number(b.featured) - Number(a.featured),
    );

  if (hair.length === 0) return null;

  return (
    <Floor
      id="hair-floor"
      title="Hair, wigs & weaves"
      subtitle="AfriDeal wigs, sold by length"
      href="/browse?category=hair-weaves-extensions"
      icon={Sparkles}
      iconClassName="text-forest"
      className={className}
    >
      <Rail>
        {hair.map((product) => {
          // Sold by length when every option is a length ("8 inch"). Colour
          // options with an uplift are not lengths, and keep a single price.
          const byLength =
            product.variants.length > 1 &&
            product.variants.every((variant) => /^\d+(\.\d+)?\s*(inch|")/i.test(variant.label));
          return (
            <RailCard
              key={product.id}
              href={`/products/${product.id}`}
              image={
                <Swatch
                  image={product.image}
                  fallback={product.swatch}
                  emoji={product.emoji}
                  label={product.name}
                  className="h-full w-full"
                  glyphClassName="text-[1.5rem] bottom-1.5 right-2"
                  zoomOnHover={false}
                />
              }
              overlay={
                product.brand_id === 'b007' ? (
                  <span className="absolute left-1.5 top-1.5 z-10 rounded-[3px] bg-forest/95 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-white">
                    AfriDeal
                  </span>
                ) : undefined
              }
              tag={byLength ? `${product.variants.length} lengths` : undefined}
              primary={
                byLength ? (
                  <>
                    From <PriceText amount={product.price} />
                  </>
                ) : (
                  <PriceText amount={product.price} />
                )
              }
              secondary={product.name}
            />
          );
        })}
      </Rail>
    </Floor>
  );
}
