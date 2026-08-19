'use client';

import { MoneyText } from '@/components/brand/MoneyText';
import { cn } from '@/lib/utils';
import type { ProductVariant } from '@/types';

export function VariantSelector({
  variants,
  selectedId,
  onSelect,
  label = 'Option',
  className,
}: {
  variants: ProductVariant[];
  selectedId: string;
  onSelect: (variantId: string) => void;
  label?: string;
  className?: string;
}) {
  return (
    <fieldset className={className}>
      <legend className="eyebrow mb-2.5">{label}</legend>

      <div className="flex flex-wrap gap-2">
        {variants.map((variant) => {
          const active = variant.id === selectedId;

          return (
            <button
              key={variant.id}
              type="button"
              onClick={() => onSelect(variant.id)}
              aria-pressed={active}
              className={cn(
                'group flex min-w-[128px] flex-col items-start rounded px-3.5 py-2.5 text-left',
                'ring-1 ring-inset transition-all duration-250 ease-[cubic-bezier(0.16,1,0.3,1)]',
                active
                  ? 'bg-ink text-white ring-ink'
                  : 'bg-surface-raised text-ink ring-hairline-strong hover:bg-ink/[0.03] hover:ring-ink/25',
              )}
            >
              <span className="text-[13px] font-medium">{variant.label}</span>
              <span
                className={cn(
                  'mt-0.5 font-mono text-[12px] tabular-nums',
                  active ? 'text-gold-light' : 'text-gold-dark',
                )}
              >
                {new Intl.NumberFormat('en-BW', { minimumFractionDigits: 2 }).format(variant.price)}
              </span>
              <span
                className={cn(
                  'mt-0.5 font-mono text-[10px] uppercase tracking-[0.1em]',
                  active ? 'text-white/45' : 'text-muted',
                )}
              >
                {variant.sku}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
