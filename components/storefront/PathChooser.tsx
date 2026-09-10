import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Building2, CheckCircle2, ChevronRight, Package, ShoppingCart } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Choose how you want to buy. (TICKET-003)
 *
 * The one place on the storefront that explains the quantity ladder.
 *
 * It used to be three: these cards, a prose section arguing that "a product
 * does not have one universal price" with the markup falling from 60% to 22%,
 * and a five-rung priced board underneath it. The product owner's note on
 * 2026-09-10 was that the repetition was the problem and the cards are
 * self-explanatory - "you don't need to add a lot of explanations and
 * separations". So the prose and the board are gone and this carries the
 * whole argument.
 *
 * Three doors rather than the ladder's five rungs. The published ladder is
 * 1-4 / 5-19 / 20-49 / 50-99 / 100+, and a buyer standing at the top of the
 * page does not need that resolution - they need to know which of three
 * shapes of buyer they are. The rung inside Bulk or Wholesale is applied at
 * checkout either way, so the simplification costs the reader nothing and is
 * still true.
 *
 * Each card answers "is this me?" before it answers "what does it cost?" - a
 * quantity range on its own tells a salon owner nothing about whether the
 * wholesale door is meant for her.
 */

interface Door {
  key: string;
  title: string;
  band: string;
  blurb: string;
  points: string[];
  cta: string;
  href: string;
  icon: typeof ShoppingCart;
  /** Card ground, icon disc, check colour, button - one accent per door. */
  surface: string;
  disc: string;
  accent: string;
  button: string;
  /**
   * The AfriDeal package render for this door, supplied by the product owner
   * and cut out to transparency so the card's own ground shows through rather
   * than a second, slightly-off rectangle of it.
   */
  image: { src: string; alt: string };
}

const DOORS: Door[] = [
  {
    key: 'retail',
    title: 'Retail',
    band: 'Buy 1 – 4 items',
    blurb: 'Standard everyday prices. Perfect for personal shopping.',
    points: ['No minimum commitment', 'Fast checkout', 'Great for trying products'],
    cta: 'Shop Retail',
    href: '/browse',
    icon: ShoppingCart,
    surface: 'bg-[#FFF6EE]',
    disc: 'bg-[#F5B041]/20',
    accent: 'text-[#D35400]',
    button: 'bg-[#F5B041] text-black hover:bg-[#E9A331]',
    image: { src: '/images/buying/retail-bag.png', alt: 'An AfriDeal paper bag' },
  },
  {
    key: 'bulk',
    title: 'Bulk',
    band: 'Buy 5 – 49 items',
    blurb: 'Lower prices when you buy more.',
    points: ['Tiered pricing', 'Ideal for small businesses', 'Same great quality'],
    cta: 'Buy in Bulk',
    href: '/browse?tier=BULK',
    icon: Package,
    surface: 'bg-forest-wash',
    disc: 'bg-forest/10',
    accent: 'text-forest',
    button: 'bg-forest text-white hover:bg-forest-light',
    image: { src: '/images/buying/bulk-boxes.png', alt: 'Stacked AfriDeal cartons' },
  },
  {
    key: 'wholesale',
    title: 'Wholesale',
    band: 'Buy 50+ items',
    blurb: 'Best prices for large volume orders.',
    points: ['Lowest prices', 'For resellers & organisations', 'Custom quotes available'],
    cta: 'Get Wholesale Prices',
    href: '/browse?tier=WHOLESALE',
    icon: Building2,
    surface: 'bg-royal-wash',
    accent: 'text-royal',
    disc: 'bg-royal/10',
    button: 'bg-royal text-white hover:bg-royal-light',
    image: { src: '/images/buying/wholesale-pallet.png', alt: 'A pallet of AfriDeal cartons' },
  },
];

