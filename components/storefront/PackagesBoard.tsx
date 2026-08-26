import Link from 'next/link';
import {
  ArrowRight,
  Building2,
  Handshake,
  Package,
  ShoppingBag,
  Store,
} from 'lucide-react';

import { MoneyText } from '@/components/brand/MoneyText';
import { cn } from '@/lib/utils';
import { DOOR_EXAMPLE_QUANTITY, type DoorAccent, type DoorTier, type TierDoor } from '@/lib/tier-doors';

/**
 * The packages board - the five rungs stated in full, one per line.
 *
 * The ladder in the hero argues a descent and compresses each rung to a label
 * and a figure. This is the same five packages doing the other job: telling a
 * reader who has stopped to work out which one is theirs. So each row is given
 * room for the question it actually answers - who buys here, how many units
 * that is, and what one unit costs at that quantity - and the rows are equal in
 * weight, because at this point the reader is choosing rather than being shown
 * a slope.
 *
 * One accent per package, held everywhere the package appears. A buyer who
 * learns that wholesale is the gold one on this board should not have to relearn
 * it on the product page.
 *
 * The figures are real. Every price on this board comes from the same
 * `tier-doors` resolution the checkout uses, priced against a real catalogue
 * product that is named above the board - not an illustration of what a ladder
 * might look like.
 */

const ICONS: Record<DoorTier, typeof ShoppingBag> = {
  RETAIL: ShoppingBag,
  BULK: Package,
  WHOLESALE: Store,
  WHOLESALE_PLUS: Building2,
  CUSTOM: Handshake,
};

/**
 * Accents are written out per surface rather than composed from a colour name,
 * because Tailwind only sees class strings that exist literally in the source.
 */
const ACCENTS: Record<
  DoorAccent,
  { card: string; medallion: string; range: string; badge: string; panel: string }
> = {
  forest: {
    card: 'bg-forest-wash/50 ring-forest/20 hover:ring-forest/35',
    medallion: 'bg-forest text-white',
    range: 'text-forest',
    badge: 'bg-forest-wash text-forest-ink ring-forest/20',
    panel: 'bg-forest-wash/70',
  },
  ocean: {
    card: 'bg-ocean-wash/50 ring-ocean/20 hover:ring-ocean/35',
    medallion: 'bg-ocean text-white',
    range: 'text-ocean',
    badge: 'bg-ocean-wash text-ocean-ink ring-ocean/20',
    panel: 'bg-ocean-wash/70',
  },
  gold: {
    card: 'bg-gold-50/60 ring-gold/25 hover:ring-gold/45',
    medallion: 'bg-gold text-ink',
    range: 'text-gold-dark',
    badge: 'bg-gold-50 text-gold-700 ring-gold/25',
    panel: 'bg-gold-50/80',
  },
  royal: {
    card: 'bg-royal-wash/60 ring-royal/20 hover:ring-royal/35',
    medallion: 'bg-royal text-white',
    range: 'text-royal',
    badge: 'bg-royal-wash text-royal-ink ring-royal/20',
    panel: 'bg-royal-wash/80',
  },
  ink: {
    card: 'bg-surface-raised ring-hairline hover:ring-hairline-strong',
    medallion: 'bg-ink text-white',
    range: 'text-ink',
    badge: 'bg-ink/[0.06] text-ink ring-hairline-strong',
    panel: 'bg-surface-sunk/70',
  },
};

export function PackagesBoard({
  doors,
  productName,
  activeTier,
  className,
}: {
  doors: TierDoor[];
  /** Named once above the board, so every figure below has a subject. */
  productName: string;
  /**
   * The package this visitor is standing on right now. Marked "Your tier"
   * rather than promoted or reordered - the board's whole point is that the
   * other four rungs are open to them the moment they take more units.
   */
  activeTier?: DoorTier | null;
  className?: string;
}) {
  if (doors.length === 0) return null;

  return (
    <div className={cn('space-y-3', className)}>
      {doors.map((door) => (
        <Row
          key={door.tier}
          door={door}
          productName={productName}
          yours={door.tier === activeTier}
        />
      ))}
    </div>
  );
}

