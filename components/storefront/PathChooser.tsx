import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Building2, ShoppingCart, Search } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * The three ways in.
 */

type Accent = 'forest' | 'gold' | 'royal';

const ACCENTS: Record<
  Accent,
  { card: string; medallion: string; kicker: string; action: string }
> = {
  forest: {
    card: 'bg-white ring-hairline hover:ring-forest/30 shadow-sm',
    medallion: 'bg-forest text-white',
    kicker: 'text-forest',
    action: 'bg-forest text-white group-hover:bg-forest-light',
  },
  gold: {
    card: 'bg-white ring-hairline hover:ring-gold/40 shadow-sm',
    medallion: 'bg-gold text-white', // Usually gold buttons have white or ink text, mockup shows white icon inside orange circle
    kicker: 'text-gold-dark',
    action: 'bg-gold text-white group-hover:bg-gold-light',
  },
  royal: {
    card: 'bg-white ring-hairline hover:ring-royal/30 shadow-sm',
    medallion: 'bg-royal text-white',
    kicker: 'text-royal',
    action: 'bg-royal text-white group-hover:bg-royal-light',
  },
};

export function PathChooser({
  productCount,
  className,
}: {
  productCount: number;
  className?: string;
}) {
  return (
    <div className={cn('grid gap-4 md:grid-cols-3 md:gap-6', className)}>
      <Door
        accent="forest"
        icon={<ShoppingCart size={20} strokeWidth={2} />}
        kicker="Shop"
        title="From Verified Suppliers"
        body={
          <>
            Compare prices from multiple verified suppliers and buy with confidence.
          </>
        }
        image="/images/home/shop-items.jpg"
        action="Shop Now"
        href="/browse"
      />

      <Door
        accent="gold"
        icon={<Search size={20} strokeWidth={2} />}
        kicker="Procure"
        title="We Find It For You"
        body="Can't find it listed? Our verified runners will source it, negotiate and procure it for you."
        image="/images/home/procure-runner.jpg"
        action="Request a Runner"
        href="/request-a-runner"
      />

      <Door
        accent="royal"
        icon={<Building2 size={20} strokeWidth={2} />}
        kicker="Wholesale"
        title="Better Prices, Bigger Value"
        body="Buy in bulk from verified suppliers and grow your business with AfriDeal."
        image="/images/home/wholesale-pallets.jpg"
        action="Request Wholesale Quote"
        href="/browse?tier=WHOLESALE"
      />
    </div>
  );
}

function Door({
  accent,
  icon,
  kicker,
  title,
  body,
  image,
  action,
  href,
}: {
  accent: Accent;
  icon: React.ReactNode;
  kicker: string;
  title: string;
  body: React.ReactNode;
  image: string;
  action: string;
  href: string;
}) {
  const tone = ACCENTS[accent];

  return (
    <Link
      href={href}
      className={cn(
        'group flex min-w-0 flex-col rounded-2xl p-6 ring-1 ring-inset',
        'transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]',
        'hover:-translate-y-1 hover:shadow-lg focus-visible:-translate-y-1',
        tone.card,
      )}
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-full', tone.medallion)}
        >
          {icon}
        </span>

        <div className="min-w-0">
          <p className={cn('font-display text-[16px] font-bold uppercase tracking-wide', tone.kicker)}>
            {kicker}
          </p>
          <p className="text-[13px] font-semibold leading-5 text-ink">{title}</p>
        </div>
      </div>

      <p className="mt-4 text-[14px] leading-relaxed text-body">{body}</p>

      <div className="relative mt-6 mb-6 flex-1 w-full aspect-video rounded-lg overflow-hidden bg-surface-sunk">
        <Image 
          src={image} 
          alt={kicker} 
          fill 
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-105" 
        />
      </div>

      <p
        className={cn(
          'mt-auto flex items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-[14.5px] font-semibold',
          'transition-colors duration-300',
          tone.action,
        )}
      >
        {action}
        <ArrowRight
          size={16}
          strokeWidth={2.5}
          aria-hidden="true"
          className="transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1"
        />
      </p>
    </Link>
  );
}
