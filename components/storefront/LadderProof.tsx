import Link from 'next/link';

import { MoneyText } from '@/components/brand/MoneyText';
import { Swatch } from '@/components/storefront/Swatch';
import type { Product, ProductImage } from '@/types';

export interface LadderProofRow {
  product: Product;
  image?: ProductImage;
  from: number;
  to: number;
  pct: number;
  lowestRange: string;
}

/**
 * The ladder is not a promotion on one product; it is how the catalogue is
 * priced. This proves that with four real products and their real spreads.
 *
 * The bar is the point. Each row draws the drop from the retail rung to the
 * cheapest published one at the same scale across every row, so a shallow
 * ladder looks shallow — the graphic can lose. A row of matching percentages
 * would be a design that cannot be wrong, which is a design that proves
 * nothing.
 */
export function LadderProof({ rows }: { rows: LadderProofRow[] }) {
  if (rows.length === 0) return null;

  // One shared scale, set by the deepest ladder on show.
  const deepest = Math.max(...rows.map((row) => row.pct));

  return (
    <ul className="divide-y divide-hairline">
      {rows.map(({ product, image, from, to, pct, lowestRange }) => (
        <li key={product.id}>
          <Link
            href={`/products/${product.id}`}
            className="group flex min-w-0 items-center gap-3 py-4 transition-colors duration-300 hover:bg-ink/[0.02] sm:gap-6"
          >
            <Swatch
              image={image}
              fallback={product.swatch}
              emoji={product.emoji}
              label={product.name}
              className="h-14 w-14 shrink-0 rounded"
              glyphClassName="text-[22px]"
              zoomOnHover={false}
            />

            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-medium text-ink transition-colors group-hover:text-gold-dark">
                {product.name}
              </p>

              <div className="mt-2 flex items-center gap-3">
                {/*
                  Track and fill share one width scale across rows, so the bars
                  are comparable to each other rather than each self-normalised.
                */}
                <span className="relative hidden h-1 w-full max-w-[220px] overflow-hidden rounded-full bg-ink/[0.07] sm:block">
                  <span
                    className="absolute inset-y-0 left-0 rounded-full bg-forest"
                    style={{ width: `${deepest === 0 ? 0 : (pct / deepest) * 100}%` }}
                  />
                </span>
                {/*
                  Allowed to wrap below `sm`. Held on one line, this string's
                  min-content sized the whole row to 359px and pushed the page
                  into a horizontal scroll on a 375px phone — the bar beside it
                  is hidden at that width anyway, so there is nothing for it to
                  stay level with.
                */}
                <span className="font-mono text-[11.5px] tabular-nums text-forest sm:whitespace-nowrap">
                  −{pct.toFixed(0)}% at {lowestRange}
                </span>
              </div>
            </div>

            <div className="shrink-0 text-right">
              <p className="font-mono text-[12px] tabular-nums text-muted line-through">
                {from.toFixed(2)}
              </p>
              <MoneyText amount={to} size="md" bare className="text-ink" />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
