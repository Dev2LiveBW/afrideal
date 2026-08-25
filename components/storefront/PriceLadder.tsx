import Link from 'next/link';
import { ArrowRight, FileText } from 'lucide-react';

import { MoneyText } from '@/components/brand/MoneyText';
import { cn } from '@/lib/utils';
import type { TierDoor } from '@/lib/tier-doors';

/**
 * The three doors, drawn as a ladder.
 *
 * This is the storefront's thesis object, so it is deliberately not three
 * matching cards in a row. On the landing page the rungs step down and to the
 * right, each one wider than the last, because the argument is a descent: the
 * further you go, the less each unit costs. A row of equal cards would state
 * the tiers; the stagger demonstrates them.
 *
 * Two rungs carry a published figure. The third does not - past a hundred
 * units the price depends on the volume, the delivery point and the lead time,
 * so it is quoted. That rung keeps the same geometry and swaps the number for
 * the action that gets one, which is the honest version of the same offer.
 *
 * Two tones, one component. `dark` is the hero instrument on ink; `light` is
 * the same ladder restated on the product page, where it sits inside a column
 * of white panels and must not shout over the buy button. Splitting these into
 * two components is how the two surfaces would drift apart.
 *
 * A rung navigates by default, which is right on the landing page where the
 * rung IS the way into the catalogue. Given `onSelect` it becomes a button and
 * acts on whatever is already on screen instead - on a product page, tapping
 * "Bulk 161.00" should set the quantity to that band, not abandon the product
 * for a filtered grid.
 */

type Tone = 'dark' | 'light';

/**
 * Rungs widen as the price falls, so the cheapest rung is the widest object.
 *
 * Unconditional, not `lg:`-prefixed. The brief that started this redesign was a
 * pair of phone mockups, and a signature geometry that only exists above
 * 1024px does not exist for the reader it was drawn for. The inset is a
 * percentage so the descent scales with whatever column it lands in.
 */
const RUNG_INSET = ['mr-[7%] sm:mr-[12%]', 'mr-[3.5%] sm:mr-[6%]', 'mr-0'];

/**
 * Weight climbs as the price falls.
 *
 * The world's rule is that cheaper rungs carry more weight, and expressing
 * "you cannot buy here yet" as *less* weight ran that rule backwards for the
 * guest the landing page is built for: the two cheapest rungs were the faintest
 * things on it. Reach is now carried by temperature and the lock line alone,
 * and size is carried by depth on the ladder.
 */
const RUNG_SCALE = [
  { label: 'text-[15px] sm:text-[16px]', money: 'md' as const, pad: 'px-5 py-3.5 sm:py-4' },
  { label: 'text-[16px] sm:text-[18px]', money: 'lg' as const, pad: 'px-5 py-4 sm:py-5' },
  { label: 'text-[18px] sm:text-[21px]', money: 'xl' as const, pad: 'px-5 py-5 sm:py-6' },
];

export function PriceLadder({
  doors,
  productName,
  tone = 'dark',
  /** The landing hero staggers; the product column is too narrow to. */
  stagger = true,
  onSelect,
  activeTier,
  className,
}: {
  doors: TierDoor[];
  /** Named once above the ladder so every figure has a subject. */
  productName: string;
  tone?: Tone;
  stagger?: boolean;
  /** Given, rungs act on the current page instead of navigating to one. */
  onSelect?: (door: TierDoor) => void;
  /** The rung the current quantity is standing on. */
  activeTier?: string | null;
  className?: string;
}) {
  return (
    <div className={cn(tone === 'dark' ? 'space-y-2.5' : 'space-y-1.5', className)}>
      {doors.map((door, index) => (
        <Rung
          key={door.tier}
          door={door}
          productName={productName}
          tone={tone}
          scale={RUNG_SCALE[index] ?? RUNG_SCALE[0]}
          inset={stagger ? RUNG_INSET[index] : undefined}
          onSelect={onSelect}
          active={activeTier === door.tier}
        />
      ))}
    </div>
  );
}

