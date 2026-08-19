'use client';

import { FileText, TrendingDown } from 'lucide-react';

import { MoneyText } from '@/components/brand/MoneyText';
import { GoldButton } from '@/components/brand/GoldButton';
import { TIER_LABELS, bandRange, priceLadder, resolvePrice } from '@/lib/pricing-tiers';
import { cn } from '@/lib/utils';
import type { CustomerPrice, CustomerType, Product } from '@/types';

/**
 * The quantity price ladder (§14/§15/§20).
 *
 * Every rung comes from /data/customer-prices.json through the tier engine.
 * Nothing here computes a discount percentage of its own: §15 requires the
 * values be configurable rather than hard-coded, and a ladder invented in the
 * browser would also disagree with what checkout actually charges.
 *
 * `customerType` is resolved on the server from the session. It is deliberately
 * not a control the shopper can set, because that would be a pricing tier any
 * visitor could award themselves.
 */
export function TieredPriceCalculator({
  product,
  bands,
  customerType,
  quantity,
  onQuantityChange,
  onRequestRfq,
}: {
  product: Product;
  bands: CustomerPrice[];
  customerType: CustomerType;
  quantity: number;
  onQuantityChange: (qty: number) => void;
  onRequestRfq: (qty: number) => void;
}) {
  const ladder = priceLadder(bands, product.id, customerType);
  const resolved = resolvePrice(bands, product, quantity, customerType);

  if (ladder.length <= 1) return null;

  const retailBase = ladder[0]?.unit_price ?? product.price;

  return (
    <div className="mt-5 rounded-md border border-hairline bg-surface-raised p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[14px] font-semibold text-ink">Buy more, pay less</h3>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
          {TIER_LABELS[resolved.tier]} tier
        </span>
      </div>

      <p className="mt-1.5 text-[12.5px] leading-5 text-body">
        Pricing for your account. Bands apply automatically at checkout, so the price you see here is
        the price you are charged.
      </p>

      <ul className="mt-4 space-y-1">
        {ladder.map((band) => {
          const active = resolved.band?.id === band.id;
          const saving = retailBase - band.unit_price;

          return (
            <li key={band.id}>
              <button
                type="button"
                onClick={() => onQuantityChange(Math.max(band.minimum_quantity, 1))}
                className={cn(
                  'flex w-full items-center gap-3 rounded px-3 py-2.5 text-left',
                  'transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]',
                  active
                    ? 'bg-gold-50 ring-1 ring-inset ring-gold/30'
                    : 'hover:bg-ink/[0.03]',
                )}
              >
                <span
                  className={cn(
                    'w-16 shrink-0 font-mono text-[12.5px] tabular-nums',
                    active ? 'font-semibold text-gold-700' : 'text-body',
                  )}
                >
                  {bandRange(band)}
                </span>

                <span
                  className={cn(
                    'flex-1 text-[12px]',
                    active ? 'text-gold-700' : 'text-muted',
                  )}
                >
                  {TIER_LABELS[band.pricing_tier]}
                </span>

                {saving > 0 && (
                  <span className="hidden shrink-0 items-center gap-1 text-[11.5px] text-forest sm:inline-flex">
                    <TrendingDown size={11} strokeWidth={1.75} />
                    save{' '}
                    <span className="font-mono tabular-nums">
                      {((saving / retailBase) * 100).toFixed(0)}%
                    </span>
                  </span>
                )}

                <MoneyText
                  amount={band.unit_price}
                  size="sm"
                  tone={active ? 'gold' : 'ink'}
                  bare
                  className="w-20 shrink-0 text-right"
                />
              </button>
            </li>
          );
        })}
      </ul>

      {resolved.saving_per_unit > 0 && (
        <p className="mt-3 border-t border-hairline pt-3 text-[12.5px] text-forest">
          At {quantity} units you save{' '}
          <MoneyText amount={resolved.saving_per_unit * quantity} size="xs" tone="forest" /> against
          the retail band.
        </p>
      )}

      {resolved.requires_rfq && (
        <div className="mt-4 rounded border border-gold/25 bg-gold-50/70 p-3.5">
          <p className="text-[12.5px] leading-5 text-gold-700">
            Quantities above {ladder[ladder.length - 1]?.maximum_quantity ?? 99} units are priced by
            quotation. We source the volume across verified suppliers and come back with a landed
            price, usually within two working days.
          </p>
          <GoldButton
            variant="gold"
            size="sm"
            className="mt-3"
            icon={<FileText size={14} strokeWidth={1.5} />}
            onClick={() => onRequestRfq(quantity)}
          >
            Request a quotation
          </GoldButton>
        </div>
      )}
    </div>
  );
}
