'use client';

import Link from 'next/link';
import { TrendingDown } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * How far this line is from the next rung down.
 *
 * The ladder's argument only pays off if the buyer is told where they are
 * standing on it, at the moment the quantity is still editable. "Two more and
 * every unit drops to 161.00" is the whole storefront thesis reduced to one
 * actionable sentence, and the cart is the last place it can still change what
 * someone does.
 *
 * Deliberately not a countdown, a bar, or a badge. It is a sentence with a
 * button, because the action it wants is a single quantity change.
 */
export function NextRungNudge({
  unitsAway,
  nextUnitPrice,
  currentUnitPrice,
  locked = false,
  onTake,
  className,
}: {
  unitsAway: number;
  nextUnitPrice: number;
  currentUnitPrice: number;
  /** The rung is published but this account cannot buy at it yet (§7). */
  locked?: boolean;
  /** Bump the line straight to the rung, so the nudge is one click from true. */
  onTake: () => void;
  className?: string;
}) {
  const saving = currentUnitPrice - nextUnitPrice;
  if (unitsAway <= 0 || saving <= 0) return null;

  return (
    <p
      className={cn(
        'flex flex-wrap items-center gap-x-2 gap-y-1 rounded px-3 py-2 text-[12.5px] leading-5',
        locked ? 'bg-gold/[0.1] text-ink' : 'bg-forest-wash text-forest-ink',
        className,
      )}
    >
      <TrendingDown
        size={13}
        strokeWidth={1.75}
        aria-hidden="true"
        className={locked ? 'text-gold-dark' : 'text-forest'}
      />
      <span>
        <span className="font-mono tabular-nums">{unitsAway}</span> more and every unit drops to{' '}
        <span className="font-mono font-semibold tabular-nums">{nextUnitPrice.toFixed(2)}</span>
      </span>

      {/*
        A rung the account cannot reach sends them to the thing that unlocks it
        rather than offering a quantity change that would not get the price.
      */}
      {locked ? (
        <Link
          href="/signup"
          className="font-medium text-gold-dark underline underline-offset-4 transition-colors duration-200 hover:text-ink"
        >
          with an account
        </Link>
      ) : (
        <button
          type="button"
          onClick={onTake}
          className="font-medium text-forest underline underline-offset-4 transition-colors duration-200 hover:text-forest-ink"
        >
          Add {unitsAway}
        </button>
      )}
    </p>
  );
}
