import { CreditCard, MapPin, Package, ShieldCheck, Truck, Users } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * The service guarantees, as a ribbon. (TICKET-005)
 *
 * Four columns at every width — one row always. Below `sm` the sub-labels
 * drop to keep the row honest on a 375px screen without wrapping.
 */

const ITEMS = [
  {
    icon: Users,
    title: 'Verified Suppliers',
    sub: '100+ trusted partners',
    tone: 'bg-[#E8F6EE] text-[#1E8449]',
  },
  {
    icon: Package,
    title: '1000+ Products',
    sub: 'Across all categories',
    tone: 'bg-blue-50 text-blue-600',
  },
  {
    icon: ShieldCheck,
    title: 'Secure Payment',
    sub: 'Buyer protected',
    tone: 'bg-[#FDF0E4] text-[#E67E22]',
  },
  {
    icon: Truck,
    title: 'Faster Delivery',
    sub: 'Cross-border, fast',
    tone: 'bg-purple-50 text-purple-600',
  },
];

export function InfoRibbon({ className }: { className?: string }) {
  return (
    <div className={cn('mx-auto max-w-market px-4', className)}>
      <ul className="grid grid-cols-4 divide-x divide-hairline rounded-lg border border-hairline bg-surface-raised">
        {/*
          Icon over label below `sm`, side by side above it. Three columns of
          icon-beside-text on a 320px phone left about 29px for the label and
          "Multiple Payment Options" truncated to two characters - stacking
          gives the words the column's whole width instead.
        */}
        {ITEMS.map(({ icon: Icon, title, sub, tone }) => (
          <li
            key={title}
            className="flex min-w-0 flex-col items-center justify-center gap-1 px-1.5 py-2 text-center sm:flex-row sm:gap-2.5 sm:px-3 sm:py-2.5 sm:text-left"
          >
            <span
              className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-md sm:h-8 sm:w-8 sm:rounded-lg',
                tone,
              )}
            >
              <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={1.9} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[9px] font-semibold leading-tight text-ink sm:truncate sm:text-[13px]">
                {title}
              </p>
              <p className="hidden truncate text-[11.5px] leading-tight text-muted sm:block">{sub}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
