import Link from 'next/link';
import { Building2, FileText, ShieldCheck, ShoppingBag, Store } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { CustomerType } from '@/types';

/**
 * Account tiers, explained (§7).
 *
 * Read-only on purpose. Customer type is a property of a verified account, set
 * when a business or reseller registers, so it is resolved from the session on
 * the server. A control that let a visitor pick their own tier would be a
 * wholesale price any shopper could award themselves.
 */

const TIERS: {
  id: CustomerType;
  label: string;
  quantities: string;
  icon: typeof ShoppingBag;
  unlocks: string;
}[] = [
  {
    id: 'RETAIL',
    label: 'Retail',
    quantities: '1–19 units',
    icon: ShoppingBag,
    unlocks: 'Standard and bulk bands, escrow on every order.',
  },
  {
    id: 'BUSINESS',
    label: 'Business',
    quantities: '1–99 units',
    icon: Building2,
    unlocks: 'Wholesale bands once your registration is verified.',
  },
  {
    id: 'RESELLER',
    label: 'Reseller',
    quantities: '5–99 units',
    icon: Store,
    unlocks: 'Trade pricing from the bulk band upward.',
  },
  {
    id: 'INSTITUTIONAL',
    label: 'Institutional',
    quantities: '20 units and above',
    icon: ShieldCheck,
    unlocks: 'Wholesale bands plus quotations on large volumes.',
  },
];

export function CustomerTierBar({ customerType }: { customerType: CustomerType | null }) {
  return (
    <section className="rounded-lg border border-hairline bg-surface-raised p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Account tiers</p>
          <h2 className="mt-2.5 font-display text-headline-md font-semibold text-ink">
            The price depends on who is buying and how many
          </h2>
          <p className="measure mt-2 text-[13.5px] leading-6 text-body">
            A product does not have one universal price. Bands are set per account type and per
            quantity, and they apply automatically at checkout.
          </p>
        </div>

        {customerType && customerType !== 'GUEST' && (
          <p className="rounded-full bg-forest-wash px-3 py-1.5 text-[12px] font-medium text-forest-ink">
            You are on the{' '}
            {TIERS.find((tier) => tier.id === customerType)?.label ?? 'Retail'} tier
          </p>
        )}
      </div>

      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {TIERS.map((tier) => {
          const active = tier.id === customerType;
          const Icon = tier.icon;

          return (
            <li
              key={tier.id}
              className={cn(
                'rounded-md border p-4',
                active ? 'border-forest/30 bg-forest-wash/50' : 'border-hairline bg-surface',
              )}
            >
              <span
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full',
                  active ? 'bg-forest text-white' : 'bg-ink/[0.06] text-body',
                )}
              >
                <Icon size={15} strokeWidth={1.5} />
              </span>

              <p className="mt-3 text-[13.5px] font-semibold text-ink">{tier.label}</p>
              <p className="font-mono text-[11px] tabular-nums text-muted">{tier.quantities}</p>
              <p className="mt-2 text-[12px] leading-5 text-body">{tier.unlocks}</p>
            </li>
          );
        })}
      </ul>

      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-hairline pt-4">
        <p className="flex items-center gap-2 text-[12.5px] text-body">
          <FileText size={14} strokeWidth={1.5} className="shrink-0 text-muted" />
          Need more than 99 units? Those are priced by quotation.
        </p>
        <Link
          href="/login"
          className="text-[12.5px] font-medium text-gold-dark transition-colors hover:text-ink"
        >
          Apply for a business account →
        </Link>
      </div>
    </section>
  );
}
