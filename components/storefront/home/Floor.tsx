import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * A "floor" - the unit the benchmark's home page is built from.
 *
 * Alibaba's buyer home, measured live at 390px (docs/design/alibaba-benchmark.md
 * §3a), is a stack of floors on white: each one a header that is itself a
 * link (a 16px bold title with a 17px mark before it, an 11px grey subtitle
 * under it, a 20px arrow at the right edge), and under it a horizontal rail
 * of 136×172 cards with 4px gutters and the page's 12px margins. A floor is
 * 250px tall on the benchmark; ours are the same to within the line-height of
 * our faces.
 *
 * The rail scrolls on every width. On a wide screen the cards simply stop
 * before the edge, which is what the benchmark does too - it has no desktop
 * layout for the floors, and neither does this.
 */

export function Floor({
  id,
  title,
  subtitle,
  href,
  icon: Icon,
  iconClassName,
  children,
  className,
}: {
  id: string;
  title: string;
  subtitle?: string;
  /** Where the whole header goes. The header is the floor's "view all". */
  href: string;
  icon?: LucideIcon;
  iconClassName?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('bg-surface-raised', className)} aria-labelledby={id}>
      <div className="mx-auto max-w-market">
        <Link
          href={href}
          className="press-soft flex items-start justify-between gap-3 px-3 pt-3 outline-none sm:px-4"
        >
          <div className="min-w-0">
            <h2
              id={id}
              className="flex items-center gap-1.5 font-sans text-[16px] font-bold leading-5 tracking-normal text-[#222]"
            >
              {Icon && (
                <Icon
                  size={17}
                  strokeWidth={2.25}
                  className={cn('shrink-0', iconClassName)}
                  aria-hidden="true"
                />
              )}
              <span className="truncate">{title}</span>
            </h2>
            {subtitle && (
              <p className="mt-1 truncate text-[11px] leading-[14px] text-[#767676]">{subtitle}</p>
            )}
          </div>
          <ArrowRight size={20} strokeWidth={2} className="shrink-0 text-[#222]" aria-hidden="true" />
        </Link>

        {children}
      </div>
    </section>
  );
}

/**
 * The rail under a floor header. 4px gutters, the page margin at each end,
 * the scrollbar hidden. Cards decide their own width.
 */
export function Rail({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <ul className={cn('no-scrollbar flex gap-1 overflow-x-auto px-3 pb-3 pt-2 sm:px-4', className)}>
      {children}
    </ul>
  );
}

/**
 * One card on a rail: a 136px square photograph at 4px radius under the
 * benchmark's 4% film, an optional pill centred on the photograph's foot, and
 * two lines under it - a 13px bold primary line and an 11px grey secondary.
 * The whole card is one link; anything interactive on top of the photograph
 * is the caller's to place (see the deals rail).
 */
export function RailCard({
  href,
  image,
  tag,
  primary,
  secondary,
  overlay,
  className,
}: {
  href: string;
  /** The photograph, sized by the caller to fill the square. */
  image: React.ReactNode;
  /** The pill on the photograph's foot, e.g. `−24% at 50+`. */
  tag?: React.ReactNode;
  primary: React.ReactNode;
  secondary?: React.ReactNode;
  /** Anything laid over the photograph besides the tag - a quick-add, a flag. */
  overlay?: React.ReactNode;
  className?: string;
}) {
  return (
    <li className={cn('w-[136px] shrink-0', className)}>
      <Link href={href} className="press-soft block outline-none">
        <div className="film relative aspect-square w-full overflow-hidden rounded-[4px] bg-[#f4f4f4]">
          {image}
          {tag && (
            <span className="absolute bottom-2 left-1/2 z-10 max-w-[calc(100%-16px)] -translate-x-1/2 truncate rounded-[8px] bg-[#222]/60 px-1.5 py-[3px] text-[10px] font-bold leading-3 text-white">
              {tag}
            </span>
          )}
          {overlay}
        </div>
        <div className="mt-1">
          <div className="truncate text-[13px] font-bold leading-4 text-[#222]">{primary}</div>
          {secondary && (
            <div className="mt-0.5 truncate text-[11px] leading-[14px] text-[#666]">{secondary}</div>
          )}
        </div>
      </Link>
    </li>
  );
}
