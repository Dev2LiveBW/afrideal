'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

import { ProductCard } from '@/components/products/ProductCard';
import { PromoCarousel, type Promo } from '@/components/storefront/home/PromoCarousel';
import { cn } from '@/lib/utils';
import type { Category, Product, ProductImage } from '@/types';

/**
 * The chips, the floors and the feed - the part of the home page that the
 * benchmark runs as one screen. docs/design/alibaba-benchmark.md §3a.
 *
 * On Alibaba's buyer home the chip row under the tabs is not a set of links:
 * tapping a trade swaps the page under it in place - the floors go, that
 * trade's catalogue takes their place, the 3px bar slides under the chip -
 * and `All` brings the floors back. The URL never changes. That is what this
 * does. The floors arrive as `children` (they are server components with
 * their own data), and are simply not rendered while a trade is selected.
 *
 * The feed itself is the benchmark's 2-column catalogue grid (§1b), loaded
 * in batches under a spinner as the reader reaches the foot, with the promo
 * carousel in the first slot - both as measured on the live page.
 */

export interface FeedProduct extends Product {
  supplierCount: number;
  image?: ProductImage;
  categoryName?: string;
  primarySupplierId: string;
}

export function HomeCatalogue({
  categories,
  products,
  promos,
  children,
}: {
  categories: Category[];
  products: FeedProduct[];
  promos: Promo[];
  /** The floors shown under `All`. */
  children: React.ReactNode;
}) {
  const [active, setActive] = useState('all');

  const activeCategory = categories.find((category) => category.id === active);
  const feed = active === 'all' ? products : products.filter((p) => p.category_id === active);

  return (
    <>
      <CategoryChips categories={categories} active={active} onSelect={setActive} />

      {active === 'all' && children}

      <Feed
        key={active}
        items={feed}
        title={activeCategory?.name ?? 'Just for you'}
        promos={active === 'all' ? promos : undefined}
      />
    </>
  );
}

/* ───────────────────────── Chips ───────────────────────── */

/**
 * Benchmark §3a, chip row: 45px on `#f8f8f8` with a `#f5f5f5` hairline
 * under it; chips 13px with 8px either side, the active one bold; a 3px
 * `#222` bar with 4px radius under the active chip that *slides* there
 * (`transition: left .2s, width .2s`); a 16px blur where the row runs under
 * the right edge; and a 36px chevron that opens the full set as a sheet.
 */
