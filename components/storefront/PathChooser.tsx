import Link from 'next/link';
import { ArrowRight, Building2, ShoppingCart, Search } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * The three ways in.
 *
 * The hero argues that the price is published before you commit. That argument
 * only holds for things the suppliers actually stock and at the quantities the
 * ladder publishes, so the moment it lands the page owes the reader the other
 * two doors as well: the runner who goes looking when the catalogue does not
 * carry it, and the quotation desk for volumes past the published rungs.
 *
 * Stated as three doors rather than one primary button with links under it,
 * because they are not a call to action and its afterthoughts - they are three
 * genuinely different transactions. One has a price on the screen; one has a
 * price you are shown before anything is bought; one is answered by a person.
 * Ranking them would tell a visitor who already knows which one they want that
 * they picked wrong.
 *
 * Each door owns one accent, and the same accent follows that path through the
 * rest of the site: forest for the catalogue, gold for sourcing, royal for
 * wholesale. That is the whole reason a third colour was introduced - three
 * doors drawn in two colours make two of them look like the same offer.
 */

type Accent = 'forest' | 'gold' | 'royal';

const ACCENTS: Record<
  Accent,
  { card: string; medallion: string; kicker: string; action: string }
> = {
  forest: {
    card: 'bg-forest-wash/45 ring-forest/15 hover:ring-forest/30',
    medallion: 'bg-forest text-white',
    kicker: 'text-forest',
    action: 'bg-forest text-white group-hover:bg-forest-light',
  },
  gold: {
    card: 'bg-gold-50/60 ring-gold/20 hover:ring-gold/40',
    medallion: 'bg-gold text-ink',
    kicker: 'text-gold-dark',
    action: 'bg-gold text-ink group-hover:bg-gold-light',
  },
  royal: {
    card: 'bg-royal-wash/60 ring-royal/15 hover:ring-royal/30',
    medallion: 'bg-royal text-white',
    kicker: 'text-royal',
    action: 'bg-royal text-white group-hover:bg-royal-light',
  },
};

export function PathChooser({
  productCount,
  className,
}: {
  productCount: number;
  className?: string;
}) {
  return (
    <div className={cn('grid gap-4 md:grid-cols-3 md:gap-5', className)}>
      <Door
        accent="forest"
        icon={<ShoppingCart size={19} strokeWidth={1.6} />}
        kicker="Shop"
        title="From verified suppliers"
        body={
          <>
            Compare prices across{' '}
            <span className="font-mono tabular-nums text-ink">{productCount}</span> listings from
            suppliers we have checked, and buy at the published price.
          </>
        }
        action="Shop now"
        href="/browse"
      />

      <Door
        accent="gold"
        icon={<Search size={19} strokeWidth={1.6} />}
        kicker="Procure"
        title="We find it for you"
        body="Can't find it listed? A verified runner sources it, tells you what it costs, and buys it only once you have said yes."
        action="Request a runner"
        href="/request-a-runner"
      />

      <Door
        accent="royal"
        icon={<Building2 size={19} strokeWidth={1.6} />}
        kicker="Wholesale"
        title="Better prices, bigger value"
        body="Buy at trade quantities from verified suppliers, on published rungs down to fifty units and by quotation above that."
        action="Request a wholesale quote"
        href="/browse?tier=WHOLESALE"
      />
    </div>
  );
}

function Door({
  accent,
  icon,
  kicker,
  title,
  body,
  action,
  href,
}: {
  accent: Accent;
  icon: React.ReactNode;
  kicker: string;
  title: string;
  body: React.ReactNode;
  action: string;
  href: string;
}) {
  const tone = ACCENTS[accent];

  return (
    <Link
      href={href}
      className={cn(
        'group flex min-w-0 flex-col rounded-lg p-5 ring-1 ring-inset sm:p-6',
        'transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]',
        'hover:-translate-y-0.5 hover:shadow-lift focus-visible:-translate-y-0.5',
        tone.card,
      )}
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', tone.medallion)}
        >
          {icon}
        </span>

        <div className="min-w-0">
          <p className={cn('font-display text-[15px] font-bold uppercase tracking-[0.08em]', tone.kicker)}>
            {kicker}
          </p>
          <p className="mt-0.5 text-[13px] font-medium leading-5 text-ink">{title}</p>
        </div>
      </div>

      <p className="mt-4 flex-1 text-[13.5px] leading-6 text-body">{body}</p>

      {/*
        The body takes the slack (`flex-1`) so the three actions sit on one
        baseline however the sentences wrap. The whole panel is the target, so
        this is a label rather than a nested button - a button inside a link is
        a second thing to aim at that does the same job.
      */}
      <p
        className={cn(
          'mt-6 flex items-center justify-between gap-2 rounded px-4 py-3 text-[13.5px] font-medium',
          'transition-colors duration-300',
          tone.action,
        )}
      >
        {action}
        <ArrowRight
          size={14}
          strokeWidth={2}
          aria-hidden="true"
          className="transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0.5"
        />
      </p>
    </Link>
  );
}
