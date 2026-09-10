import { CreditCard, MapPin, ShieldCheck } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * The service guarantees, as a ribbon. (TICKET-005)
 *
 * This replaces the large boxed `TrustPaymentStrip`: a padded white card with
 * 40px icon discs and a two-line entry per column, which cost roughly 130px of
 * page height to say three things nobody reads twice. The ribbon says the same
 * three things in a single hairline row, and the height it gives back is spent
 * on the supplier and product listings that now sit above the fold.
 *
 * Three columns at every width above `sm`, because the point of the component
 * is that it is one row - stacking it on a phone would rebuild the tall box it
 * was made to remove. Below `sm` the sub-labels drop instead, which keeps the
 * row honest on a 375px screen without wrapping it.
 */

/* One colour per guarantee, matching the product owner's ribbon reference. */
const ITEMS = [
  {
    icon: CreditCard,
    title: 'Multiple Payment Options',
    sub: 'Pay how you like',
    tone: 'bg-blue-50 text-blue-600',
  },
  {
    icon: ShieldCheck,
    title: 'Buyer Protection',
    sub: "We've got you covered",
    tone: 'bg-[#E8F6EE] text-[#1E8449]',
  },
  {
    icon: MapPin,
    title: 'Easy Order Tracking',
    sub: 'Track every step',
    tone: 'bg-[#FDF0E4] text-[#E67E22]',
  },
];

export function InfoRibbon({ className }: { className?: string }) {
  return (
    <div className={cn('mx-auto max-w-market px-4', className)}>
      <ul className="grid grid-cols-3 divide-x divide-hairline rounded-lg border border-hairline bg-surface-raised">
        {ITEMS.map(({ icon: Icon, title, sub, tone }) => (
          <li key={title} className="flex min-w-0 items-center justify-center gap-2.5 px-3 py-2.5">
            <span
              className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', tone)}
            >
              <Icon size={16} strokeWidth={1.9} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold leading-tight text-ink">{title}</p>
              <p className="hidden truncate text-[11.5px] leading-tight text-muted sm:block">{sub}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
