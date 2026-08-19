'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Search } from 'lucide-react';

import { relative } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { AppNotification } from '@/types';

export function ConsoleTopbar({
  title,
  breadcrumb,
  notifications = [],
  action,
}: {
  title: string;
  breadcrumb?: { label: string; href?: string }[];
  notifications?: AppNotification[];
  action?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const unread = notifications.filter((notification) => !notification.read).length;

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-4 border-b border-hairline bg-surface/85 px-6 backdrop-blur-md">
      <div className="min-w-0 flex-1">
        {breadcrumb && breadcrumb.length > 0 && (
          <nav className="mb-0.5 flex items-center gap-1.5 text-[11.5px] text-muted">
            {breadcrumb.map((crumb, index) => (
              <span key={crumb.label} className="flex items-center gap-1.5">
                {index > 0 && <span className="text-hairline-strong">/</span>}
                {crumb.href ? (
                  <Link href={crumb.href} className="transition-colors hover:text-ink">
                    {crumb.label}
                  </Link>
                ) : (
                  <span>{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <h1 className="truncate text-[15px] font-semibold text-ink">{title}</h1>
      </div>

      {action}

      <div className="hidden items-center gap-2 rounded-full border border-hairline bg-surface-raised px-3 py-2 md:flex">
        <Search size={14} strokeWidth={1.5} className="text-muted" />
        <input
          type="search"
          placeholder="Search orders, suppliers…"
          className="w-44 bg-transparent text-[13px] text-ink outline-none placeholder:text-muted"
        />
      </div>

      <div className="relative">
        <button
          onClick={() => setOpen((value) => !value)}
          aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ''}`}
          className="relative rounded-full border border-hairline bg-surface-raised p-2.5 text-body transition-colors hover:text-ink"
        >
          <Bell size={15} strokeWidth={1.5} />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 font-mono text-[9.5px] font-semibold tabular-nums text-ink">
              {unread}
            </span>
          )}
        </button>

        <AnimatePresence>
          {open && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.99 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="absolute right-0 top-[calc(100%+8px)] z-20 w-80 overflow-hidden rounded-md border border-hairline bg-surface-raised shadow-lift"
              >
                <div className="border-b border-hairline px-4 py-3">
                  <p className="text-[13px] font-semibold text-ink">Notifications</p>
                </div>

                {notifications.length === 0 ? (
                  <p className="px-4 py-6 text-center text-[12.5px] text-muted">Nothing new.</p>
                ) : (
                  <ul className="max-h-80 overflow-y-auto">
                    {notifications.slice(0, 6).map((notification) => (
                      <li
                        key={notification.id}
                        className={cn(
                          'border-b border-hairline px-4 py-3 last:border-0',
                          !notification.read && 'bg-gold/[0.045]',
                        )}
                      >
                        <p className="text-[13px] font-medium text-ink">{notification.title}</p>
                        <p className="mt-0.5 text-[12px] leading-5 text-body">{notification.body}</p>
                        <p className="mt-1 font-mono text-[10.5px] tabular-nums text-muted">
                          {relative(notification.at)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
