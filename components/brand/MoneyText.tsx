import { bwp, bwpBare } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * Every price, total, payout and escrow amount goes through here.
 *
 * Mono with tabular figures so a column of Pula aligns on the decimal without
 * anyone hand-tuning widths, and two decimals always — including on round
 * numbers, because `BWP 1,200` next to `BWP 1,199.50` reads as a typo.
 */

export function MoneyText({
  amount,
  size = 'md',
  tone = 'ink',
  bare = false,
  className,
}: {
  amount: number;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  tone?: 'ink' | 'gold' | 'forest' | 'muted' | 'danger' | 'white';
  /** Drop the BWP prefix when the column header already carries it. */
  bare?: boolean;
  className?: string;
}) {
  const sizes = {
    xs: 'text-[12px]',
    sm: 'text-[13px]',
    md: 'text-[15px]',
    lg: 'text-[19px] tracking-[-0.01em]',
    xl: 'text-[26px] leading-8 tracking-[-0.02em]',
  };

  const tones = {
    ink: 'text-ink',
    gold: 'text-gold-dark',
    forest: 'text-forest',
    muted: 'text-body',
    danger: 'text-danger-ink',
    white: 'text-white',
  };

  return (
    <span
      className={cn(
        'font-mono font-medium tabular-nums',
        sizes[size],
        tones[tone],
        size === 'xl' && 'font-semibold',
        className,
      )}
    >
      {bare ? bwpBare(amount) : bwp(amount)}
    </span>
  );
}
