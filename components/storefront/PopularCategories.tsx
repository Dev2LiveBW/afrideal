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
    img: 'https://images.unsplash.com/photo-1603878562683-c2149bda665f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400&q=80',
  },
  {
    name: 'Electronics',
    href: '/browse?category=electronics',
    img: 'https://images.unsplash.com/photo-1638803782506-d975a6809f43?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400&q=80',
  },
  {
    name: 'Fashion',
    href: '/browse?category=clothing-uniforms',
    img: 'https://images.unsplash.com/photo-1559050993-d4e4fbf11769?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400&q=80',
  },
  // No seeded catalogue category yet - see the note above.
  {
    name: 'Home & Kitchen',
    href: '/browse',
    img: 'https://images.unsplash.com/photo-1583241475880-083f84372725?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400&q=80',
  },
  {
    name: 'Auto Accessories',
    href: '/browse',
    img: 'https://images.unsplash.com/photo-1691382418385-bbe3cf722388?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400&q=80',
  },
  {
    name: 'Baby & Kids',
    href: '/browse',
    img: 'https://images.unsplash.com/photo-1725328493423-3771b60d02c2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400&q=80',
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
        Three across on a phone would put a 24px circle next to a two-word label
        that then wraps to three lines. Two across below `sm`, six across once
        there is room for the whole set on one row.
      */}
      <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-6">
        {CATEGORIES.map((category) => (
          <li key={category.name}>
            <Link
              href={category.href}
              className="group flex flex-col items-center gap-2 text-center outline-none"
            >
              <div className="relative h-24 w-24 overflow-hidden rounded-full bg-surface-sunk ring-1 ring-black/5 transition-all group-hover:ring-[#E67E22]/50 group-focus-visible:ring-2 group-focus-visible:ring-[#E67E22]">
                <Image
                  src={category.img}
                  alt=""
                  fill
                  sizes="96px"
                  className="object-cover object-center transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <span className="text-[13px] font-semibold text-ink transition-colors group-hover:text-[#E67E22]">
                {category.name}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