export function PathChooser({
  className,
  heading = true,
}: {
  className?: string;
  /** The /how-it-works page introduces the cards itself. */
  heading?: boolean;
}) {
  return (
    <section className={cn(className)} aria-labelledby="buying-options">
      {heading && (
        <div className="mb-6">
          <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#27AE60]">
            Buying options
          </p>
          <h2
            id="buying-options"
            className="mt-1 font-display text-[20px] font-bold leading-tight text-ink sm:text-[28px] lg:text-[34px]"
          >
            Choose how you want to buy
          </h2>
          <p className="mt-1 text-[11px] text-muted sm:mt-1.5 sm:text-[14.5px]">
            Same product. Different quantities. Better prices.
          </p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {DOORS.map((door) => {
          const Icon = door.icon;

          return (
            <Link
              key={door.key}
              href={door.href}
              className={cn(
                'group relative flex flex-col overflow-hidden rounded-xl p-2.5 shadow-sm ring-1 ring-black/5 transition-shadow duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-lift sm:rounded-2xl sm:p-5 lg:p-6',
                door.surface,
              )}
            >
              {/* The affordance the reference design puts in the top-right. */}
              <span
                aria-hidden="true"
                className="absolute right-2 top-2 hidden h-7 w-7 items-center justify-center rounded-full bg-white/70 text-body transition-transform duration-300 group-hover:translate-x-0.5 sm:right-4 sm:top-4 sm:flex"
              >
                <ChevronRight size={16} strokeWidth={2} />
              </span>

              <div className="relative z-10 flex flex-1 flex-col">
                <span
                  className={cn(
                    'mb-2 flex h-7 w-7 items-center justify-center rounded-full sm:mb-4 sm:h-11 sm:w-11',
                    door.disc,
                  )}
                >
                  <Icon strokeWidth={1.9} className={cn('h-3.5 w-3.5 sm:h-[21px] sm:w-[21px]', door.accent)} aria-hidden="true" />
                </span>

                <h3 className="font-display text-[14px] font-bold leading-none text-ink sm:text-[20px] lg:text-[24px]">
                  {door.title}
                </h3>
                <p className="mt-1 text-[9.5px] font-bold leading-tight text-ink sm:mt-2 sm:text-[13px] lg:text-[15px]">{door.band}</p>
                <p className="mt-1 max-w-[30ch] text-[8.5px] leading-snug text-muted sm:mt-1.5 sm:text-[12px] sm:leading-5 lg:text-[13.5px] lg:leading-6">
                  {door.blurb}
                </p>

                <ul className="mt-2 space-y-1 sm:mt-4 sm:space-y-2">
                  {door.points.map((point) => (
                    <li key={point} className="flex items-start gap-1 text-[8.5px] leading-tight text-ink sm:items-center sm:gap-2 sm:text-[12px] lg:text-[13.5px]">
                      <CheckCircle2
                        strokeWidth={2}
                        className={cn('h-3 w-3 shrink-0 sm:h-[17px] sm:w-[17px]', door.accent)}
                        aria-hidden="true"
                      />
                      {point}
                    </li>
                  ))}
                </ul>

                <span
                  className={cn(
                    'mt-3 inline-flex h-7 w-full items-center justify-center gap-1 rounded-lg px-1.5 text-[9px] font-bold leading-none transition-colors sm:mt-6 sm:h-11 sm:gap-2 sm:rounded-xl sm:px-4 sm:text-[13px] lg:w-auto lg:self-start lg:px-6 lg:text-[14px]',
                    door.button,
                  )}
                >
                  {door.cta}
                  <ArrowRight strokeWidth={2.25} className="h-2.5 w-2.5 shrink-0 sm:h-4 sm:w-4" aria-hidden="true" />
                </span>
              </div>

              {/*
                The render sits behind the copy and is clipped by the card, so
                the text column keeps its own measure. Hidden below `sm`, where
                the card is narrow enough that the bag would sit under the
                bullet list rather than beside it.
              */}
              <div className="pointer-events-none absolute -bottom-1 right-0 z-0 hidden h-[58%] w-[44%] sm:block">
                <Image
                  src={door.image.src}
                  alt=""
                  fill
                  sizes="(max-width: 1024px) 30vw, 220px"
                  className="object-contain object-right-bottom"
                />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
