import Link from 'next/link';
import { ArrowRight, FileText } from 'lucide-react';

import { MoneyText } from '@/components/brand/MoneyText';
import { cn } from '@/lib/utils';
import type { TierDoor } from '@/lib/tier-doors';

/**
 * The three rungs again, on the page ground, as figures you can read across.
 *
 * The hero ladder stacks and staggers because it is arguing a descent. This is
 * the same three doors doing a different job: the section around it is making
 * an arithmetic claim about the whole catalogue, so the rungs are set out side
 * by side where the unit prices line up in a row and can be compared directly
 * rather than followed down a flight.
 *
 * Same data, same `tier-doors` resolution, so the figures here cannot disagree
 * with the ones in the hero. What changes is the reading order, which is the
 * only thing that should change between two statements of one price list.
 *
 * The quotation rung keeps its place in the row and shows no number. It is the
 * third of three published positions, and dropping it to make a tidy pair of
 * priced cards would quietly restate the ladder as something it is not.
 */

export function TierCards({
  doors,
  productName,
  className,
}: {
  doors: TierDoor[];
  /** Named once above the row, so every figure below has a subject. */
  productName: string;
  className?: string;
}) {
  if (doors.length === 0) return null;

  return (
    <div className={className}>
      <p className="text-[12.5px] leading-5 text-muted">
        Priced on <span className="font-medium text-ink">{productName}</span>, per unit.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {doors.map((door) => (
          <Card key={door.tier} door={door} productName={productName} />
        ))}
      </div>
    </div>
  );
}

function Card({ door, productName }: { door: TierDoor; productName: string }) {
  const priced = door.unitPrice !== null;

  return (
    <Link
      href={door.href}
      aria-label={
        door.byQuotation
          ? `Request a quotation for ${door.range} units of ${productName}`
          : `Shop ${door.label.toLowerCase()} — ${door.range} units of ${productName}`
      }
      className={cn(
        'group flex min-w-0 flex-col rounded-lg px-4 py-4 ring-1 ring-inset',
        'transition-[transform,background-color,box-shadow] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]',
        'hover:-translate-y-0.5 hover:shadow-lift focus-visible:-translate-y-0.5',
        // Depth separates a listed rung from a quoted one, matching the ladder.
        priced
          ? 'bg-surface-raised ring-hairline hover:ring-hairline-strong'
          : 'bg-transparent ring-hairline hover:bg-surface-raised',
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-display text-[14px] font-semibold tracking-[-0.01em] text-ink">
          {door.label}
        </span>
        {door.range && (
          <span className="font-mono text-[11px] tabular-nums text-muted">{door.range}</span>
        )}
      </div>

      {/*
        `mt-auto` so the price sits on one baseline across the row even when a
        blurb wraps to a different number of lines in one card than the next.
      */}
      <div className="mt-auto pt-5">
        {door.unitPrice !== null ? (
          <>
            <MoneyText amount={door.unitPrice} size="lg" bare className="text-ink" />
            <p
              className={cn(
                'mt-1 font-mono text-[11px] tabular-nums',
                door.savingPerUnit > 0 ? 'text-forest' : 'text-muted',
              )}
            >
              {door.savingPerUnit > 0
                ? `−${door.savingPct.toFixed(0)}% a unit`
                : 'list price'}
            </p>
          </>
        ) : (
          <>
            <p className="flex items-center gap-1.5 font-display text-[14px] font-semibold tracking-[-0.01em] text-ink">
              <FileText size={13} strokeWidth={1.75} aria-hidden="true" />
              By quotation
            </p>
            <p className="mt-1 text-[11px] text-muted">Priced on volume</p>
          </>
        )}
      </div>

      <p className="mt-3 flex items-center gap-1.5 border-t border-hairline pt-3 text-[12px] font-medium text-gold-dark">
        {door.byQuotation ? 'Request a quote' : `Shop ${door.label.toLowerCase()}`}
        <ArrowRight
          size={12}
          strokeWidth={1.75}
          aria-hidden="true"
          className="transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0.5"
        />
      </p>
    </Link>
  );
}