function CategoryChips({
  categories,
  active,
  onSelect,
}: {
  categories: Category[];
  active: string;
  onSelect: (id: string) => void;
}) {
  const chips = [{ id: 'all', name: 'All' }, ...categories.map(({ id, name }) => ({ id, name }))];

  const [open, setOpen] = useState(false);
  const [bar, setBar] = useState({ left: 12, width: 17 });
  const [sheetTop, setSheetTop] = useState(0);

  const rowRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // The bar follows the active chip; the row scrolls it into view.
  useLayoutEffect(() => {
    const chip = chipRefs.current[active];
    const scroller = scrollerRef.current;
    if (!chip || !scroller) return;

    setBar({ left: chip.offsetLeft, width: chip.offsetWidth });

    const left = chip.offsetLeft - 12;
    const right = chip.offsetLeft + chip.offsetWidth + 12;
    if (left < scroller.scrollLeft) scroller.scrollTo({ left, behavior: 'smooth' });
    else if (right > scroller.scrollLeft + scroller.clientWidth) {
      scroller.scrollTo({ left: right - scroller.clientWidth, behavior: 'smooth' });
    }
  }, [active]);

  // Re-measure if the row's width changes under the bar.
  useEffect(() => {
    const onResize = () => {
      const chip = chipRefs.current[active];
      if (chip) setBar({ left: chip.offsetLeft, width: chip.offsetWidth });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [active]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  function toggle() {
    if (!open && rowRef.current) {
      setSheetTop(Math.max(0, rowRef.current.getBoundingClientRect().bottom));
    }
    setOpen((value) => !value);
  }

  function pick(id: string) {
    onSelect(id);
    setOpen(false);
  }

  return (
    <div ref={rowRef} className="relative z-30 border-b border-[#f5f5f5] bg-[#f8f8f8]">
      <div className="mx-auto flex h-[45px] max-w-market items-stretch">
        <div ref={scrollerRef} className="no-scrollbar min-w-0 flex-1 overflow-x-auto px-1">
          <div className="relative flex h-11 w-max items-center">
            {chips.map((chip) => {
              const isActive = chip.id === active;
              return (
                <button
                  key={chip.id}
                  ref={(element) => {
                    chipRefs.current[chip.id] = element;
                  }}
                  type="button"
                  onClick={() => pick(chip.id)}
                  aria-pressed={isActive}
                  className={cn(
                    'press-soft mx-2 shrink-0 whitespace-nowrap text-[13px] leading-[19px] text-[#222] outline-none',
                    isActive && 'font-bold',
                  )}
                >
                  {chip.name}
                </button>
              );
            })}
            <span
              aria-hidden="true"
              className="absolute bottom-0 h-[3px] rounded-[4px] bg-[#222] transition-[left,width] duration-200"
              style={{ left: bar.left, width: bar.width }}
            />
          </div>
        </div>

        {/* The fade under the right edge, and the door to the whole set. */}
        <div className="relative w-9 shrink-0">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -left-4 top-1.5 h-8 w-4 bg-gradient-to-r from-white/50 to-[#f8f8f8]"
          />
          <button
            type="button"
            onClick={toggle}
            aria-expanded={open}
            aria-label={open ? 'Close categories' : 'All categories'}
            className="flex h-11 w-9 items-center justify-center bg-[#f8f8f8] outline-none"
          >
            <ChevronDown
              size={20}
              strokeWidth={2}
              className="text-[#222] transition-transform duration-300 ease-in-out"
              style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
            />
          </button>
        </div>
      </div>

      {/*
        The sheet. Benchmark §4b: the mask fades to 36% black in .18s, the
        panel drops from under the chip row in .22s on cubic-bezier(.22,.61,.36,1)
        and leaves in .18s on cubic-bezier(.4,0,1,1).
      */}
      <AnimatePresence>
        {open && (
          <div
            className="fixed inset-x-0 bottom-0 z-40 overflow-hidden"
            style={{ top: sheetTop }}
            role="dialog"
            aria-label="All categories"
          >
            <motion.button
              type="button"
              aria-label="Close"
              onClick={() => setOpen(false)}
              initial={{ backgroundColor: 'rgba(0,0,0,0)' }}
              animate={{
                backgroundColor: 'rgba(0,0,0,0.36)',
                transition: { duration: 0.18, ease: 'easeOut' },
              }}
              exit={{ backgroundColor: 'rgba(0,0,0,0)', transition: { duration: 0.18, ease: 'easeIn' } }}
              className="absolute inset-0 block h-full w-full cursor-default"
            />
            <motion.div
              initial={{ y: '-100%' }}
              animate={{ y: 0, transition: { duration: 0.22, ease: [0.22, 0.61, 0.36, 1] } }}
              exit={{ y: '-100%', transition: { duration: 0.18, ease: [0.4, 0, 1, 1] } }}
              className="absolute inset-x-0 top-0 rounded-b-[12px] bg-surface-raised px-3 pb-4 pt-3 shadow-[0_8px_24px_rgba(0,0,0,0.12)] will-change-transform sm:px-4"
            >
              <div className="mx-auto max-w-market">
                <p className="text-[13px] font-bold text-[#222]">All categories</p>
                <ul className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                  {chips.map((chip) => {
                    const isActive = chip.id === active;
                    return (
                      <li key={chip.id}>
                        <button
                          type="button"
                          onClick={() => pick(chip.id)}
                          aria-pressed={isActive}
                          className={cn(
                            'press-soft line-clamp-2 flex h-[38px] w-full items-center justify-center rounded-[4px] px-1.5 text-center text-[12px] leading-[14px] outline-none',
                            isActive ? 'bg-[#222] font-bold text-white' : 'bg-[#f4f4f4] text-[#222]',
                          )}
                        >
                          {chip.name}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ───────────────────────── Feed ───────────────────────── */

const BATCH = 8;

/**
 * Benchmark §1b/§3a: white, 12px margins, two 179px columns with an 8px
 * gutter and 8px between rows, the promo carousel in the first slot, and
 * more rows appearing under a spinner as the foot comes into view. Nothing
 * animates in - the cards are simply there, which is the benchmark's rule
 * for lists (§4).
 */
function Feed({
  items,
  title,
  promos,
}: {
  items: FeedProduct[];
  title: string;
  promos?: Promo[];
}) {
  const [shown, setShown] = useState(BATCH);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const more = shown < items.length;

  /*
   * Re-armed after every batch: an observer only reports *changes* in
   * intersection, and a sentinel still on screen after a batch mounts
   * would otherwise never fire again.
   */
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !more) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setShown((value) => Math.min(value + BATCH, items.length));
      },
      { rootMargin: '160px 0px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [shown, more, items.length]);

  return (
    <section className="bg-surface-raised px-3 pb-2 pt-3 sm:px-4" aria-labelledby="home-feed">
      <div className="mx-auto max-w-market">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="home-feed" className="font-sans text-[16px] font-bold leading-5 tracking-normal text-[#222]">
            {title}
          </h2>
          <p className="text-[11px] text-[#767676]">
            <span className="font-mono tabular-nums">{items.length}</span>{' '}
            {items.length === 1 ? 'product' : 'products'}
          </p>
        </div>

        {items.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-[#767676]">Nothing listed in this category yet.</p>
        ) : (
          <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-2 sm:grid-cols-3 sm:gap-x-4 sm:gap-y-5 lg:grid-cols-4 xl:grid-cols-5">
            {promos && promos.length > 0 && <PromoCarousel promos={promos} />}
            {items.slice(0, shown).map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                supplierCount={product.supplierCount}
                image={product.image}
                categoryName={product.categoryName}
                primarySupplierId={product.primarySupplierId}
              />
            ))}
          </div>
        )}

        <div ref={sentinelRef} aria-hidden="true" className="h-px" />

        {/* Benchmark §4b: a 48px row with a one-second spin, 20px under it. */}
        {more && (
          <div className="mb-5 flex h-12 items-center justify-center" role="status" aria-label="Loading more">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#E67E22] border-t-transparent" />
          </div>
        )}
      </div>
    </section>
  );
}
