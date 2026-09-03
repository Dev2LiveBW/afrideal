import Link from 'next/link';
import {
  BadgeCheck,
  ClipboardList,
  Handshake,
  Lock,
  PackageCheck,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingCart,
  Star,
  ThumbsUp,
  Truck,
  UserCheck,
  Wallet,
} from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * How the platform works.
 *
 * Two ways to buy — off the marketplace, or through a runner who sources what
 * is not listed — and one settlement rule underneath both: nothing is paid out
 * until the buyer confirms. The section exists because that rule is the whole
 * proposition, and a shopper who has not understood it has no reason to prefer
 * AfriDeal to sending someone money directly.
 *
 * Laid out for a phone first: every row stacks, the two flows sit one above the
 * other, and the step chips wrap rather than scroll.
 */

const MARKETPLACE_STEPS = [
  {
    state: 'Paid',
    icon: Lock,
    body: 'You pay AfriDeal (not the supplier)',
  },
  {
    state: 'Fulfilling',
    icon: PackageCheck,
    body: 'Supplier prepares your order',
  },
  {
    state: 'Delivering',
    icon: Truck,
    body: 'Courier delivers to you',
  },
  {
    state: 'Confirmed',
    icon: BadgeCheck,
    body: 'You confirm, supplier gets paid',
  },
];

const RUNNER_STEPS = [
  {
    state: 'Requested',
    icon: ClipboardList,
    body: 'You submit your request',
  },
  {
    state: 'Accepted',
    icon: UserCheck,
    body: 'Runner accepts the job',
  },
  {
    state: 'Sourcing',
    icon: Search,
    body: 'Runner finds, checks and negotiates',
  },
  {
    state: 'Approved',
    icon: ThumbsUp,
    body: 'You approve the purchase',
  },
  {
    state: 'Delivering',
    icon: Truck,
    body: 'Runner or courier delivers to you',
  },
  {
    state: 'Confirmed',
    icon: BadgeCheck,
    body: 'You confirm, runner gets paid',
  },
];

function StepFlow({
  steps,
  tone,
  columns,
}: {
  steps: typeof MARKETPLACE_STEPS;
  tone: 'forest' | 'gold';
  /** Row width from `sm` up. Four for the marketplace flow, three for the
   *  runner flow, which has six steps and reads as two rows of three. */
  columns: 3 | 4;
}) {
  return (
    <ol
      className={cn(
        'grid grid-cols-2 gap-x-2 gap-y-4',
        columns === 4 ? 'sm:grid-cols-4' : 'sm:grid-cols-3',
      )}
    >
      {steps.map((step, index) => (
        <li key={step.state} className="relative flex flex-col items-center text-center">
          {/* The connector joins a step to the next one in the same row, so it
              never runs off the end of a row or points at nothing. */}
          {index < steps.length - 1 && (index + 1) % columns !== 0 && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-[calc(50%+22px)] right-[calc(-50%+22px)] top-5 hidden h-px bg-hairline-strong sm:block"
            />
          )}

          <span
            className={cn(
              'relative z-10 flex h-10 w-10 items-center justify-center rounded-full ring-1 ring-inset',
              tone === 'forest'
                ? 'bg-forest-wash text-forest ring-forest/20'
                : 'bg-gold-50 text-gold-700 ring-gold/25',
            )}
          >
            <step.icon size={16} strokeWidth={1.6} />
          </span>

          <p
            className={cn(
              'mt-2 font-mono text-[9.5px] font-medium uppercase tracking-[0.14em]',
              tone === 'forest' ? 'text-forest' : 'text-gold-dark',
            )}
          >
            {step.state}
          </p>
          <p className="mt-1 text-[11.5px] leading-4 text-body">{step.body}</p>
        </li>
      ))}
    </ol>
  );
}

function PathCard({
  tone,
  icon: Icon,
  title,
  body,
  chips,
  href,
  cta,
}: {
  tone: 'forest' | 'gold';
  icon: typeof ShoppingCart;
  title: string;
  body: string;
  chips: string[];
  href: string;
  cta: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col rounded-md border p-4 sm:p-5',
        tone === 'forest' ? 'border-forest/20 bg-forest-wash/40' : 'border-gold/25 bg-gold-50/50',
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white',
            tone === 'forest' ? 'bg-forest' : 'bg-gold',
          )}
        >
          <Icon size={18} strokeWidth={1.6} />
        </span>
        <h3 className="font-display text-[18px] font-semibold leading-6 text-ink sm:text-[20px]">
          {title}
        </h3>
      </div>

      <p className="mt-3 text-[13px] leading-5 text-body">{body}</p>

      <ul className="mt-3 flex flex-wrap gap-1.5">
        {chips.map((chip) => (
          <li
            key={chip}
            className="rounded-full bg-surface-raised px-2.5 py-1 text-[11px] font-medium text-body ring-1 ring-inset ring-hairline"
          >
            {chip}
          </li>
        ))}
      </ul>

      <Link
        href={href}
        className={cn(
          'mt-4 flex h-11 items-center justify-center gap-2 rounded text-[14px] font-medium text-white transition-colors',
          tone === 'forest' ? 'bg-forest hover:bg-forest-light' : 'bg-gold hover:bg-gold-dark',
        )}
      >
        {cta}
      </Link>
    </div>
  );
}

