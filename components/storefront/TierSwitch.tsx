import Link from 'next/link';
import { FileText } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { DoorAccent, DoorTier } from '@/lib/tier-doors';

export interface TierSwitchOption {
  tier: DoorTier;
  label: string;
  range: string | null;
  byQuotation: boolean;
  /** The package's own colour, so the control agrees with the packages board. */
  accent: DoorAccent;
  href: string;
}

/**
 * Selected states only. An unselected pill stays neutral: five coloured chips
 * in a row would be a palette, not a control, and the reader would have to
 * work out which one is on.
 */
const SELECTED: Record<DoorAccent, string> = {
  forest: 'bg-forest text-white',
  ocean: 'bg-ocean text-white',
  gold: 'bg-gold text-ink',
  royal: 'bg-royal text-white',
  ink: 'bg-ink text-white',
};

/**
 * The rung the catalogue is currently priced at.
 *
 * Rendered as links rather than client state so the choice lives in the URL:
 * a buyer can send someone "the wholesale view", it survives a reload, and it
 * works before hydration. The landing page's packages board and this control
 * are the same decision seen twice, which is why they resolve through one
 * function.
 */
export function TierSwitch({
  options,
  active,
  className,
}: {
  options: TierSwitchOption[];
  /** Null means the default view: whatever the buyer's account already gets. */
  active: DoorTier | null;
  className?: string;
}) {
  return (
    <div
      className={cn('flex flex-wrap items-center gap-1.5', className)}
      role="group"
      aria-label="Price the catalogue by quantity"
    >
      {options.map((option) => {
        const selected = active === option.tier;

        return (
          <Link
            key={option.tier}
            href={option.href}
            aria-current={selected ? 'true' : undefined}
            className={cn(
              'group inline-flex items-baseline gap-2 rounded-full px-4 py-2',
              'transition-[background-color,color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
              selected
                ? SELECTED[option.accent]
                : 'bg-ink/[0.045] text-body hover:bg-ink/[0.08] hover:text-ink',
            )}
          >
            <span className="text-[13px] font-medium">{option.label}</span>

            {option.range && (
              <span
                className={cn(
                  'font-mono text-[11px] tabular-nums',
                  selected
                    ? option.accent === 'gold'
                      ? 'text-ink/60'
                      : 'text-white/55'
                    : 'text-muted',
                )}
              >
                {option.range}
              </span>
            )}

            {option.byQuotation && (
              <FileText
                size={10}
                strokeWidth={2}
                aria-hidden="true"
                className={selected ? 'text-white/70' : 'text-gold-dark'}
              />
            )}
          </Link>
        );
      })}
    </div>
  );
}