function Rung({
  door,
  productName,
  tone,
  scale,
  inset,
  onSelect,
  active,
}: {
  door: TierDoor;
  productName: string;
  tone: Tone;
  scale: (typeof RUNG_SCALE)[number];
  inset?: string;
  onSelect?: (door: TierDoor) => void;
  active?: boolean;
}) {
  const dark = tone === 'dark';
  const priced = door.unitPrice !== null;
  const destination = door.byQuotation ? '/browse?tier=WHOLESALE' : door.href;

  /*
   * A rung that acts is a button; a rung that navigates is a link. The
   * quotation rung always navigates, because what it offers is a conversation,
   * not a quantity this visitor can pick on the spot.
   */
  const acts = Boolean(onSelect) && priced && !door.byQuotation;

  const behaviour: Record<string, unknown> = acts
    ? { type: 'button', onClick: () => onSelect!(door), 'aria-pressed': active }
    : { href: destination };

  const Tag = (acts ? 'button' : Link) as React.ElementType;

  return (
    <Tag
      {...behaviour}
      /*
       * The name follows the behaviour, not the styling. An acting rung is a
       * button that sets a quantity; calling it "Shop retail" told a screen
       * reader it navigates to a catalogue it no longer opens.
       */
      aria-label={
        door.byQuotation
          ? `Request a quotation for ${door.range} units of ${productName}`
          : acts
            ? `Price ${productName} at ${door.range} units - ${door.label.toLowerCase()}`
            : `Shop ${door.label.toLowerCase()} - ${door.range} units of ${productName}`
      }
      className={cn(
        'group relative flex items-center gap-4 rounded-lg text-left',
        // Only a <button> needs to be told to fill its line; a flex <a> is
        // already block-level, and `w-full` on it cancelled the inset that
        // draws the descent.
        acts && 'w-full',
        'transition-[transform,background-color,box-shadow] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]',
        dark
          ? [
              'gap-4 sm:gap-5',
              scale.pad,
              'hover:-translate-y-0.5 focus-visible:-translate-y-0.5',
              // Depth, not pallor, separates a listed rung from a quoted one.
              priced
                ? 'bg-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.10)] hover:bg-white/[0.11]'
                : 'bg-white/[0.045] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:bg-white/[0.075]',
            ]
          : [
              'px-4 py-3',
              active
                ? 'bg-gold/[0.14] ring-1 ring-inset ring-gold/35'
                : priced
                  ? 'bg-ink/[0.035] hover:bg-ink/[0.06]'
                  : 'bg-ink/[0.018] hover:bg-ink/[0.04]',
            ],
        inset,
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2.5">
          <span
            className={cn(
              'font-display font-semibold tracking-[-0.01em]',
              dark ? scale.label : 'text-[14px]',
              dark ? 'text-white' : 'text-ink',
            )}
          >
            {door.label}
          </span>
          {door.range && (
            <span
              className={cn(
                'font-mono text-[11.5px] tabular-nums',
                dark ? 'text-white/75' : 'text-muted',
              )}
            >
              {door.range} units
            </span>
          )}
        </div>

        {dark && (
          <p className="mt-1 hidden text-[12.5px] leading-5 text-white/55 sm:block">
            {door.blurb}
          </p>
        )}
      </div>

      {door.unitPrice !== null && (
        <div className="shrink-0 text-right">
          <MoneyText
            amount={door.unitPrice}
            size={dark ? scale.money : 'sm'}
            tone={dark ? 'white' : 'ink'}
            bare={!dark}
          />

          <p
            className={cn(
              'mt-0.5 font-mono text-[11px] tabular-nums',
              door.savingPerUnit > 0
                ? dark
                  ? 'text-[#8FD69F]'
                  : 'text-forest'
                : dark
                  ? 'text-white/50'
                  : 'text-muted',
            )}
          >
            {door.savingPerUnit > 0 ? `−${door.savingPct.toFixed(0)}% a unit` : 'list price'}
          </p>
        </div>
      )}

      {/*
        The quoted rung. No figure, because there is no published figure to
        show - putting an indicative one here would be the exact thing the
        published ladder exists to avoid.
      */}
      {door.byQuotation && (
        <div className="shrink-0 text-right">
          <p
            className={cn(
              'flex items-center justify-end gap-1.5 font-display font-semibold tracking-[-0.01em]',
              dark ? 'text-[15px] text-white' : 'text-[13.5px] text-ink',
            )}
          >
            <FileText size={dark ? 13 : 12} strokeWidth={1.75} aria-hidden="true" />
            Request a quote
          </p>
          <p
            className={cn('mt-0.5 text-[11px]', dark ? 'text-white/50' : 'text-muted')}
          >
            Priced on volume
          </p>
        </div>
      )}

      {dark && (
        <span
          aria-hidden="true"
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
            'transition-[transform,background-color] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]',
            'group-hover:translate-x-0.5',
            priced
              ? 'bg-gold text-ink group-hover:bg-gold-light'
              : 'bg-white/10 text-white/55 group-hover:bg-white/[0.16]',
          )}
        >
          <ArrowRight size={14} strokeWidth={1.75} />
        </span>
      )}
    </Tag>
  );
}
