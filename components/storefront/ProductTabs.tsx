'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Star } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { Product } from '@/types';

type Tab = 'description' | 'specifications' | 'reviews';

export function ProductTabs({ product }: { product: Product }) {
  const [tab, setTab] = useState<Tab>('description');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'description', label: 'Description' },
    { id: 'specifications', label: 'Specifications' },
    { id: 'reviews', label: `Reviews (${product.review_count})` },
  ];

  // The first three specs double as the highlight list, so the two views stay
  // consistent rather than carrying separately maintained copy.
  const highlights = product.specs.slice(0, 3);

  return (
    <section className="mt-12">
      <div role="tablist" className="flex gap-6 border-b border-hairline">
        {tabs.map((entry) => (
          <button
            key={entry.id}
            role="tab"
            aria-selected={tab === entry.id}
            onClick={() => setTab(entry.id)}
            className={cn(
              'relative -mb-px whitespace-nowrap pb-3 text-[14px] font-medium transition-colors duration-200',
              tab === entry.id ? 'text-ink' : 'text-body hover:text-ink',
            )}
          >
            {entry.label}
            {/*
              One shared underline that travels between tabs rather than a
              border fading in and out. The movement is what tells you the two
              are the same control in different states.
            */}
            {tab === entry.id && (
              <motion.span
                layoutId="product-tab-underline"
                transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-gold"
              />
            )}
          </button>
        ))}
      </div>

      {/*
        `mode="wait"` so the outgoing panel clears before the next arrives.
        Crossfading them overlaps two different content heights and the section
        jumps; waiting costs 140ms and the layout stays still.
      */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          role="tabpanel"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          className="pt-6"
        >
          {tab === 'description' && (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
            <div>
              <h3 className="font-display text-[19px] font-semibold text-ink">
                What you are buying
              </h3>
              <p className="measure mt-3 text-[15px] leading-8 text-body">{product.description}</p>

              <ul className="mt-5 space-y-2.5">
                {highlights.map((spec) => (
                  <li key={spec.label} className="flex items-start gap-2.5 text-[13.5px]">
                    <Check size={15} strokeWidth={2} className="mt-0.5 shrink-0 text-forest" />
                    <span className="text-body">
                      <span className="font-medium text-ink">{spec.label}:</span> {spec.value}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div
              className="relative hidden overflow-hidden rounded-lg p-6 lg:block"
              style={{
                background: `linear-gradient(150deg, ${product.swatch[0]} 0%, ${product.swatch[1]} 100%)`,
              }}
            >
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/80 to-transparent p-5">
                <p className="text-[15px] font-semibold text-white">Backed by escrow</p>
                <p className="mt-1 text-[12.5px] leading-5 text-white/70">
                  Your payment is held until you confirm this arrived and is what you ordered.
                </p>
              </div>
            </div>
          </div>
        )}

        {tab === 'specifications' && (
          <dl className="max-w-2xl overflow-hidden rounded-md border border-hairline bg-surface-raised">
            {product.specs.map((spec, index) => (
              <div
                key={spec.label}
                className={cn(
                  'flex items-baseline justify-between gap-6 px-5 py-3.5',
                  index % 2 === 1 && 'bg-[rgba(23,26,24,0.015)]',
                )}
              >
                <dt className="text-[13.5px] text-body">{spec.label}</dt>
                <dd className="text-right font-mono text-[13.5px] tabular-nums text-ink">
                  {spec.value}
                </dd>
              </div>
            ))}
            {product.country_of_origin && (
              <div className="flex items-baseline justify-between gap-6 border-t border-hairline px-5 py-3.5">
                <dt className="text-[13.5px] text-body">Country of origin</dt>
                <dd className="font-mono text-[13.5px] text-ink">{product.country_of_origin}</dd>
              </div>
            )}
          </dl>
        )}

        {tab === 'reviews' && (
          <div className="max-w-2xl">
            <div className="flex items-center gap-6 rounded-md border border-hairline bg-surface-raised px-5 py-4">
              <div className="text-center">
                <p className="font-mono text-[32px] font-semibold leading-none tabular-nums text-ink">
                  {product.rating.toFixed(1)}
                </p>
                <div className="mt-1.5 flex justify-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={12}
                      strokeWidth={1.5}
                      className={
                        star <= Math.round(product.rating)
                          ? 'fill-gold text-gold'
                          : 'text-hairline-strong'
                      }
                    />
                  ))}
                </div>
              </div>

              <div className="min-w-0 flex-1 space-y-1.5">
                {[5, 4, 3, 2, 1].map((star) => {
                  const weight = Math.max(0, 1 - Math.abs(star - product.rating) / 2.2);
                  return (
                    <div key={star} className="flex items-center gap-2.5">
                      <span className="w-3 font-mono text-[11px] tabular-nums text-muted">
                        {star}
                      </span>
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/[0.07]">
                        <span
                          className="block h-full rounded-full bg-gold"
                          style={{ width: `${Math.round(weight * 100)}%` }}
                        />
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <p className="mt-3 text-[11.5px] leading-5 text-muted">
              Aggregated from {product.review_count.toLocaleString('en-GB')} verified purchases. Only
              buyers whose escrow released against this product can review it. The per-star
              distribution is derived from the overall score rather than stored per review, so
              individual reviews are not shown.
            </p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
