import Link from 'next/link';
import { CreditCard, Heart, MapPin, Package, Phone, Settings, Star } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { Runner } from '@/types';

/** Account shell and runner contact card for the order surfaces. */

const NAV = [
  { href: '/orders', label: 'Orders', icon: Package, live: true },
  { href: '/orders', label: 'Addresses', icon: MapPin, live: false },
  { href: '/orders', label: 'Payments', icon: CreditCard, live: false },
  { href: '/orders', label: 'Saved items', icon: Heart, live: false },
  { href: '/orders', label: 'Account settings', icon: Settings, live: false },
];

export function AccountSidebar({
  name,
  avatar,
  active = 'Orders',
}: {
  name: string;
  avatar: string;
  active?: string;
}) {
  const firstName = name.split(' ')[0];

  return (
    <aside className="lg:w-[220px] lg:shrink-0">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ink font-mono text-[13px] font-semibold text-gold-light">
          {avatar}
        </span>
        <div className="min-w-0">
          <p className="text-[11.5px] text-muted">Welcome back</p>
          <p className="truncate text-[15px] font-semibold text-ink">{firstName}</p>
        </div>
      </div>

      <nav className="mt-6">
        <ul className="flex gap-1.5 overflow-x-auto lg:flex-col lg:gap-0.5 lg:overflow-visible">
          {NAV.map((item) => {
            const Icon = item.icon;
            const isActive = item.label === active;

            return (
              <li key={item.label} className="shrink-0">
                {item.live ? (
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2.5 whitespace-nowrap rounded px-3 py-2.5 text-[13.5px] font-medium transition-colors',
                      isActive
                        ? 'bg-gold-50 text-gold-700'
                        : 'text-body hover:bg-ink/[0.04] hover:text-ink',
                    )}
                  >
                    <Icon size={15} strokeWidth={1.5} />
                    {item.label}
                  </Link>
                ) : (
                  <span
                    title="Not part of this release"
                    className="flex cursor-not-allowed items-center gap-2.5 whitespace-nowrap rounded px-3 py-2.5 text-[13.5px] text-muted opacity-55"
                  >
                    <Icon size={15} strokeWidth={1.5} />
                    {item.label}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <p className="mt-4 hidden border-t border-hairline pt-4 text-[11.5px] leading-4 text-muted lg:block">
        Addresses, payments and saved items are dimmed because they are not part of this release.
      </p>
    </aside>
  );
}

/**
 * Runner contact card.
 *
 * Shown only once a runner has actually been assigned to a leg of the order, so
 * it never advertises a person who is not yet on their way.
 */
export function RunnerContactCard({ runner }: { runner: Runner }) {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-4 rounded-md border border-hairline bg-surface p-4">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ink font-mono text-[14px] font-semibold text-gold-light">
        {runner.initials}
      </span>

      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-[14px] font-medium text-ink">
          {runner.name}
          <span className="inline-flex items-center gap-1 text-[11.5px] font-normal text-muted">
            <Star size={11} strokeWidth={1.5} className="fill-gold text-gold" />
            <span className="font-mono tabular-nums">{runner.rating.toFixed(1)}</span>
            <span>({runner.deliveries_completed} deliveries)</span>
          </span>
        </p>
        <p className="mt-0.5 text-[12.5px] text-body">
          {runner.vehicle} · {runner.plate} — carrying your order
        </p>
      </div>

      <a
        href={`tel:${runner.phone.replace(/\s/g, '')}`}
        className="inline-flex shrink-0 items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-ink-800"
      >
        <Phone size={14} strokeWidth={1.5} />
        Call runner
      </a>
    </div>
  );
}
