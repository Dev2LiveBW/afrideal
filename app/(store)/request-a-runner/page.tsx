import type { Metadata } from 'next';
import { Search, ShieldCheck, Star, UserCheck } from 'lucide-react';

import { auth } from '@/lib/auth';
import { readAll } from '@/lib/db';

import { RunnerRequestForm } from './RunnerRequestForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Request a runner',
  description:
    'Can’t find it listed? A verified AfriDeal runner will source it, inspect it and buy it on your behalf.',
};

export default async function RequestARunnerPage() {
  const [categories, runners, session] = await Promise.all([
    readAll('categories'),
    readAll('runners'),
    auth(),
  ]);

  const online = runners.filter((runner) => runner.online).length;

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-6 sm:px-6 sm:pb-24 sm:pt-10">
      <p className="eyebrow">Runner service</p>
      <h1 className="mt-2 font-display text-[26px] font-bold leading-[1.12] tracking-[-0.025em] text-ink sm:text-[36px]">
        Can&rsquo;t find it listed?
        <span className="block text-gold-dark">Our runners will source it for you.</span>
      </h1>
      <p className="mt-3 text-[13.5px] leading-6 text-body sm:text-[15px] sm:leading-7">
        {online > 0
          ? `${online} verified runner${online === 1 ? ' is' : 's are'} online right now.`
          : 'Verified runners pick up requests through the day.'}{' '}
        They find it, inspect it, negotiate and buy on your behalf — and you confirm before anyone
        is paid.
      </p>

      <ul className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[
          { icon: Search, label: 'Find anything' },
          { icon: UserCheck, label: 'Inspect & negotiate' },
          { icon: ShieldCheck, label: 'Buy on your behalf' },
          { icon: Star, label: 'Personal tasks' },
        ].map((item) => (
          <li
            key={item.label}
            className="flex items-center gap-2 rounded border border-hairline bg-surface-raised px-3 py-2.5"
          >
            <item.icon size={15} strokeWidth={1.5} className="shrink-0 text-gold-dark" />
            <span className="text-[12px] font-medium leading-4 text-ink">{item.label}</span>
          </li>
        ))}
      </ul>

      <div className="mt-4">
        <RunnerRequestForm categories={categories} signedIn={Boolean(session?.user)} />
      </div>
    </div>
  );
}
