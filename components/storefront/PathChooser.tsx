import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronRight,
  Package,
  ShoppingBag,
  ShoppingCart,
} from 'lucide-react';

import { Floor } from '@/components/storefront/home/Floor';
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
 *
 * Two layouts. `grid` is the three cards side by side, for /how-it-works.
 * `floor` is the home page's: the benchmark's floor grammar (§3a) - a linked
 * header, then the three cards on a rail at a fixed width, so on a phone
 * they scroll past like every other floor rather than stacking into a
 * column three screens tall.
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

function DoorCard({ door, compact }: { door: Door; compact: boolean }) {
  const Icon = door.icon;

  return (
    <Link
      href={door.href}
      className={cn(
        'press-soft group relative flex h-full flex-col overflow-hidden rounded-2xl shadow-sm ring-1 ring-black/5 transition-shadow duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-lift',
        compact ? 'p-4' : 'p-5 sm:p-6',
        door.surface,
      )}
    >
      {/* The affordance the reference design puts in the top-right. */}
      <span
        aria-hidden="true"
        className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/70 text-body transition-transform duration-300 group-hover:translate-x-0.5"
      >
        <ChevronRight size={16} strokeWidth={2} />
      </span>

      <div className="relative z-10 flex flex-1 flex-col">
        <span
          className={cn(
            'flex items-center justify-center rounded-full',
            compact ? 'mb-3 h-9 w-9' : 'mb-4 h-11 w-11',
            door.disc,
          )}
        >
          <Icon size={compact ? 18 : 21} strokeWidth={1.9} className={door.accent} aria-hidden="true" />
        </span>

        <h3
          className={cn(
            'font-display font-bold leading-none text-ink',
            compact ? 'text-[20px]' : 'text-[24px]',
          )}
        >
          {door.title}
        </h3>
        <p className={cn('font-bold text-ink', compact ? 'mt-1.5 text-[13px]' : 'mt-2 text-[15px]')}>
          {door.band}
        </p>
        <p
          className={cn(
            'max-w-[30ch] text-muted',
            compact ? 'mt-1 text-[12px] leading-5' : 'mt-1.5 text-[13.5px] leading-6',
          )}
        >
          {door.blurb}
        </p>

        {/* In the rail card the list stops short of the render's column. */}
        <ul className={cn(compact ? 'mt-3 max-w-[72%] space-y-1.5' : 'mt-4 space-y-2')}>
          {door.points.map((point) => (
            <li
              key={point}
              className={cn('flex items-center gap-2 text-ink', compact ? 'text-[12px]' : 'text-[13.5px]')}
            >
              <CheckCircle2
                size={compact ? 15 : 17}
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
            'inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 font-bold transition-colors',
            compact
              ? 'mt-4 h-9 text-[12.5px] sm:w-auto sm:self-start'
              : 'mt-6 h-11 text-[14px] sm:w-auto sm:self-start sm:px-6',
            door.button,
          )}
        >
          {door.cta}
          <ArrowRight size={compact ? 14 : 16} strokeWidth={2.25} aria-hidden="true" />
        </span>
      </div>

      {/*
        The render sits behind the copy and is clipped by the card, so the
        text column keeps its own measure. In the grid it is hidden below
        `sm`, where the card is narrow enough that the bag would sit under
        the bullet list rather than beside it; the rail card is a fixed
        width, so it always has room.
      */}
      <div
        className={cn(
          'pointer-events-none absolute -bottom-1 right-0 z-0',
          compact ? 'h-[44%] w-[38%]' : 'hidden h-[58%] w-[44%] sm:block',
        )}
      >
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
}

export function PathChooser({
  className,
  heading = true,
  variant = 'grid',
}: {
  className?: string;
  /** The /how-it-works page introduces the cards itself. */
  heading?: boolean;
  variant?: 'grid' | 'floor';
}) {
  if (variant === 'floor') {
    return (
      <Floor
        id="buying-options"
        title="Choose how you want to buy"
        subtitle="Same product. Different quantities. Better prices."
        href="/how-it-works"
        icon={ShoppingBag}
        iconClassName="text-[#27AE60]"
        className={className}
      >
        <ul className="no-scrollbar flex gap-2 overflow-x-auto px-3 pb-3 pt-2 sm:px-4 md:grid md:grid-cols-3 md:overflow-visible">
          {DOORS.map((door) => (
            <li key={door.key} className="w-[250px] shrink-0 md:w-auto">
              <DoorCard door={door} compact />
            </li>
          ))}
        </ul>
      </Floor>
    );
  }

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
        {DOORS.map((door) => (
          <DoorCard key={door.key} door={door} compact={false} />
        ))}
      </div>
    </section>
  );
}