function Row({
  door,
  productName,
  yours,
}: {
  door: TierDoor;
  productName: string;
  yours: boolean;
}) {
  const accent = ACCENTS[door.accent];
  const Icon = ICONS[door.tier];
  const quantity = DOOR_EXAMPLE_QUANTITY[door.tier];

  return (
    <Link
      href={door.href}
      aria-label={
        door.byQuotation
          ? `Request a quotation for ${door.range} units of ${productName}`
          : `Shop ${door.label.toLowerCase()} - ${door.range} units of ${productName}`
      }
      className={cn(
        'group flex flex-col gap-4 rounded-lg p-4 ring-1 ring-inset sm:flex-row sm:items-center sm:gap-6 sm:p-5',
        'transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]',
        'hover:-translate-y-0.5 hover:shadow-lift focus-visible:-translate-y-0.5',
        accent.card,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-full sm:h-12 sm:w-12',
          accent.medallion,
        )}
      >
        <Icon size={19} strokeWidth={1.6} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
          <h3 className="font-display text-[17px] font-semibold tracking-[-0.015em] text-ink sm:text-[19px]">
            {door.label}
          </h3>

          {/*
            One chip per row at most. "Your tier" replaces the standing badge
            rather than sitting beside it: two chips on one line would make the
            reader compare the chips instead of the packages.
          */}
          {yours ? (
            <Badge className="bg-forest text-white ring-forest/30">Your tier</Badge>
          ) : (
            door.badge && <Badge className={accent.badge}>{door.badge}</Badge>
          )}
        </div>

        {door.range && (
          <p className={cn('mt-1 font-mono text-[13px] font-medium tabular-nums', accent.range)}>
            {door.range} units
          </p>
        )}

        <p className="measure mt-2 text-[13.5px] leading-6 text-body">{door.blurb}</p>
      </div>

      {/*
        The figure sits in its own tray, tinted to the package's accent. It is
        an example rather than a quotation for this reader's basket, and a tray
        says that in a way a bare numeral on the card ground does not.
      */}
      <div
        className={cn(
          'shrink-0 rounded-md px-4 py-3 sm:w-[168px] sm:text-right',
          accent.panel,
        )}
      >
        {door.unitPrice !== null ? (
          <>
            <p className="text-[11.5px] leading-4 text-muted">Example price</p>
            <p className="mt-1">
              <MoneyText amount={door.unitPrice} size="xl" bare className="text-ink" />
              <span className="ml-1 text-[12px] text-muted">/ unit</span>
            </p>
            <p className="mt-1 font-mono text-[11.5px] tabular-nums text-muted">
              {quantity} {quantity === 1 ? 'unit' : 'units'}
            </p>
          </>
        ) : (
          <>
            <p className="text-[11.5px] leading-4 text-muted">Request a quote</p>
            <p className="mt-2 inline-flex items-center gap-1.5 rounded bg-surface-raised px-3 py-2 text-[13.5px] font-medium text-ink ring-1 ring-inset ring-hairline-strong transition-colors duration-300 group-hover:bg-forest group-hover:text-white group-hover:ring-forest">
              Get a quote
              <ArrowRight
                size={13}
                strokeWidth={1.75}
                aria-hidden="true"
                className="transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0.5"
              />
            </p>
            <p className="mt-2 font-mono text-[11.5px] tabular-nums text-muted">
              {quantity}+ units
            </p>
          </>
        )}
      </div>
    </Link>
  );
}

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'rounded-full px-2.5 py-1 text-[11.5px] font-medium leading-none ring-1 ring-inset',
        className,
      )}
    >
      {children}
    </span>
  );
}
