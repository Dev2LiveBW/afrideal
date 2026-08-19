import { Plus } from 'lucide-react';

import { MoneyText } from '@/components/brand/MoneyText';
import { cn } from '@/lib/utils';
import type { PriceResult } from '@/types';

/**
 * The pricing formula, drawn.
 *
 * Suppliers and operators both ask the same question — "where did that price
 * come from" — so the answer is laid out as the sum it actually is rather than
 * hidden behind a single figure.
 */

export function PricingFormula({
  result,
  markupLabel,
  className,
}: {
  result: PriceResult;
  /** e.g. "80% markup · Hair & Beauty" */
  markupLabel?: string;
  className?: string;
}) {
  const parts = [
    { label: 'Supplier cost', value: result.supplier_cost, tone: 'ink' as const },
    { label: markupLabel ?? 'Markup', value: result.markup, tone: 'gold' as const },
    { label: 'Logistics', value: result.logistics_cost, tone: 'muted' as const },
    { label: 'Gateway fee', value: result.gateway_cost, tone: 'muted' as const },
  ];

  return (
    <div className={cn('rounded-md border border-hairline bg-surface-raised', className)}>
      <div className="flex flex-wrap items-stretch">
        {parts.map((part, index) => (
          <div key={part.label} className="flex items-stretch">
            {index > 0 && (
              <span className="flex items-center px-1 text-muted">
                <Plus size={13} strokeWidth={1.5} />
              </span>
            )}
            <div className="px-3 py-3.5">
              <p className="whitespace-nowrap text-[11.5px] text-muted">{part.label}</p>
              <MoneyText amount={part.value} size="sm" tone={part.tone} bare className="mt-0.5 block" />
            </div>
          </div>
        ))}

        <span className="flex items-center px-2 font-mono text-[15px] text-muted">=</span>

        <div className="flex-1 rounded-r-md bg-gradient-to-r from-gold-50 to-gold-50/40 px-4 py-3.5">
          <p className="text-[11.5px] font-medium text-gold-700">Selling price</p>
          <MoneyText amount={result.recommended_price} size="lg" tone="gold" className="mt-0.5 block" />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline bg-surface px-4 py-2.5">
        <p className="text-[12px] text-body">
          Margin{' '}
          <MoneyText amount={result.margin} size="xs" tone="forest" className="mx-0.5" />
          <span className="text-muted">
            · {result.margin_pct.toFixed(1)}% of selling price
          </span>
        </p>
        <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted">
          rounded up to the nearest pula
        </p>
      </div>
    </div>
  );
}
