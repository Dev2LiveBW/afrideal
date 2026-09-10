import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Popular categories - the one canonical block on the storefront. (TICKET-001)
 *
 * The homepage used to carry this twice: a compact icon grid beside "Choose how
 * you want to buy", and a second full-width `CategoryTiles` rail lower down
 * under the same heading. Two blocks under one name is not a repetition the
 * reader forgives - they read the second as a different set and then find the
 * same trades in it.
 *
 * The heading and the "View all" link live inside the component rather than at
 * the call site, so a future page cannot render the grid under a third wording
 * and re-open the duplicate.
 *
 * The artwork is cut from the product owner's reference board
 * (2026-09-10): each disc is lifted at its own centre and radius, and the
 * strip the label pill covered is filled with the disc's own ground colour.
 * Source board kept out of the repo; regenerate from it if the set changes.
 *
 * The six trades below are the client's reference set. They are a marketing
 * grouping rather than the seeded catalogue taxonomy, so each one links to the
 * catalogue slug that actually holds its stock where there is one, and falls
 * back to the unfiltered catalogue where the platform does not carry that trade
 * yet. `href: '/browse'` on a row is therefore a real open question for the
 * product owner - either the category gets seeded or the tile comes off the
 * grid - not an oversight.
 */

interface CategoryTile {
  name: string;
  href: string;
  img: string;
}

const CATEGORIES: CategoryTile[] = [
  {
    name: 'Beauty & Hair',
    href: '/browse?category=hair-weaves-extensions',
    img: '/images/categories/beauty-hair.jpg',
  },
  {
    name: 'Electronics',
    href: '/browse?category=electronics',
    img: '/images/categories/electronics.jpg',
  },
  {
    name: 'Fashion',
    href: '/browse?category=clothing-uniforms',
    img: '/images/categories/fashion.jpg',
  },
  // No seeded catalogue category yet - see the note above.
  {
    name: 'Home & Kitchen',
    href: '/browse',
    img: '/images/categories/home-kitchen.jpg',
  },
  {
    name: 'Auto Accessories',
    href: '/browse',
    img: '/images/categories/auto-accessories.jpg',
  },
  {
    name: 'Baby & Kids',
    href: '/browse',
    img: '/images/categories/baby-kids.jpg',
  },
];

export function PopularCategories({ className }: { className?: string }) {
  return (
    <section className={cn(className)} aria-labelledby="popular-categories">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 id="popular-categories" className="text-[20px] font-bold text-ink">
          Popular Categories
        </h2>
        <Link
          href="/browse"
          className="inline-flex items-center gap-1 text-[13px] font-bold text-[#E67E22] hover:underline"
        >
          View all
          <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
        </Link>
      </div>

      {/*
        Six across at every width. The set is one row of trades and it stays
        one row on a phone - the tile and the label shrink instead, which is
        what the product owner asked for over letting it reflow into three
        rows and push the listings down the page.
      */}
      <ul className="grid grid-cols-6 gap-x-1.5 gap-y-3 sm:gap-x-4 sm:gap-y-6">
        {CATEGORIES.map((category) => (
          <li key={category.name}>
            <Link
              href={category.href}
              className="group flex flex-col items-center gap-1 text-center outline-none sm:gap-2"
            >
              <div className="relative aspect-square w-full max-w-[96px] overflow-hidden rounded-full bg-surface-sunk ring-1 ring-black/5 transition-all group-hover:ring-[#E67E22]/50 group-focus-visible:ring-2 group-focus-visible:ring-[#E67E22]">
                <Image
                  src={category.img}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 16vw, 96px"
                  className="object-cover object-center transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <span className="text-[8.5px] font-semibold leading-tight text-ink transition-colors group-hover:text-[#E67E22] sm:text-[13px]">
                {category.name}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
