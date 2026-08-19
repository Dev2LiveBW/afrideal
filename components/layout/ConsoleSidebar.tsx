'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, LogOut } from 'lucide-react';

import { AfriDealLogo, AfriDealMark } from '@/components/brand/AfriDealLogo';
import { useAfriDealStore } from '@/store/useAfriDealStore';
import { cn } from '@/lib/utils';

/**
 * The console sidebar, shared by the admin and supplier portals.
 *
 * Admin runs it dark with gold active states; supplier runs it light with
 * forest. Same structure in both so the two portals feel like one product, and
 * so a nav item never moves between them.
 */

export interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

export interface NavSection {
  heading?: string;
  items: NavItem[];
}

export function ConsoleSidebar({
  sections,
  tone,
  portalLabel,
  user,
}: {
  sections: NavSection[];
  tone: 'dark' | 'light';
  portalLabel: string;
  user: { name: string; avatar: string; roleLabel: string };
}) {
  const pathname = usePathname();
  const collapsed = useAfriDealStore((state) => state.sidebarCollapsed);
  const toggle = useAfriDealStore((state) => state.toggleSidebar);

  const dark = tone === 'dark';

  return (
    <motion.aside
      animate={{ width: collapsed ? 76 : 252 }}
      transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'sticky top-0 z-30 flex h-screen shrink-0 flex-col',
        dark ? 'bg-ink text-white' : 'border-r border-hairline bg-surface-raised text-ink',
      )}
    >
      {/* Brand */}
      <div
        className={cn(
          'flex h-16 shrink-0 items-center px-5',
          dark ? 'border-b border-white/[0.08]' : 'border-b border-hairline',
        )}
      >
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          {collapsed ? (
            <AfriDealMark size={26} tone={dark ? 'light' : 'brand'} />
          ) : (
            <AfriDealLogo variant={dark ? 'dark' : 'light'} size="sm" />
          )}
        </Link>
      </div>

      {!collapsed && (
        <p
          className={cn(
            'px-5 pb-1 pt-4 font-mono text-eyebrow font-medium uppercase',
            dark ? 'text-white/35' : 'text-muted',
          )}
        >
          {portalLabel}
        </p>
      )}

      {/* Nav */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-3">
        {sections.map((section, sectionIndex) => (
          <div key={section.heading ?? sectionIndex}>
            {section.heading && !collapsed && (
              <p
                className={cn(
                  'mb-1.5 px-2.5 font-mono text-[10px] uppercase tracking-[0.16em]',
                  dark ? 'text-white/30' : 'text-muted',
                )}
              >
                {section.heading}
              </p>
            )}

            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== '/' && pathname.startsWith(`${item.href}/`));

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        'group relative flex items-center gap-3 rounded px-2.5 py-2.5 text-[13.5px] font-medium',
                        'transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]',
                        collapsed && 'justify-center',
                        active
                          ? dark
                            ? 'bg-gold/[0.16] text-gold-light'
                            : 'bg-forest-wash text-forest'
                          : dark
                            ? 'text-white/60 hover:bg-white/[0.06] hover:text-white'
                            : 'text-body hover:bg-ink/[0.04] hover:text-ink',
                      )}
                    >
                      {/* Active rail — 2px, and only on the active item. */}
                      {active && (
                        <motion.span
                          layoutId={`rail-${tone}`}
                          className={cn(
                            'absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full',
                            dark ? 'bg-gold' : 'bg-forest',
                          )}
                        />
                      )}

                      <span className="shrink-0">{item.icon}</span>

                      <AnimatePresence initial={false}>
                        {!collapsed && (
                          <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="truncate"
                          >
                            {item.label}
                          </motion.span>
                        )}
                      </AnimatePresence>

                      {item.badge !== undefined && item.badge > 0 && !collapsed && (
                        <span
                          className={cn(
                            'ml-auto shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums',
                            dark ? 'bg-gold text-ink' : 'bg-forest text-white',
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Account */}
      <div className={cn('shrink-0 p-3', dark ? 'border-t border-white/[0.08]' : 'border-t border-hairline')}>
        <div className={cn('flex items-center gap-2.5 rounded px-2 py-2', collapsed && 'justify-center')}>
          <span
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-semibold',
              dark ? 'bg-white/10 text-white' : 'bg-forest-wash text-forest',
            )}
          >
            {user.avatar}
          </span>

          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className={cn('truncate text-[13px] font-medium', dark ? 'text-white' : 'text-ink')}>
                {user.name}
              </p>
              <p className={cn('truncate text-[11px]', dark ? 'text-white/45' : 'text-muted')}>
                {user.roleLabel}
              </p>
            </div>
          )}

          {!collapsed && (
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              title="Sign out"
              className={cn(
                'shrink-0 rounded p-1.5 transition-colors',
                dark ? 'text-white/45 hover:bg-white/10 hover:text-white' : 'text-muted hover:bg-ink/[0.05] hover:text-ink',
              )}
            >
              <LogOut size={15} strokeWidth={1.5} />
            </button>
          )}
        </div>

        <button
          onClick={toggle}
          className={cn(
            'mt-1 flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-[12px] transition-colors',
            collapsed && 'justify-center',
            dark ? 'text-white/40 hover:bg-white/[0.06] hover:text-white' : 'text-muted hover:bg-ink/[0.04] hover:text-ink',
          )}
        >
          <ChevronLeft
            size={15}
            strokeWidth={1.5}
            className={cn('transition-transform duration-300', collapsed && 'rotate-180')}
          />
          {!collapsed && 'Collapse'}
        </button>
      </div>
    </motion.aside>
  );
}
