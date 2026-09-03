import type { Metadata } from 'next';
import Link from 'next/link';

import { GoldButton } from '@/components/brand/GoldButton';
import { PlatformExplainer } from '@/components/storefront/PlatformExplainer';

export const metadata: Metadata = {
  title: 'How AfriDeal works',
  description:
    'Buy from verified suppliers or send a runner to source it for you. Either way your payment is held until you confirm delivery.',
};

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-6 sm:px-6 sm:pb-24 sm:pt-10">
      <PlatformExplainer />

      <div className="mt-3 flex flex-col gap-2.5 rounded-lg border border-hairline bg-surface-raised p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <p className="text-[13.5px] leading-5 text-body">
          Wondering what a product costs at ten, fifty or five hundred units?
        </p>
        <Link href="/pricing" className="shrink-0">
          <GoldButton variant="ghost" size="sm" className="w-full sm:w-auto">
            See the price breakdown
          </GoldButton>
        </Link>
      </div>
    </div>
  );
}
