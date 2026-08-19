import Image from 'next/image';

import { cn } from '@/lib/utils';
import type { CartLine } from '@/types';

/**
 * The picture on a basket line, in the cart and again in the checkout summary.
 *
 * `image_url` is copied onto the line when it is added, so this needs no lookup
 * and works in a client component reading persisted state. A line saved before
 * that field existed — or one for a product with no photography — has nothing
 * to show, and falls back to the category glyph on a sunk tile, which is the
 * same fallback the product grid uses.
 */
export function CartLineThumb({
  line,
  className,
  glyphClassName,
}: {
  line: CartLine;
  className?: string;
  glyphClassName?: string;
}) {
  if (!line.image_url) {
    return (
      <span
        aria-hidden="true"
        className={cn(
          'flex items-center justify-center rounded bg-surface-sunk',
          className,
          glyphClassName,
        )}
      >
        {line.emoji}
      </span>
    );
  }

  return (
    <span className={cn('relative block overflow-hidden rounded bg-surface-sunk', className)}>
      <Image
        src={line.image_url}
        alt=""
        fill
        // Never larger than a thumbnail in either place it renders, so the CDN
        // is asked for a thumbnail rather than the full-width source.
        sizes="80px"
        className="object-cover"
      />
    </span>
  );
}
