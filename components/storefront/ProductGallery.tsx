'use client';

import { useState } from 'react';

import { Swatch } from '@/components/storefront/Swatch';
import { cn } from '@/lib/utils';
import type { Product, ProductImage } from '@/types';

const ROLE_LABELS: Record<string, string> = {
  PRIMARY: 'Front',
  GALLERY: 'In use',
  SPEC: 'Detail',
  PACKAGING: 'Packaging',
};

export function ProductGallery({
  product,
  images,
}: {
  product: Product;
  images: ProductImage[];
}) {
  const ordered = [...images].sort((a, b) => a.sort_order - b.sort_order);
  const [activeId, setActiveId] = useState(ordered[0]?.id ?? '');

  const active = ordered.find((image) => image.id === activeId) ?? ordered[0];

  return (
    <div className="flex gap-3">
      {ordered.length > 1 && (
        <div className="flex w-[72px] shrink-0 flex-col gap-2.5">
          {ordered.map((image) => (
            <button
              key={image.id}
              onClick={() => setActiveId(image.id)}
              aria-label={`View ${ROLE_LABELS[image.image_type] ?? 'image'}`}
              aria-pressed={image.id === active?.id}
              className={cn(
                'overflow-hidden rounded transition-all duration-250 ease-[cubic-bezier(0.16,1,0.3,1)]',
                'ring-1 ring-inset',
                image.id === active?.id
                  ? 'ring-2 ring-gold'
                  : 'ring-hairline-strong hover:ring-ink/30',
              )}
            >
              <Swatch
                image={image}
                fallback={product.swatch}
                emoji={product.emoji}
                className="aspect-square"
                glyphClassName="text-[20px]"
              />
            </button>
          ))}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <Swatch
          image={active}
          fallback={product.swatch}
          emoji={product.emoji}
          className="aspect-[4/3] rounded-lg"
          glyphClassName="text-[110px] bottom-6 right-8"
          label={product.name}
        />

        {active && (
          <p className="mt-2 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
            {ROLE_LABELS[active.image_type] ?? 'View'} · illustrative, photography pending
          </p>
        )}
      </div>
    </div>
  );
}
