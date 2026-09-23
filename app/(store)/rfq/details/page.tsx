import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

import { auth } from '@/lib/auth';

import { RunnerRequestForm } from '@/app/(store)/request-a-runner/RunnerRequestForm';

/**
 * Request for Quotation - step two, the details. Alibaba benchmark §3b.
 *
 * The form is the runner request form: on this storefront a quotation for
 * something not on a listing is a runner finding and pricing it, and that
 * form already captures everything a quote needs. It arrives pre-filled
 * with whatever the buyer typed on the landing.
 *
 * Sign-in is asked for here, not on the landing - the same order Alibaba
 * uses. The `next` carries the full path, description included, so nothing
 * typed is lost on the way round.
 */

export const metadata: Metadata = {
  title: 'Request details',
};

export const dynamic = 'force-dynamic';

export default async function RfqDetailsPage({
  searchParams,
}: {
  searchParams: { item?: string };
}) {
  const item = searchParams.item?.slice(0, 500) ?? '';

  const session = await auth();
  if (!session?.user) {
    const next = item ? `/rfq/details?item=${encodeURIComponent(item)}` : '/rfq/details';
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  return (
    <div className="mx-auto max-w-[480px] pb-24">
      <header className="sticky top-0 z-30 flex items-center gap-2 bg-royal px-3 py-3 text-white">
        <Link href="/rfq" aria-label="Back" className="-ml-1 flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10">
          <ChevronLeft size={22} strokeWidth={2.25} />
        </Link>
        <span className="rounded bg-[#E67E22] px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wide">
          RFQ
        </span>
        <h1 className="text-[18px] font-bold leading-none">Request details</h1>
      </header>

      <div className="px-3 pt-4">
        <p className="text-[13px] leading-5 text-body">
          The more you give us, the closer the first price. Nothing is bought until you approve it.
        </p>
        <RunnerRequestForm defaultItem={item} defaultCity="Gaborone" />
      </div>
    </div>
  );
}
