import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { BadgeCheck, FileText, Grid2x2, Route, Truck } from 'lucide-react';

import { DIRECTORY_ROUTE } from '@/lib/directory-placement';
import { cn } from '@/lib/utils';

/**
 * The tool floor. Benchmark §3a: the row of service tiles under the chips.
 *
 * Alibaba's are `Source by category | Request for Quotation | …` on a
 * `#f8f8f8` band: white 128×52 tiles at 4px radius with a 32px icon on the
 * left and an 11px bold two-line label beside it, 4px apart, scrolling past
 * the right edge. Each is a door to a different way of using the platform -
 * which is exactly what these five are.
 *
 * The icons are drawn on a tinted 32px tile so they read at 11px labels; the
 * benchmark uses full-colour illustrations for the same job.
 *
 * Diverges from the benchmark on the product owner's instruction
 * (2026-09-23): Alibaba scrolls fixed 128px tiles past the right edge, which
 * on a 1400px container left five tiles clumped in the left 45% and 744px of
 * dead band. These are five equal columns that fill the container at every
 * width instead - stacked icon-over-label below sm, the benchmark's
 * horizontal 52px tile from sm up. See docs/design/alibaba-benchmark.md.
 */
interface Tool {
  href: string;
  label: string;
  icon: LucideIcon;
  tone: string;
}

const TOOLS: Tool[] = [
  { href: '/categories', label: 'Browse by category', icon: Grid2x2, tone: 'bg-[#FDF0E4] text-[#E67E22]' },
  { href: '/rfq', label: 'Request for Quotation', icon: FileText, tone: 'bg-royal-wash text-royal' },
  { href: DIRECTORY_ROUTE, label: 'Verified suppliers', icon: BadgeCheck, tone: 'bg-ocean-wash text-ocean' },
  { href: '/request-a-runner', label: 'Request a runner', icon: Route, tone: 'bg-forest-wash text-forest' },
  { href: '/orders', label: 'Track your order', icon: Truck, tone: 'bg-[#E8F6EE] text-[#1E8449]' },
];

export function ToolFloor({ className }: { className?: string }) {
  return (
    <div className={cn('bg-[#f8f8f8] pt-2', className)}>
      <ul className="mx-auto grid max-w-market grid-cols-5 gap-1 px-3 sm:gap-2 sm:px-4">
        {TOOLS.map(({ href, label, icon: Icon, tone }) => (
          <li key={href} className="min-w-0">
            <Link
              href={href}
              className="press-soft flex h-[46px] flex-col items-center justify-center gap-0.5 rounded-[4px] bg-surface-raised px-1 py-1 text-center outline-none sm:h-[52px] sm:flex-row sm:justify-start sm:gap-1 sm:px-2 sm:py-2.5 sm:text-left"
            >
              <span
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] sm:h-8 sm:w-8',
                  tone,
                )}
              >
                <Icon className="h-3 w-3 sm:h-[18px] sm:w-[18px]" strokeWidth={2} aria-hidden="true" />
              </span>
              <span className="line-clamp-2 text-[0.40625rem] font-bold leading-[0.46875rem] text-[#222] sm:text-[0.6875rem] sm:leading-[0.8125rem]">
                {label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
