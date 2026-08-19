import { cn } from '@/lib/utils';
import type { ProductImage } from '@/types';

/**
 * The image slot.
 *
 * `product-images.json` holds one of two things per row:
 *
 *   /products/p001-0.jpg          a real photograph, vendored into /public
 *   swatch:#D4920A,#8B5E0A,140    a gradient stand-in
 *
 * Photographs win when they exist. The gradient is the fallback for products
 * with no photo yet, so a partial image fetch degrades to something deliberate
 * rather than leaving holes in the grid.
 *
 * `npm run images` populates the real files. Until then, or for any product
 * whose search returned nothing usable, the swatch renders.
 */

export interface ParsedSwatch {
  from: string;
  to: string;
  angle: number;
}

export function parseSwatch(imageUrl: string | undefined, fallback: [string, string]): ParsedSwatch {
  if (!imageUrl?.startsWith('swatch:')) {
    return { from: fallback[0], to: fallback[1], angle: 140 };
  }

  const [from, to, angle] = imageUrl.slice('swatch:'.length).split(',');
  return {
    from: from || fallback[0],
    to: to || fallback[1],
    angle: Number(angle) || 140,
  };
}

export function isPhoto(imageUrl: string | undefined): boolean {
  return Boolean(imageUrl) && !imageUrl!.startsWith('swatch:');
}

export function Swatch({
  image,
  fallback,
  emoji,
  className,
  glyphClassName,
  label,
  priority = false,
  zoomOnHover = true,
}: {
  image?: ProductImage | { image_url: string };
  fallback: [string, string];
  emoji: string;
  className?: string;
  glyphClassName?: string;
  label?: string;
  /** Set on the first viewport's imagery so it is not lazy-loaded. */
  priority?: boolean;
  /** Slow push-in when an ancestor marked `group` is hovered. */
  zoomOnHover?: boolean;
}) {
  const url = image?.image_url;

  if (isPhoto(url)) {
    return (
      <div className={cn('relative overflow-hidden bg-surface-sunk', className)}>
        {/*
          Plain <img> rather than next/image: these are local, already sized,
          and next/image would add a runtime optimiser for no benefit here.

          The hover push-in is slow and small on purpose. Photography carries the
          card now, so the movement only has to suggest the image is live; a
          fast or large scale reads as a slideshow and fights the type.
        */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={label ?? ''}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          className={cn(
            'h-full w-full object-cover',
            zoomOnHover &&
              'transition-transform duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.06]',
          )}
        />

        {/* Grounds the lower edge so overlaid captions keep their contrast. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink/25 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        />
      </div>
    );
  }

  const { from, to, angle } = parseSwatch(url, fallback);

  return (
    <div
      className={cn('relative overflow-hidden', className)}
      style={{ background: `linear-gradient(${angle}deg, ${from} 0%, ${to} 100%)` }}
      role={label ? 'img' : undefined}
      aria-label={label}
    >
      <span
        aria-hidden="true"
        className={cn(
          'absolute bottom-2 right-3 select-none leading-none opacity-25',
          glyphClassName ?? 'text-[44px]',
        )}
      >
        {emoji}
      </span>
    </div>
  );
}
