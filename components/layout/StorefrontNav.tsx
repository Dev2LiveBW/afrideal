'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { AnimatePresence, motion } from 'framer-motion';
import { LogOut, Menu, Package, ShoppingBag, User, X } from 'lucide-react';

import { AfriDealLogo } from '@/components/brand/AfriDealLogo';
import { GoldButton } from '@/components/brand/GoldButton';
import { cartCount, useAfriDealStore } from '@/store/useAfriDealStore';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '/browse', label: 'Browse' },
  { href: '/browse?category=c3', label: 'Building' },
  { href: '/browse?category=c4', label: 'Agriculture' },
  { href: '/orders', label: 'My orders' },
];

/**
 * Storefront navigation — a floating pill that detaches from the top and gains
 * a glass ground once the page scrolls under it.
 */
export function StorefrontNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const cart = useAfriDealStore((state) => state.cart);
  const pulse = useAfriDealStore((state) => state.cartPulse);

  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Cart state is persisted, so read it only after hydration to avoid a
  // server/client count mismatch on first paint.
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setMenuOpen(false), [pathname]);

  const count = mounted ? cartCount(cart) : 0;
  const onDarkHero = pathname === '/' && !scrolled;

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center px-4 pt-4 md:pt-6">
        <motion.nav
          animate={{
            backgroundColor: scrolled ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0)',
            borderColor: scrolled ? 'rgba(23,26,24,0.08)' : 'rgba(255,255,255,0)',
          }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            'pointer-events-auto flex w-full max-w-market items-center gap-4 rounded-full border px-4 py-2.5 md:px-5',
            scrolled && 'shadow-card backdrop-blur-xl',
          )}
        >
          <Link href="/" className="shrink-0">
            <AfriDealLogo variant={onDarkHero ? 'dark' : 'light'} size="sm" />
          </Link>

          <div className="mx-auto hidden items-center gap-1 md:flex">
            {LINKS.map((link) => {
              const active = pathname === link.href.split('?')[0];
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'rounded-full px-3.5 py-2 text-[13.5px] font-medium transition-colors duration-200',
                    onDarkHero
                      ? 'text-white/70 hover:bg-white/10 hover:text-white'
                      : active
                        ? 'bg-ink/[0.06] text-ink'
                        : 'text-body hover:bg-ink/[0.04] hover:text-ink',
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2 md:ml-0">
            <Link
              href="/cart"
              aria-label={`Cart, ${count} item${count === 1 ? '' : 's'}`}
              className={cn(
                'relative rounded-full p-2.5 transition-colors',
                onDarkHero ? 'text-white/80 hover:bg-white/10' : 'text-body hover:bg-ink/[0.05] hover:text-ink',
              )}
            >
              <ShoppingBag size={18} strokeWidth={1.5} />
              <AnimatePresence>
                {count > 0 && (
                  <motion.span
                    key={pulse}
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: [0.4, 1.25, 1], opacity: 1 }}
                    transition={{ duration: 0.42, ease: [0.34, 1.56, 0.64, 1] }}
                    className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-gold px-1 font-mono text-[10px] font-semibold tabular-nums text-ink"
                  >
                    {count}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>

            {session?.user ? (
              <div className="hidden items-center gap-2 md:flex">
                <Link
                  href="/orders"
                  className={cn(
                    'flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3.5 transition-colors',
                    onDarkHero ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-ink/[0.05] text-ink hover:bg-ink/[0.08]',
                  )}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gold font-mono text-[10.5px] font-semibold text-ink">
                    {session.user.avatar}
                  </span>
                  <span className="text-[13px] font-medium">
                    {session.user.name?.split(' ')[0]}
                  </span>
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  aria-label="Sign out"
                  className={cn(
                    'rounded-full p-2.5 transition-colors',
                    onDarkHero ? 'text-white/70 hover:bg-white/10' : 'text-muted hover:bg-ink/[0.05] hover:text-ink',
                  )}
                >
                  <LogOut size={16} strokeWidth={1.5} />
                </button>
              </div>
            ) : (
              <GoldButton
                size="sm"
                variant={onDarkHero ? 'gold' : 'ink'}
                className="hidden md:inline-flex"
                onClick={() => {
                  window.location.href = '/login';
                }}
              >
                Sign in
              </GoldButton>
            )}

            <button
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              className={cn(
                'rounded-full p-2.5 transition-colors md:hidden',
                onDarkHero ? 'text-white' : 'text-ink',
              )}
            >
              <Menu size={19} strokeWidth={1.5} />
            </button>
          </div>
        </motion.nav>
      </div>

      {/* Mobile overlay */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-50 bg-ink/95 backdrop-blur-xl md:hidden"
          >
            <div className="flex h-16 items-center justify-between px-5">
              <AfriDealLogo variant="dark" size="sm" />
              <button onClick={() => setMenuOpen(false)} aria-label="Close menu" className="p-2 text-white">
                <X size={22} strokeWidth={1.5} />
              </button>
            </div>

            <nav className="px-6 pt-8">
              {[...LINKS, { href: '/cart', label: 'Cart' }].map((link, index) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.06 + index * 0.05, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Link
                    href={link.href}
                    className="block border-b border-white/10 py-4 font-display text-[26px] font-semibold text-white"
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}

              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.36, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="pt-8"
              >
                {session?.user ? (
                  <GoldButton variant="gold" size="lg" className="w-full" onClick={() => signOut({ callbackUrl: '/' })} icon={<LogOut size={16} strokeWidth={1.5} />}>
                    Sign out
                  </GoldButton>
                ) : (
                  <Link href="/login">
                    <GoldButton variant="gold" size="lg" className="w-full" withArrow>
                      Sign in
                    </GoldButton>
                  </Link>
                )}
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export function StorefrontFooter() {
  return (
    <footer className="grain relative overflow-hidden bg-ink text-white">
      <div className="mx-auto max-w-market px-6 py-16">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <AfriDealLogo variant="dark" size="md" />
            <p className="measure mt-4 text-[13.5px] leading-6 text-white/55">
              Every order is paid into escrow and held until you confirm delivery. Suppliers are
              verified before they can list, and routed on reliability rather than the lowest price.
            </p>
          </div>

          {[
            { heading: 'Marketplace', links: [['Browse all', '/browse'], ['Building materials', '/browse?category=c3'], ['Agriculture', '/browse?category=c4'], ['Your orders', '/orders']] },
            { heading: 'Suppliers', links: [['Become a supplier', '/login'], ['Supplier portal', '/supplier/dashboard'], ['Verification', '/login']] },
            { heading: 'Platform', links: [['Runner portal', '/runner/dashboard'], ['Admin console', '/admin/dashboard'], ['Sign in', '/login']] },
          ].map((column) => (
            <div key={column.heading}>
              <p className="font-mono text-eyebrow font-medium uppercase text-white/35">
                {column.heading}
              </p>
              <ul className="mt-4 space-y-2.5">
                {column.links.map(([label, href]) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="text-[13.5px] text-white/65 transition-colors hover:text-gold-light"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6">
          <p className="text-[12.5px] text-white/40">
            © {new Date().getFullYear()} AfriDeal. Gaborone, Botswana.
          </p>
          <p className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-white/35">
            <Package size={13} strokeWidth={1.5} />
            Escrow-backed · DPO Pay · Orange Money · PayGate
          </p>
        </div>
      </div>
    </footer>
  );
}
