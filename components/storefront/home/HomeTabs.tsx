'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

/**
 * The home tabs. Benchmark §3a: the row under the search field.
 *
 * Alibaba's are `AI Mode | Products | Manufacturers | Worldwide` - four
 * homes for four ways of buying, and each tab is a page, not a filter: the
 * URL changes and the whole page under the row is a different one. Ours are
 * the four ways of buying on this marketplace. Same shape: a 55px row with
 * 12px side padding and a hairline under it, the active tab 18px bold with a
 * 2px ink rule along its foot, the others 16px regular.
 *
 * The row scrolls sideways rather than shrinking the type, which is what the
 * benchmark does when the labels outgrow a 320px phone.
 */
const TABS = [
  { href: '/', label: 'Products' },
  { href: '/suppliers', label: 'Suppliers' },
  { href: '/request-a-runner', label: 'Runners' },
  { href: '/rfq', label: 'Quotes' },
];

export function HomeTabs({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Ways to buy" className={cn('border-b border-[#eee] bg-surface-raised', className)}>
      <ul className="no-scrollbar mx-auto flex h-[55px] max-w-market items-stretch overflow-x-auto px-3 sm:px-4">
        {TABS.map((tab) => {
          const active = pathname === tab.href;

          return (
            <li key={tab.href} className="shrink-0">
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'press-soft flex h-full items-center whitespace-nowrap px-3 pb-1 outline-none transition-[font-size] duration-200 first:pl-0',
                  active
                    ? 'border-b-2 border-[#222] text-[18px] font-bold text-[#222]'
                    : 'text-[16px] text-[#222]',
                )}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
