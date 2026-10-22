'use client';

import { useBuyerCurrency } from '@/components/brand/BuyerCurrency';
import { BASE_CURRENCY, fromPula, moneyLong, moneyTag } from '@/lib/currency.mjs';
import { bwpBare } from '@/lib/format';
import type { CurrencyCode } from '@/types';

/*
 * Spec 0009: amounts are pula. Inside the storefront they show in the
 * shopper's currency (converted); pass `currency` when the amount is already
 * in a given currency, as an order's are. Console screens sit outside the
 * storefront's provider and show pula.
 */
function useShown(amount: number, currency?: CurrencyCode): { value: number; currency: CurrencyCode } {
  const buyer = useBuyerCurrency();
  if (currency) return { value: amount, currency };
  const shown = buyer ?? BASE_CURRENCY;
  return { value: fromPula(amount, shown), currency: shown };
}
import { cn } from '@/lib/utils';

/**
 * Every price, total, payout and invoice amount goes through here.
 *
 * Mono with tabular figures so a column of Pula aligns on the decimal without
 * anyone hand-tuning widths, and two decimals always - including on round
 * numbers, because `BWP 1,200` next to `BWP 1,199.50` reads as a typo.
 */

/**
 * The storefront shelf tag: `P399`, sized for a phone.
 *
 * Deliberately a separate component from MoneyText rather than a prop on it,
 * so nothing that settles money — a receipt, an escrow leg, a payout — can
 * pick up the shortened form by accident.
 */
export function PriceTag({
  amount,
  size = 'md',
  tone = 'ink',
  currency,
  className,
}: {
  amount: number;
  /** Set when `amount` is already in this currency (an order's amounts). */
  currency?: CurrencyCode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  tone?: 'ink' | 'gold' | 'forest' | 'white' | 'muted';
  className?: string;
}) {
  const shown = useShown(amount, currency);
  const sizes = {
    sm: 'text-[14px]',
    md: 'text-[17px]',
    lg: 'text-[22px] tracking-[-0.01em]',
    xl: 'text-[30px] leading-9 tracking-[-0.02em]',
  };

  const tones = {
    ink: 'text-ink',
    gold: 'text-gold-dark',
    forest: 'text-forest',
    white: 'text-white',
    muted: 'text-body',
  };

  return (
    <span
      className={cn('font-display font-bold tabular-nums', sizes[size], tones[tone], className)}
    >
      {moneyTag(shown.value, shown.currency)}
    </span>
  );
}

export function MoneyText({
  amount,
  size = 'md',
  tone = 'ink',
  bare = false,
  currency,
  className,
}: {
  amount: number;
  /** Set when `amount` is already in this currency (an order's amounts). */
  currency?: CurrencyCode;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  tone?: 'ink' | 'gold' | 'forest' | 'muted' | 'danger' | 'white';
  /** Drop the BWP prefix when the column header already carries it. */
  bare?: boolean;
  className?: string;
}) {
  const shown = useShown(amount, currency);
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
      {bare ? bwpBare(shown.value) : moneyLong(shown.value, shown.currency)}
    </span>
  );
}
