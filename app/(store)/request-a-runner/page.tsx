import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BadgeCheck, HandCoins, PackageSearch, Search } from 'lucide-react';

import { auth } from '@/lib/auth';
import { readAll } from '@/lib/db';
import { SOURCING_FEE_RATE } from '@/lib/runner-requests';

import { RunnerRequestForm } from './RunnerRequestForm';

export const metadata: Metadata = {
  title: 'Request a runner',
  description:
    'Describe something the catalogue does not carry and a verified AfriDeal runner will find it, price it and buy it once you approve.',
};

export const dynamic = 'force-dynamic';

const STEPS = [
  {
    icon: Search,
    title: 'You describe it',
    body: 'What you are after, how many, and roughly what you hope to pay. A budget is optional; leave it blank if you would rather be told.',
  },
  {
    icon: PackageSearch,
    title: 'A runner goes looking',
    body: 'Verified runners see the request and one takes it. They work the trade counters and wholesalers in your city and inspect what they find.',
  },
  {
    icon: HandCoins,
    title: 'You see the price first',
    body: `They send back what it costs, where they found it and what condition it is in, plus a ${Math.round(SOURCING_FEE_RATE * 100)}% sourcing fee. Nothing is bought until you approve it.`,
  },
  {
    icon: BadgeCheck,
    title: 'They buy it and bring it',
    body: 'The runner pays at the counter and delivers to your address. If it is not what was agreed, send it back and the charge comes off.',
  },
];

export default async function RequestARunnerPage() {
  const session = await auth();
  if (!session?.user) redirect('/login?next=/request-a-runner');

  const runners = await readAll('runners');
  const online = runners.filter((runner) => runner.online);

  return (
    <div className="mx-auto max-w-market px-6 pb-24 pt-28">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-20">
        {/* ── What this is ─────────────────────────────────────────────── */}
        <div className="min-w-0 lg:sticky lg:top-28 lg:self-start">
          <h1 className="font-display text-[30px] font-bold leading-[1.08] tracking-[-0.03em] text-ink sm:text-[38px]">
            Not listed? Send someone to find it.
          </h1>
          <p className="measure mt-5 text-[15px] leading-7 text-body">
            The catalogue covers what our suppliers stock. When you need something they do not, a
            verified runner will go and look for it, tell you what it costs, and buy it only once
            you have said yes to the price.
          </p>

          <ol className="mt-9 space-y-6">
            {STEPS.map((step, index) => {
              const Icon = step.icon;

              return (
                <li key={step.title} className="flex gap-4">
                  <span className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-full bg-gold-50 text-gold-700 ring-1 ring-inset ring-gold/25">
                    <Icon size={14} strokeWidth={1.5} />
                    <span className="mt-0.5 font-mono text-[9px] font-semibold tabular-nums opacity-70">
                      {index + 1}
                    </span>
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <h2 className="text-[14.5px] font-semibold leading-5 text-ink">{step.title}</h2>
                    <p className="measure mt-1.5 text-[13px] leading-6 text-body">{step.body}</p>
                  </div>
                </li>
              );
            })}
          </ol>

          <p className="mt-9 border-t border-hairline pt-6 text-[13px] leading-6 text-muted">
            <span className="font-mono tabular-nums text-ink">{online.length}</span> of{' '}
            <span className="font-mono tabular-nums text-ink">{runners.length}</span> runners are
            online right now.{' '}
            <Link href="/requests" className="text-forest underline underline-offset-4">
              See your existing requests
            </Link>
            .
          </p>
        </div>

        {/* ── The request ──────────────────────────────────────────────── */}
        <div className="min-w-0">
          <div className="rounded-lg border border-hairline bg-surface-raised p-6 shadow-card sm:p-8">
            <h2 className="font-display text-headline-md font-semibold text-ink">
              Tell us what you need
            </h2>
            <p className="mt-1.5 text-[13.5px] leading-6 text-body">
              The more specific you are, the less a runner has to guess.
            </p>

            <div className="mt-7">
              <RunnerRequestForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
