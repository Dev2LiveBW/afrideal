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
    /* A disclosure, not elaboration - see the note above. Never folds away. */
    legal: true,
  },
  {
    icon: BadgeCheck,
    title: 'Suppliers verified before they list',
    body: 'Registration, tax and banking details are checked, and orders route on reliability.',
    legal: false,
  },
  {
    icon: Truck,
    title: 'Delivery you can follow',
    body: 'Pickup and drop-off are tracked against the order, across Botswana and South Africa.',
    legal: false,
  },
  {
    icon: RotateCcw,
    title: 'A wrong order is ours to fix',
    body: 'You buy from AfriDeal, so a late, short or incorrect order is ours to replace or refund.',
    legal: false,
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
        'grid grid-cols-4 gap-1 sm:gap-4',
        dark
          ? 'sm:divide-x sm:divide-white/10 sm:[&>*:nth-child(3)]:border-t sm:[&>*:nth-child(3)]:border-white/10 sm:[&>*:nth-child(4)]:border-t sm:[&>*:nth-child(4)]:border-white/10 lg:[&>*]:border-t-0'
          : 'sm:divide-x sm:divide-hairline sm:[&>*:nth-child(3)]:border-t sm:[&>*:nth-child(3)]:border-hairline sm:[&>*:nth-child(4)]:border-t sm:[&>*:nth-child(4)]:border-hairline lg:[&>*]:border-t-0',
        className,
      )}
    >
      {CLAIMS.map((claim) => {
        const Icon = claim.icon;

        return (
          <div
            key={claim.title}
            className={cn(
              'flex flex-col items-center gap-1 rounded-lg p-1 text-center sm:flex-row sm:items-start sm:gap-3 sm:rounded-none sm:p-0 sm:px-6 sm:py-4 sm:text-left lg:first:pl-0',
              dark ? 'bg-white/[0.04] sm:bg-transparent' : 'bg-surface-raised/60 sm:bg-transparent',
            )}
          >
            <Icon
              strokeWidth={1.75}
              aria-hidden="true"
              className={cn(
                'h-4 w-4 shrink-0 sm:h-[17px] sm:w-[17px] sm:mt-0.5',
                dark ? 'text-gold-light' : 'text-forest',
              )}
            />
            <div className="min-w-0">
              <p
                className={cn(
                  'text-[0.53125rem] font-semibold leading-tight sm:text-[0.8125rem] sm:leading-5',
                  dark ? 'text-white' : 'text-ink',
                )}
              >
                {claim.title}
              </p>
              {/*
               * No line-clamp here, deliberately. Tailwind's `line-clamp-none`
               * sets `display: block`, so tailwind-merge puts line-clamp and
               * display in the same conflict group and keeps whichever comes
               * last - which silently dropped `hidden` and `sm:block` and left
               * the body visible at 320px. The clamp is redundant anyway now
               * that the body is hidden below sm.
               */}
              <p
                className={cn(
                  'mt-0.5 text-[0.34375rem] leading-tight sm:mt-1 sm:text-[0.75rem] sm:leading-5',
                  claim.legal ? 'block' : 'hidden sm:block',
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
