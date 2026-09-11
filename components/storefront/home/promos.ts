import type { Promo } from '@/components/storefront/home/PromoCarousel';

/**
 * The posters in the home feed's promo slot. These were the three
 * `PromoCards`; same copy, same routes. The pictures are the product
 * owner's own package renders rather than the Unsplash stock the cards
 * carried - those URLs had gone dead, and a poster with a broken image is
 * worse than no poster. The "Become a supplier" poster is
 * the one place on the front page that still points at supplier sign-up -
 * see the TICKET-006 note in app/(store)/page.tsx before moving it.
 */
export const HOME_PROMOS: Promo[] = [
  {
    key: 'new',
    eyebrow: 'New arrivals',
    headline: 'Fresh products added daily.',
    cta: 'Explore now',
    href: '/browse',
    image: '/images/buying/retail-bag.png',
    surface: 'bg-white',
    accent: 'text-[#27AE60]',
    button: 'bg-[#27AE60] text-white',
  },
  {
    key: 'top',
    eyebrow: 'Top rated',
    headline: 'Shop the most loved products.',
    cta: 'Shop now',
    href: '/browse',
    image: '/images/buying/bulk-boxes.png',
    surface: 'bg-[#F0EEFF]',
    accent: 'text-[#7C3AED]',
    button: 'bg-[#7C3AED] text-white',
  },
  {
    key: 'supplier',
    eyebrow: 'Become a supplier',
    headline: 'Grow with thousands of buyers.',
    cta: 'Join AfriDeal',
    href: '/signup',
    image: '/images/buying/wholesale-pallet.png',
    surface: 'bg-[#FFF6EE]',
    accent: 'text-[#E67E22]',
    button: 'bg-[#E67E22] text-white',
  },
];
