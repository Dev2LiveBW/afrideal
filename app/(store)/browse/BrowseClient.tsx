'use client';

import { useMemo, useState } from 'react';
import { PackageSearch, Search, X } from 'lucide-react';

import { EmptyState } from '@/components/brand/Panel';
import { GoldButton } from '@/components/brand/GoldButton';
import { ProductCard } from '@/components/products/ProductCard';
import { cn } from '@/lib/utils';
import type { Category, Product, ProductImage } from '@/types';

interface BrowseProduct extends Product {
  supplierCount: number;
  categoryName?: string;
  primarySupplierId?: string;
}

type Sort = 'featured' | 'price-asc' | 'price-desc' | 'rating' | 'newest';

const SORTS: { value: Sort; label: string }[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Best rated' },
  { value: 'newest', label: 'Newest' },
];

export function BrowseClient({
  categories,
  products,
  images,
  initialCategory,
  initialQuery,
}: {
  categories: Category[];
  products: BrowseProduct[];
  images: ProductImage[];
  initialCategory: string;
  initialQuery: string;
}) {
  const [category, setCategory] = useState(initialCategory);
  const [query, setQuery] = useState(initialQuery);
  const [sort, setSort] = useState<Sort>('featured');

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();

    const filtered = products.filter((product) => {
      if (category !== 'all' && product.category_id !== category) return false;
      if (!needle) return true;
      return (
        product.name.toLowerCase().includes(needle) ||
        product.short_description.toLowerCase().includes(needle)
      );
    });

    const sorted = [...filtered];
    switch (sort) {
      case 'price-asc':
        sorted.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        sorted.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        sorted.sort((a, b) => b.rating - a.rating);
        break;
      case 'newest':
        sorted.sort((a, b) => b.created_at.localeCompare(a.created_at));
        break;
      default:
        sorted.sort((a, b) => Number(b.featured) - Number(a.featured) || b.rating - a.rating);
    }

    return sorted;
  }, [products, category, query, sort]);

  const activeCategory = categories.find((entry) => entry.id === category);

  return (
    <>
      <header className="mb-8">
        <p className="eyebrow">Marketplace</p>
        <h1 className="mt-3 font-display text-headline-lg font-semibold text-ink">
          {activeCategory ? activeCategory.name : 'Everything on AfriDeal'}
        </h1>
        <p className="measure mt-2 text-[14px] leading-6 text-body">
          {activeCategory
            ? activeCategory.blurb
            : 'Every listing is carried by at least one verified supplier and settles through escrow.'}
        </p>
      </header>

      {/* Filters */}
      <div className="mb-7 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setCategory('all')}
            className={cn(
              'rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors duration-200',
              category === 'all'
                ? 'bg-ink text-white'
                : 'bg-surface-raised text-body ring-1 ring-inset ring-hairline-strong hover:bg-ink/[0.04] hover:text-ink',
            )}
          >
            All
          </button>

          {categories.map((entry) => (
            <button
              key={entry.id}
              onClick={() => setCategory(entry.id)}
              className={cn(
                'rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors duration-200',
                category === entry.id
                  ? 'bg-ink text-white'
                  : 'bg-surface-raised text-body ring-1 ring-inset ring-hairline-strong hover:bg-ink/[0.04] hover:text-ink',
              )}
            >
              <span aria-hidden="true" className="mr-1.5">
                {entry.emoji}
              </span>
              {entry.name}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 sm:max-w-xs">
            <Search
              size={15}
              strokeWidth={1.5}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search products"
              aria-label="Search products"
              className="w-full rounded-full border border-hairline-strong bg-surface-raised py-2.5 pl-10 pr-9 text-[13.5px] text-ink outline-none transition-colors placeholder:text-muted focus:border-gold/50"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted transition-colors hover:text-ink"
              >
                <X size={14} strokeWidth={1.5} />
              </button>
            )}
          </div>

          <label className="flex items-center gap-2 text-[13px] text-body">
            <span className="whitespace-nowrap">Sort</span>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as Sort)}
              className="rounded-full border border-hairline-strong bg-surface-raised px-3.5 py-2.5 text-[13.5px] text-ink outline-none transition-colors focus:border-gold/50"
            >
              {SORTS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <p className="ml-auto font-mono text-[12px] tabular-nums text-muted">
            {visible.length} of {products.length}
          </p>
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<PackageSearch size={22} strokeWidth={1.5} />}
          title="Nothing matches that"
          description="Try a broader search, or clear the category filter to see the whole catalogue."
          action={
            <GoldButton
              variant="ghost"
              size="sm"
              onClick={() => {
                setQuery('');
                setCategory('all');
              }}
            >
              Clear filters
            </GoldButton>
          }
          className="rounded-md border border-hairline bg-surface-raised"
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {visible.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              supplierCount={product.supplierCount}
              categoryName={product.categoryName}
              primarySupplierId={product.primarySupplierId}
              image={images.find(
                (image) => image.product_id === product.id && image.sort_order === 0,
              )}
              index={index}
            />
          ))}
        </div>
      )}
    </>
  );
}