export function PlatformExplainer({ className }: { className?: string }) {
  return (
    <section className={cn('rounded-lg border border-hairline bg-surface-raised', className)}>
      {/* ── Promise ──────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-4 p-4 sm:p-8">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-[24px] font-bold leading-[1.12] tracking-[-0.025em] text-ink sm:text-[34px]">
            Your money stays protected
            <span className="block text-gold-dark">until the job is done.</span>
          </h2>
          <p className="mt-3 text-[13.5px] leading-6 text-body sm:text-[15px] sm:leading-7">
            Whether you buy from our verified suppliers or ask a runner to source something for you,
            your transaction is handled through AfriDeal&rsquo;s protected payment and settlement
            process.
          </p>
        </div>

        <span
          aria-hidden="true"
          className="relative hidden h-24 w-24 shrink-0 items-center justify-center rounded-full bg-forest-wash sm:flex"
        >
          <ShieldCheck size={44} strokeWidth={1.2} className="text-forest" />
          <span className="absolute -bottom-1 -right-1 flex h-11 w-11 items-center justify-center rounded-full bg-gold text-ink ring-4 ring-surface-raised">
            <Wallet size={20} strokeWidth={1.6} />
          </span>
        </span>
      </div>

      {/* ── Two paths ────────────────────────────────────────────────────── */}
      <div className="border-t border-hairline px-4 py-6 sm:px-8">
        <h3 className="text-center font-display text-[17px] font-semibold text-ink sm:text-[20px]">
          Choose how you want us to help
        </h3>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <PathCard
            tone="forest"
            icon={ShoppingCart}
            title="Buy from the marketplace"
            body="Browse thousands of products from verified suppliers, compare prices and buy with confidence."
            chips={['Best prices', 'Verified suppliers', 'Secure checkout']}
            href="/browse"
            cta="Browse products"
          />
          <PathCard
            tone="gold"
            icon={Handshake}
            title="Request a runner"
            body="Can’t find it listed? Our verified runners will source, check and buy it for you."
            chips={['Find anything', 'Inspect & negotiate', 'Personal service']}
            href="/request-a-runner"
            cta="Find a runner"
          />
        </div>
      </div>

      {/* ── The two flows ────────────────────────────────────────────────── */}
      <div className="border-t border-hairline px-4 py-6 sm:px-8">
        <h3 className="text-center font-display text-[17px] font-semibold text-ink sm:text-[20px]">
          How it works — two ways, <span className="text-forest">same protection</span>
        </h3>
        <p className="mt-1 text-center text-[12.5px] text-muted">
          Your payment is only released when you confirm.
        </p>

        <div className="mt-5 grid gap-5 lg:grid-cols-2 lg:gap-8">
          <div>
            <p className="flex items-center justify-center gap-2 rounded bg-forest-wash/60 py-2 text-[12.5px] font-medium text-forest-ink">
              <ShoppingCart size={14} strokeWidth={1.6} />
              Marketplace orders
            </p>
            <div className="mt-4">
              <StepFlow steps={MARKETPLACE_STEPS} tone="forest" columns={4} />
            </div>
            <p className="mt-4 rounded bg-surface-sunk/60 px-3.5 py-3 text-[12px] leading-5 text-body">
              You get what you ordered. If something is wrong, we help you resolve it.
            </p>
          </div>

          <div>
            <p className="flex items-center justify-center gap-2 rounded bg-gold-50/70 py-2 text-[12.5px] font-medium text-gold-700">
              <Handshake size={14} strokeWidth={1.6} />
              Runner requests
            </p>
            <div className="mt-4">
              <StepFlow steps={RUNNER_STEPS} tone="gold" columns={3} />
            </div>
            <p className="mt-4 rounded bg-gold-50/50 px-3.5 py-3 text-[12px] leading-5 text-gold-700">
              You stay in control at every step. Nothing is paid out until you confirm.
            </p>
          </div>
        </div>
      </div>

      {/* ── Reassurance ──────────────────────────────────────────────────── */}
      <ul className="grid grid-cols-2 gap-3 border-t border-hairline px-4 py-5 sm:px-8 lg:grid-cols-4">
        {[
          {
            icon: ShieldCheck,
            tone: 'text-forest',
            title: 'Protected payments',
            body: 'Your money is secure with trusted partners.',
          },
          {
            icon: UserCheck,
            tone: 'text-gold-dark',
            title: 'Verified runners',
            body: 'Background checked, trained and rated.',
          },
          {
            icon: RefreshCw,
            tone: 'text-royal',
            title: 'Refund & support',
            body: 'Raise a dispute easily. We’ve got you.',
          },
          {
            icon: Star,
            tone: 'text-plum',
            title: 'Rate & review',
            body: 'Help others by rating suppliers and runners.',
          },
        ].map((item) => (
          <li key={item.title} className="flex gap-2.5">
            <item.icon size={17} strokeWidth={1.5} className={cn('mt-0.5 shrink-0', item.tone)} />
            <span>
              <span className="block text-[12.5px] font-medium text-ink">{item.title}</span>
              <span className="mt-0.5 block text-[11.5px] leading-4 text-muted">{item.body}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
