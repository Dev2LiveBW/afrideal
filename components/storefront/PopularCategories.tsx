import Image from 'next/image';
import { LayoutGrid } from 'lucide-react';

import { Floor, Rail, RailCard } from '@/components/storefront/home/Floor';

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
 * Laid out as a floor - the benchmark's home-page unit (§3a): a linked
 * header and a rail of 136px cards. The product owner's artwork is the card
 * photograph; her six labels are the cards' first line. The disc-on-a-grid
 * of the earlier version is what the benchmark's *categories page* does, and
 * that is where it now lives (`/categories`); the home page shows trades the
 * way it shows everything else, on a rail.
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
    <Floor
      id="popular-categories"
      title="Popular Categories"
      subtitle="Shop by what you are buying"
      href="/categories"
      icon={LayoutGrid}
      iconClassName="text-[#E67E22]"
      className={className}
    >
      <Rail>
        {CATEGORIES.map((category) => (
          <RailCard
            key={category.name}
            href={category.href}
            image={
              <Image
                src={category.img}
                alt=""
                fill
                sizes="136px"
                className="object-cover object-center"
              />
            }
            primary={category.name}
            secondary={category.href === '/browse' ? 'Coming soon' : 'Shop the range'}
          />
        ))}
      </Rail>
    </Floor>
  );
}
