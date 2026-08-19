/**
 * Money and date formatting.
 *
 * DESIGN.md is explicit: currency renders as `BWP 12,450.00` — code first,
 * space, tabular figures, two decimals always, even on round numbers. Pair
 * every one of these with `font-mono tabular-nums` so columns align.
 */

const pula = new Intl.NumberFormat('en-BW', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** `BWP 12,450.00` */
export function bwp(amount: number): string {
  return `BWP ${pula.format(amount)}`;
}

export function formatBWP(amount: number): string {
  return bwp(amount);
}

/** `12,450.00` — when the BWP code is already in the label above. */
export function bwpBare(amount: number): string {
  return pula.format(amount);
}

/** `BWP 12.4k` — for chart axes and dense stat strips only. */
export function bwpCompact(amount: number): string {
  if (Math.abs(amount) >= 1_000_000) return `BWP ${(amount / 1_000_000).toFixed(1)}m`;
  if (Math.abs(amount) >= 1_000) return `BWP ${(amount / 1_000).toFixed(1)}k`;
  return `BWP ${amount.toFixed(0)}`;
}

export function pct(value: number, dp = 1): string {
  return `${value.toFixed(dp)}%`;
}

/** `7 Jul 2026` */
export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** `7 Jul 2026, 14:32` */
export function dateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** `3 days ago`, `in 2 days`, `just now`. */
export function relative(iso: string, now: Date = new Date()): string {
  const deltaMs = new Date(iso).getTime() - now.getTime();
  const deltaMin = Math.round(deltaMs / 60_000);
  const abs = Math.abs(deltaMin);

  if (abs < 1) return 'just now';

  const units: [limit: number, size: number, name: Intl.RelativeTimeFormatUnit][] = [
    [60, 1, 'minute'],
    [24 * 60, 60, 'hour'],
    [30 * 24 * 60, 24 * 60, 'day'],
    [365 * 24 * 60, 30 * 24 * 60, 'month'],
    [Number.POSITIVE_INFINITY, 365 * 24 * 60, 'year'],
  ];

  const [, size, name] = units.find(([limit]) => abs < limit)!;
  const formatter = new Intl.RelativeTimeFormat('en-GB', { numeric: 'auto' });
  return formatter.format(Math.round(deltaMin / size), name);
}

/** Whole days between now and an ISO date. Negative once overdue. */
export function daysUntil(iso: string, now: Date = new Date()): number {
  const ms = new Date(iso).getTime() - now.getTime();
  return Math.floor(ms / 86_400_000);
}

/** Whole days a value has been sitting. */
export function daysSince(iso: string, now: Date = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000));
}

/**
 * SLA countdown colour. DESIGN.md §2: green above five days, amber between two
 * and five, red under two. The one place colour escalates as a countdown.
 */
export function slaTone(daysLeft: number): 'ok' | 'warn' | 'critical' {
  if (daysLeft >= 5) return 'ok';
  if (daysLeft >= 2) return 'warn';
  return 'critical';
}

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

/** `IN_TRANSIT` → `In transit` */
export function humanise(token: string): string {
  const lower = token.replace(/_/g, ' ').toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export const PAYMENT_LABELS: Record<string, string> = {
  DPO_PAY: 'DPO Pay',
  ORANGE_MONEY: 'Orange Money',
  PAYGATE: 'PayGate',
};
