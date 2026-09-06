import {
  BadgeCheck,
  ClipboardList,
  CreditCard,
  HandCoins,
  PackageCheck,
  Search,
  ThumbsUp,
  Truck,
  UserCheck,
} from 'lucide-react';

import { REQUEST_STEPS } from '@/lib/runner-requests';
import { cn } from '@/lib/utils';
import type { RunnerRequestStatus } from '@/types';

/**
 * The two flows, side by side: an order off the catalogue, and a sourcing
 * request handled by a runner.
 *
 * They are drawn as one object because the point being made is that they end
 * the same way. Whichever door a buyer came through, the money AfriDeal
 * collects is not released to the supplier or the runner until the buyer says
 * the goods arrived - so the two chains are set out in parallel, at the same
 * scale, with the same final state, and the reader can see the symmetry rather
 * than being told about it.
 *
 * The runner chain is generated from `REQUEST_STEPS`, which is the state
 * machine the API actually enforces. An explainer that hard-coded its own list
 * would be free to drift out of step with the thing it explains, and the first
 * time a state was added this page would quietly start lying.
 *
 * The machine word is kept next to the human sentence in mono. A buyer watching
 * their own request sees `SOURCING` on the order page; this is where they learn
 * what it means, and translating it away here would break that link.
 */

const ORDER_STEPS = [
  {
    state: 'PAID',
    icon: CreditCard,
    title: 'You pay AfriDeal',
    body: 'Through a licensed provider — DPO Pay, Orange Money or PayGate. Not the supplier, and never into a private account.',
  },
  {
    state: 'PROCESSING',
    icon: PackageCheck,
    title: 'The supplier prepares your order',
    body: 'Routed to whichever verified supplier holds the stock. A mixed basket splits, and each supplier sees only their own part of it.',
  },
  {
    state: 'IN_TRANSIT',
    icon: Truck,
    title: 'A vetted courier delivers it',
    body: 'Pickup and drop-off are tracked against the order, so you can see where it is.',
  },
  {
    state: 'DELIVERED',
    icon: BadgeCheck,
    title: 'You confirm, and the supplier is paid',
    body: 'Nothing is settled outward until the order closes. Late, short or not as described: report it and we replace or refund it.',
  },
] as const;

const REQUEST_COPY: Record<
  RunnerRequestStatus,
  { title: string; body: string; icon: typeof Search }
> = {
  REQUESTED: {
    title: 'You submit your request',
    body: 'Describe what you need, where you are, and what you would expect to pay.',
    icon: ClipboardList,
  },
  ACCEPTED: {
    title: 'A verified runner takes the job',
    body: 'Background-checked, rated on jobs they have already finished.',
    icon: UserCheck,
  },
  SOURCING: {
    title: 'The runner goes looking',
    body: 'They find it, check the condition and negotiate on your behalf.',
    icon: Search,
  },
  QUOTED: {
    title: 'The price comes back to you',
    body: 'What it costs, where it came from, what condition it is in. Nothing has been bought yet.',
    icon: HandCoins,
  },
  APPROVED: {
    title: 'You approve the purchase',
    body: 'Only now is anything bought. Say no and the request ends, at no cost to you.',
    icon: ThumbsUp,
  },
  DELIVERING: {
    title: 'Bought, and on the way',
    body: 'The runner or a courier brings it to the address on the request.',
    icon: Truck,
  },
  CONFIRMED: {
    title: 'You confirm, and the runner is paid',
    body: 'The runner’s fee is released once you have the goods in hand.',
    icon: BadgeCheck,
  },
  CANCELLED: {
    title: 'Cancelled',
    body: 'Every state before confirmation can be cancelled.',
    icon: ClipboardList,
  },
};

export function OrderFlows({ className }: { className?: string }) {
  return (
    <div className={cn('grid gap-6 lg:grid-cols-2 lg:gap-8', className)}>
      <Column
        tone="forest"
        kicker="Marketplace orders"
        lead="Something the catalogue already carries, at a published price."
        steps={ORDER_STEPS.map((step) => ({
          state: step.state,
          title: step.title,
          body: step.body,
          icon: step.icon,
        }))}
      />

      <Column
        tone="gold"
        kicker="Runner requests"
        lead="Something it does not — sourced, priced and bought on your say-so."
        steps={REQUEST_STEPS.map((state) => ({
          state,
          title: REQUEST_COPY[state].title,
          body: REQUEST_COPY[state].body,
          icon: REQUEST_COPY[state].icon,
        }))}
      />
    </div>
  );
}

const TONES = {
  forest: {
    header: 'bg-forest-wash/70 text-forest-ink',
    medallion: 'bg-forest-wash text-forest ring-forest/20',
    rule: 'bg-forest/20',
    last: 'bg-forest text-white ring-forest/30',
  },
  gold: {
    header: 'bg-gold-50/80 text-gold-700',
    medallion: 'bg-gold-50 text-gold-700 ring-gold/25',
    rule: 'bg-gold/25',
    last: 'bg-forest text-white ring-forest/30',
  },
} as const;

function Column({
  tone,
  kicker,
  lead,
  steps,
}: {
  tone: keyof typeof TONES;
  kicker: string;
  lead: string;
  steps: { state: string; title: string; body: string; icon: typeof Search }[];
}) {
  const skin = TONES[tone];

  return (
    <div className="min-w-0 overflow-hidden rounded-lg bg-surface-raised ring-1 ring-inset ring-hairline">
      <div className={cn('px-5 py-4', skin.header)}>
        <h3 className="font-display text-[15px] font-semibold tracking-[-0.01em]">{kicker}</h3>
        <p className="mt-1 text-[12.5px] leading-5 opacity-80">{lead}</p>
      </div>

      <ol className="px-5 py-5">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const last = index === steps.length - 1;

          return (
            <li key={step.state} className="relative flex gap-4 pb-6 last:pb-0">
              {!last && (
                <span
                  aria-hidden="true"
                  className={cn('absolute left-[17px] top-10 h-[calc(100%-1.75rem)] w-px', skin.rule)}
                />
              )}

              {/*
                The closing state is the one both columns share, so it is the
                one drawn solid. Everything before it is a stage; this is the
                point at which the money moves.
              */}
              <span
                aria-hidden="true"
                className={cn(
                  'relative z-10 flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full ring-1 ring-inset',
                  last ? skin.last : skin.medallion,
                )}
              >
                <Icon size={15} strokeWidth={1.5} />
              </span>

              <div className="min-w-0 flex-1">
                <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted">
                  {step.state.replace('_', ' ')}
                </p>
                <h4 className="mt-1 text-[14px] font-semibold leading-5 text-ink">{step.title}</h4>
                <p className="mt-1.5 text-[12.5px] leading-5 text-body">{step.body}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
