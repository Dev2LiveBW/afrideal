import { BadgeCheck, Landmark, RotateCcw, Truck } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * The four things a buyer wants settled before they commit.
 *
 * Deliberately one strip divided by hairlines rather than four cards. Four
 * boxes of icon-plus-heading-plus-sentence is the shape every marketplace
 * reaches for, and it reads as page furniture; a single rule with four
 * compartments reads as a specification plate, which is the register this
 * system is already in.
 *
 * The payment line is a legal position, not a reassurance. AfriDeal is the
 * merchant on the order and the payment is processed by a licensed provider;
 * the platform is not itself a payment provider and does not hold anyone's
 * money. That distinction is why the wording here is fixed and should not be
 * softened into "your money is safe with us".
 */

const CLAIMS = [
  {
    icon: Landmark,
    title: 'Payments handled by licensed partners',
    body: 'Processed through DPO Pay, Orange Money or PayGate. AfriDeal never sees your card details.',
  },
  {
    icon: BadgeCheck,
    title: 'Suppliers verified before they list',
    body: 'Registration, tax and banking details are checked, and orders route on reliability.',
  },
  {
    icon: Truck,
    title: 'Delivery you can follow',
    body: 'Pickup and drop-off are tracked against the order, across Botswana and South Africa.',
  },
  {
    icon: RotateCcw,
    title: 'A wrong order is ours to fix',
    body: 'You buy from AfriDeal, so a late, short or incorrect order is ours to replace or refund.',
  },
];

export function TrustStrip({
  className,
  tone = 'light',
}: {
  className?: string;
  /** `dark` sits on the ink footer; `light` on the page ground. */
  tone?: 'light' | 'dark';
}) {
  const dark = tone === 'dark';

  return (
    <div
      className={cn(
        'grid divide-y sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4',
        dark
          ? 'divide-white/10 sm:divide-x sm:[&>*:nth-child(3)]:border-t sm:[&>*:nth-child(3)]:border-white/10 sm:[&>*:nth-child(4)]:border-t sm:[&>*:nth-child(4)]:border-white/10 lg:[&>*]:border-t-0'
          : 'divide-hairline sm:divide-x sm:[&>*:nth-child(3)]:border-t sm:[&>*:nth-child(3)]:border-hairline sm:[&>*:nth-child(4)]:border-t sm:[&>*:nth-child(4)]:border-hairline lg:[&>*]:border-t-0',
        className,
      )}
    >
      {CLAIMS.map((claim) => {
        const Icon = claim.icon;

        return (
          <div key={claim.title} className="flex gap-3 px-0 py-5 sm:px-6 sm:py-4 lg:first:pl-0">
            <Icon
              size={17}
              strokeWidth={1.5}
              aria-hidden="true"
              className={cn('mt-0.5 shrink-0', dark ? 'text-gold-light' : 'text-forest')}
            />
            <div className="min-w-0">
              <p
                className={cn(
                  'text-[13px] font-semibold leading-5',
                  dark ? 'text-white' : 'text-ink',
                )}
              >
                {claim.title}
              </p>
              <p
                className={cn(
                  'mt-1 text-[12px] leading-5',
                  dark ? 'text-white/55' : 'text-muted',
                )}
              >
                {claim.body}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
