import Link from 'next/link';
import { ArrowRight, Search } from 'lucide-react';

import { Swatch } from '@/components/storefront/Swatch';
import { cn } from '@/lib/utils';
import type { ProductImage } from '@/types';

/**
 * The two ways in.
 *
 * The hero argues that the price is published before you commit. That argument
 * only holds for things the suppliers actually stock, so the moment it lands
 * the page owes the reader the other door as well: the catalogue, and the
 * runner who goes looking when the catalogue does not carry it.
 *
 * Stated as two doors rather than one primary button with a link under it,
 * because they are not a call to action and its afterthought — they are two
 * genuinely different transactions. One has a price on the screen; the other
 * has a price you are shown before anything is bought. Ranking them would tell
 * a visitor who already knows which one they want that they picked wrong.
 *
 * Both doors carry the same medallion geometry as the numbered sequence
 * further down the page, so the reader meets one visual language for "a step
 * you can take" rather than a new one per section.
 */

export function PathChooser({
  marketplaceImage,
  productCount,
  className,
}: {
  /**
   * The flagship product's photograph. The marketplace door shows a real thing
   * that is for sale on it; an icon there would make the stocked catalogue and
   * the empty-handed request look like the same kind of offer.
   */
  marketplaceImage?: ProductImage;
  productCount: number;
  className?: string;
}) {
  return (
    <div className={cn('grid gap-4 sm:grid-cols-2 sm:gap-5', className)}>
      <Door
        href="/browse"
        title="Shop the marketplace"
        body={
          <>
            <span className="font-mono tabular-nums text-ink">{productCount}</span> products in
            stock with every rung of the ladder published. Order at the price on the screen.
          </>
        }
        action="Browse the catalogue"
        medallion={
          <Swatch
            image={marketplaceImage}
            fallback={['#D4920A', '#8B5E0A']}
            emoji="🛍️"
            label=""
            className="h-11 w-11 shrink-0 rounded-full"
            glyphClassName="text-[18px]"
            zoomOnHover={false}
          />
        }
      />

      <Door
        href="/request-a-runner"
        title="Send a runner to find it"
        body="For anything the catalogue does not carry. A verified runner goes looking, tells you what it costs, and buys it only once you have said yes."
        action="Request a runner"
        medallion={
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold-50 text-gold-700 ring-1 ring-inset ring-gold/25">
            <Search size={16} strokeWidth={1.5} aria-hidden="true" />
          </span>
        }
      />
    </div>
  );
}

function Door({
  href,
  title,
  body,
  action,
  medallion,
}: {
  href: string;
  title: string;
  body: React.ReactNode;
  action: string;
  medallion: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'group flex min-w-0 gap-4 rounded-lg bg-surface-raised px-5 py-5 ring-1 ring-inset ring-hairline sm:px-6',
        'transition-[transform,box-shadow,background-color] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]',
        'hover:-translate-y-0.5 hover:shadow-lift hover:ring-hairline-strong',
        'focus-visible:-translate-y-0.5',
      )}
    >
      {medallion}

      <div className="min-w-0 flex-1">
        <h3 className="text-[15px] font-semibold leading-6 text-ink transition-colors duration-300 group-hover:text-gold-dark">
          {title}
        </h3>
        <p className="mt-1.5 text-[13px] leading-6 text-body">{body}</p>

        {/*
          The action reads as a label under the sentence rather than as a
          button, because the whole panel is already the target. A button
          inside a link is a second thing to aim at that does the same job.
        */}
        <p className="mt-3 flex items-center gap-1.5 text-[13px] font-medium text-gold-dark">
          {action}
          <ArrowRight
            size={13}
            strokeWidth={1.75}
            aria-hidden="true"
            className="transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0.5"
          />
        </p>
      </div>
    </Link>
  );
}
