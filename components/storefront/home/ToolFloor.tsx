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
      <ul className="no-scrollbar mx-auto flex max-w-market gap-1 overflow-x-auto px-3 sm:px-4">
        {TOOLS.map(({ href, label, icon: Icon, tone }) => (
          <li key={href} className="w-[128px] shrink-0">
            <Link
              href={href}
              className="press-soft flex h-[52px] items-center gap-1 rounded-[4px] bg-surface-raised px-2 py-2.5 outline-none"
            >
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px]',
                  tone,
                )}
              >
                <Icon size={18} strokeWidth={2} aria-hidden="true" />
              </span>
              <span className="line-clamp-2 text-[11px] font-bold leading-[13px] text-[#222]">
                {label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
