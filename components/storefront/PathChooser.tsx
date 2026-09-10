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
   * TODO(assets): the product owner's reference design puts an AfriDeal-branded
   * package render on the right of each card - a paper bag for Retail, stacked
   * cartons for Bulk, a pallet for Wholesale. Those renders have not been
   * supplied yet, so the slot stays empty and the card lays out without it
   * rather than borrowing an unrelated photograph. Drop the files in
   * /public/images/buying/ and fill this in.
   */
  image?: { src: string; alt: string };
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
            className="mt-1.5 font-display text-[28px] font-bold leading-tight text-ink sm:text-[34px]"
          >
            Choose how you want to buy
          </h2>
          <p className="mt-1.5 text-[14.5px] text-muted">
            Same product. Different quantities. Better prices.
          </p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {DOORS.map((door) => {
          const Icon = door.icon;

          return (
            <Link
              key={door.key}
              href={door.href}
              className={cn(
                'group relative flex flex-col overflow-hidden rounded-2xl p-5 shadow-sm ring-1 ring-black/5 transition-shadow duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-lift sm:p-6',
                door.surface,
              )}
            >
              {/* The affordance the reference design puts in the top-right. */}
              <span
                aria-hidden="true"
                className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-white/70 text-body transition-transform duration-300 group-hover:translate-x-0.5"
              >
                <ChevronRight size={16} strokeWidth={2} />
              </span>

              <div className="relative z-10 flex flex-1 flex-col">
                <span
                  className={cn(
                    'mb-4 flex h-11 w-11 items-center justify-center rounded-full',
                    door.disc,
                  )}
                >
                  <Icon size={21} strokeWidth={1.9} className={door.accent} aria-hidden="true" />
                </span>

                <h3 className="font-display text-[24px] font-bold leading-none text-ink">
                  {door.title}
                </h3>
                <p className="mt-2 text-[15px] font-bold text-ink">{door.band}</p>
                <p className="mt-1.5 max-w-[30ch] text-[13.5px] leading-6 text-muted">
                  {door.blurb}
                </p>

                <ul className="mt-4 space-y-2">
                  {door.points.map((point) => (
                    <li key={point} className="flex items-center gap-2 text-[13.5px] text-ink">
                      <CheckCircle2
                        size={17}
                        strokeWidth={2}
                        className={cn('shrink-0', door.accent)}
                        aria-hidden="true"
                      />
                      {point}
                    </li>
                  ))}
                </ul>

                <span
                  className={cn(
                    'mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-[14px] font-bold transition-colors sm:w-auto sm:self-start sm:px-6',
                    door.button,
                  )}
                >
                  {door.cta}
                  <ArrowRight size={16} strokeWidth={2.25} aria-hidden="true" />
                </span>
              </div>

              {door.image && (
                <div className="pointer-events-none absolute bottom-0 right-0 z-0 h-[62%] w-[46%]">
                  <Image
                    src={door.image.src}
                    alt={door.image.alt}
                    fill
                    sizes="(max-width: 768px) 45vw, 200px"
                    className="object-contain object-bottom"
                  />
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
