'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Layers, ShieldCheck } from 'lucide-react';

import { EmptyState } from '@/components/brand/Panel';
import { MoneyText } from '@/components/brand/MoneyText';
import { StatusBadge } from '@/components/brand/StatusBadge';
import { cn } from '@/lib/utils';
import type { Category, Product } from '@/types';

/**
 * Product grid with client-side category tabs.
 *
 * The full catalogue is fetched once on the server and handed down; switching
 * tabs filters what is already in memory, so there is no reload and no
 * loading flicker between categories.
 */

export interface AdminProduct extends Product {
  supplierCount: number;
  categoryName: string;
}

export function ProductsBoard({
  products,
  categories,
}: {
  products: AdminProduct[];
  categories: Category[];
}) {
  const [active, setActive] = useState<string>('ALL');

  const countFor = (categoryId: string) =>
    categoryId === 'ALL'
      ? products.length
      : products.filter((product) => product.category_id === categoryId).length;

  const filtered = useMemo(
    () => (active === 'ALL' ? products : products.filter((product) => product.category_id === active)),
    [products, active],
  );

  return (
    <div>
      <div className="no-scrollbar mb-5 flex gap-2 overflow-x-auto pb-1">
        <TabButton label={`All (${countFor('ALL')})`} active={active === 'ALL'} onClick={() => setActive('ALL')} />
        {categories.map((category) => (
          <TabButton
            key={category.id}
            label={`${category.emoji} ${category.name} (${countFor(category.id)})`}
            active={active === category.id}
            onClick={() => setActive(category.id)}
          />
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Layers size={20} strokeWidth={1.5} />}
          title="No products in this category"
          description="Try a different category tab, or clear the filter to see the full catalogue."
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((product) => (
            <Link
              key={product.id}
              href={`/admin/products/${product.id}`}
              className="group flex flex-col overflow-hidden rounded-md border border-hairline bg-surface-raised shadow-card transition-shadow duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-lift"
            >
              <div
                className="relative flex aspect-[4/3] items-end justify-end overflow-hidden p-3"
                style={{
                  background: `linear-gradient(140deg, ${product.swatch[0]} 0%, ${product.swatch[1]} 100%)`,
                }}
              >
                <span className="absolute left-3 top-3">
                  <StatusBadge status={product.status} size="sm" />
                </span>
                <span
                  aria-hidden="true"
                  className="select-none text-[46px] leading-none opacity-25 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110"
                >
                  {product.emoji}
                </span>
              </div>

              <div className="flex flex-1 flex-col p-4">
                <p className="eyebrow">{product.categoryName}</p>
                <h3 className="mt-1 text-[14.5px] font-semibold leading-5 text-ink transition-colors group-hover:text-gold-dark">
                  {product.name}
                </h3>

                <div className="mt-2 flex items-center gap-3 text-[11.5px] text-muted">
                  <span className="inline-flex items-center gap-1">
                    <Layers size={12} strokeWidth={1.5} />
                    {product.variants.length} variant{product.variants.length === 1 ? '' : 's'}
                  </span>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1',
                      product.supplierCount > 0 ? 'text-forest' : 'text-danger-ink',
                    )}
                  >
                    <ShieldCheck size={12} strokeWidth={1.5} />
                    {product.supplierCount} verified
                  </span>
                </div>

                <div className="mt-3 flex items-end justify-between border-t border-hairline pt-3">
                  <div>
                    <p className="text-[10.5px] text-muted">Sell price</p>
                    <MoneyText amount={product.price} size="md" tone="gold" />
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted transition-colors group-hover:text-ink">
                    Manage →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-[12.5px] font-medium transition-colors duration-200',
        active
          ? 'bg-ink text-white'
          : 'bg-surface-raised text-body ring-1 ring-inset ring-hairline-strong hover:bg-ink/[0.04]',
      )}
    >
      {label}
    </button>
  );
}
