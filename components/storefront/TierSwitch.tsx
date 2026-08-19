import Link from 'next/link';
import { Lock } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { DoorTier } from '@/lib/tier-doors';

export interface TierSwitchOption {
  tier: DoorTier;
  label: string;
  range: string | null;
  locked: boolean;
  href: string;
}

/**
 * The rung the catalogue is currently priced at.
 *
 * Rendered as links rather than client state so the choice lives in the URL:
 * a buyer can send someone "the wholesale view", it survives a reload, and it
 * works before hydration. The landing page's three doors and this control are
 * the same decision seen twice, which is why they resolve through one function.
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
                ? 'bg-ink text-white'
                : 'bg-ink/[0.045] text-body hover:bg-ink/[0.08] hover:text-ink',
            )}
          >
            <span className="text-[13px] font-medium">{option.label}</span>

            {option.range && (
              <span
                className={cn(
                  'font-mono text-[11px] tabular-nums',
                  selected ? 'text-white/50' : 'text-muted',
                )}
              >
                {option.range}
              </span>
            )}

            {option.locked && (
              <Lock
                size={10}
                strokeWidth={2}
                aria-hidden="true"
                className={selected ? 'text-gold-light' : 'text-gold-dark'}
              />
            )}
          </Link>
        );
      })}
    </div>
  );
}
