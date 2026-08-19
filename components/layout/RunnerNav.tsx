'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Briefcase, LayoutDashboard, LogOut, Wallet } from 'lucide-react';

import { AfriDealLogo } from '@/components/brand/AfriDealLogo';
import { cn } from '@/lib/utils';

/**
 * Runner navigation — mobile-first.
 *
 * A runner uses this one-handed, in a vehicle, in daylight. So: a fixed bottom
 * bar with large tap targets rather than a sidebar, and nothing that requires
 * precision.
 */

const TABS = [
  { href: '/runner/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/runner/jobs', label: 'Jobs', icon: Briefcase },
  { href: '/runner/earnings', label: 'Earnings', icon: Wallet },
];

export function RunnerTopbar({ name, avatar }: { name: string; avatar: string }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/[0.08] bg-ink px-5">
      <AfriDealLogo variant="dark" size="sm" />

      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-[13px] font-medium leading-tight text-white">{name}</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/40">Runner</p>
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold font-mono text-[12px] font-semibold text-ink">
          {avatar}
        </span>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          aria-label="Sign out"
          className="rounded-full p-2 text-white/45 transition-colors hover:bg-white/10 hover:text-white"
        >
          <LogOut size={16} strokeWidth={1.5} />
        </button>
      </div>
    </header>
  );
}

export function RunnerTabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-surface-raised/95 backdrop-blur-md">
      <ul className="mx-auto flex max-w-lg">
        {TABS.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          const Icon = tab.icon;

          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className={cn(
                  'relative flex flex-col items-center gap-1 py-3 transition-colors',
                  active ? 'text-gold-dark' : 'text-muted',
                )}
              >
                {active && (
                  <motion.span
                    layoutId="runner-tab"
                    className="absolute inset-x-6 top-0 h-[2px] rounded-full bg-gold"
                  />
                )}
                <Icon size={20} strokeWidth={1.5} />
                <span className="text-[11px] font-medium">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
