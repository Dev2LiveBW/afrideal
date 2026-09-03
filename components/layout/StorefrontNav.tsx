'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeftRight,
  ChevronDown,
  Grid2x2,
  Home,
  LogOut,
  MapPin,
  Menu,
  Package,
  PackageSearch,
  Search,
  ShoppingBag,
  User,
  X,
} from 'lucide-react';

import { AfriDealLogo } from '@/components/brand/AfriDealLogo';
import { GoldButton } from '@/components/brand/GoldButton';
import { DELIVERY_CITIES, cartCount, useAfriDealStore } from '@/store/useAfriDealStore';
import { cn } from '@/lib/utils';

/**
 * Storefront navigation, built phone-first.
 *
 * The previous floating pill was a desktop idea: it hid search, put the cart
 * behind a hamburger and left the thumb with nothing to reach. This is the
 * layout the marketplace mocks call for — a plain sticky bar, search on the
 * shelf screens, and a tab bar pinned to the bottom of the viewport where a
 * thumb actually lands. Everything scales up rather than down.
 */

const LINKS = [
  { href: '/browse', label: 'Browse' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/how-it-works', label: 'How it works' },
  { href: '/request-a-runner', label: 'Runners' },
  { href: '/orders', label: 'My orders' },
];

/** Screens that shop. Search and the delivery bar only make sense on these. */
const SHELF_ROUTES = ['/', '/browse'];

function DeliverToPicker() {
  const deliverTo = useAfriDealStore((state) => state.deliverTo);
  const setDeliverTo = useAfriDealStore((state) => state.setDeliverTo);

  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Persisted, so read it only after hydration or the server and client
  // disagree about the city on first paint.
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;

    const onClick = (event: MouseEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);

    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const city = mounted ? deliverTo : 'Gaborone';

  return (
    <div ref={boxRef} className="relative min-w-0 flex-1">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex w-full items-center gap-2 rounded-full bg-surface-raised px-3.5 py-2.5 text-left ring-1 ring-inset ring-hairline transition-colors hover:ring-hairline-strong"
      >
        <MapPin size={15} strokeWidth={1.6} className="shrink-0 text-forest" />
        <span className="min-w-0 flex-1 truncate text-[12.5px] text-body">
          Deliver to: <span className="font-medium text-ink">{city}, Botswana</span>
        </span>
        <ChevronDown
          size={15}
          strokeWidth={1.6}
          className={cn('shrink-0 text-muted transition-transform', open && 'rotate-180')}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-64 overflow-y-auto rounded-md border border-hairline bg-surface-raised py-1 shadow-lift"
          >
            {DELIVERY_CITIES.map((option) => (
              <li key={option}>
                <button
                  type="button"
                  role="option"
                  aria-selected={option === city}
                  onClick={() => {
                    setDeliverTo(option);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[13px] transition-colors hover:bg-ink/[0.04]',
                    option === city ? 'font-medium text-ink' : 'text-body',
                  )}
                >
                  <MapPin
                    size={13}
                    strokeWidth={1.6}
                    className={option === city ? 'text-forest' : 'text-muted'}
                  />
                  {option}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

function SearchField({ initial }: { initial: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(initial);

  useEffect(() => setQuery(initial), [initial]);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const trimmed = query.trim();
        router.push(trimmed ? `/browse?q=${encodeURIComponent(trimmed)}` : '/browse');
      }}
      className="relative w-full"
    >
      <Search
        size={17}
        strokeWidth={1.6}
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
      />
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        type="search"
        aria-label="Search products, brands or categories"
        placeholder="Search products, brands or categories"
        className="h-11 w-full rounded-full bg-surface-sunk/70 pl-11 pr-4 text-[13.5px] text-ink placeholder:text-muted focus:bg-surface-raised focus:outline-none focus:ring-1 focus:ring-inset focus:ring-gold"
      />
    </form>
  );
}

export function StorefrontNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const cart = useAfriDealStore((state) => state.cart);
  const pulse = useAfriDealStore((state) => state.cartPulse);

  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [compact, setCompact] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => setMenuOpen(false), [pathname]);

  /**
   * Search and the delivery bar fold away once the shopper is past the fold.
   *
   * Pinned, all three rows eat 190px of a 844px phone screen — a quarter of the
   * viewport spent on chrome the shopper has already used. Folding them keeps
   * the logo and cart reachable while giving the shelf its height back, and
   * they come straight back at the top of the page where search is what the
   * screen is for.
   */
  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 120);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const count = mounted ? cartCount(cart) : 0;
  const onShelf = SHELF_ROUTES.includes(pathname);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-hairline bg-surface-raised/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-market items-center gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="shrink-0">
            <AfriDealLogo variant="light" size="sm" />
          </Link>

          {/* Search takes the middle of the bar from `md` up; on a phone it
              drops to its own full-width row underneath. */}
          {onShelf && (
            <div className="mx-auto hidden max-w-xl flex-1 md:block">
              <SearchField initial="" />
            </div>
          )}

          <nav className="ml-auto hidden items-center gap-1 lg:flex">
            {LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'rounded-full px-3 py-2 text-[13px] font-medium transition-colors',
                    active ? 'bg-ink/[0.06] text-ink' : 'text-body hover:bg-ink/[0.04] hover:text-ink',
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className={cn('flex shrink-0 items-center gap-1', !onShelf && 'ml-auto', 'lg:ml-2')}>
            <Link
              href="/cart"
              aria-label={`Cart, ${count} item${count === 1 ? '' : 's'}`}
              className="relative rounded-full p-2.5 text-body transition-colors hover:bg-ink/[0.05] hover:text-ink"
            >
              <ShoppingBag size={20} strokeWidth={1.5} />
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
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                aria-label="Sign out"
                className="hidden rounded-full p-2.5 text-muted transition-colors hover:bg-ink/[0.05] hover:text-ink lg:block"
              >
                <LogOut size={18} strokeWidth={1.5} />
              </button>
            ) : (
              <Link href="/login" className="hidden lg:block">
                <GoldButton size="sm" variant="ink">
                  Sign in
                </GoldButton>
              </Link>
            )}

            <button
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              className="rounded-full p-2.5 text-ink transition-colors hover:bg-ink/[0.05] lg:hidden"
            >
              <Menu size={21} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {onShelf && (
          <div
            className={cn(
              'mx-auto max-w-market overflow-hidden px-4 transition-[max-height,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] sm:px-6',
              compact ? 'max-h-0 opacity-0' : 'max-h-40 pb-3 opacity-100',
            )}
          >
            <div className="md:hidden">
              <SearchField initial="" />
            </div>

            <div className="mt-2.5 flex items-center gap-2 md:mt-0">
              <DeliverToPicker />
              <Link
                href="/orders"
                className="flex shrink-0 items-center gap-2 rounded-full bg-surface-raised px-3.5 py-2.5 text-[12.5px] font-medium text-body ring-1 ring-inset ring-hairline transition-colors hover:text-ink"
              >
                <PackageSearch size={15} strokeWidth={1.6} className="text-muted" />
                <span className="hidden sm:inline">Track order</span>
                <span className="sm:hidden">Track</span>
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ── Mobile menu ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-50 bg-ink/95 backdrop-blur-xl lg:hidden"
          >
            <div className="flex h-16 items-center justify-between px-5">
              <AfriDealLogo variant="dark" size="sm" />
              <button
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
                className="p-2 text-white"
              >
                <X size={22} strokeWidth={1.5} />
              </button>
            </div>

            <nav className="px-6 pt-4">
              {[...LINKS, { href: '/cart', label: 'Cart' }].map((link, index) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 + index * 0.04, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Link
                    href={link.href}
                    className="block border-b border-white/10 py-3.5 font-display text-[22px] font-semibold text-white"
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.32, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="pt-7"
              >
                {session?.user ? (
                  <GoldButton
                    variant="gold"
                    size="lg"
                    className="w-full"
                    onClick={() => signOut({ callbackUrl: '/' })}
                    icon={<LogOut size={16} strokeWidth={1.5} />}
                  >
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

/**
 * The thumb rail.
 *
 * Five destinations, fixed to the bottom of the viewport on phones and tablets
 * and gone from `lg` up, where the header has room for the same links. Padded
 * for the home indicator through `env(safe-area-inset-bottom)`, which is why
 * the root viewport is declared `viewport-fit=cover`.
 */
const TABS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/browse', label: 'Categories', icon: Grid2x2 },
  { href: '/pricing', label: 'Compare', icon: ArrowLeftRight },
  { href: '/orders', label: 'Orders', icon: Package },
  { href: '/login', label: 'Account', icon: User },
];

export function MobileTabBar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-surface-raised/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      <ul className="mx-auto flex max-w-market">
        {TABS.map((tab) => {
          // Signed in, the account tab is the buyer's own area rather than the
          // sign-in screen they have already been through.
          const href = tab.href === '/login' && session?.user ? '/orders' : tab.href;
          const active = pathname === tab.href;

          return (
            <li key={tab.label} className="flex-1">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center gap-1 py-2.5 transition-colors',
                  active ? 'text-gold-dark' : 'text-muted hover:text-ink',
                )}
              >
                <tab.icon size={20} strokeWidth={active ? 2 : 1.5} />
                <span className={cn('text-[10.5px] leading-3', active && 'font-medium')}>
                  {tab.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function StorefrontFooter() {
  return (
    <footer className="grain relative overflow-hidden bg-ink text-white">
      <div className="mx-auto max-w-market px-5 py-12 sm:px-6 sm:py-16">
        <div className="grid gap-9 sm:grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <AfriDealLogo variant="dark" size="md" />
            <p className="measure mt-4 text-[13px] leading-6 text-white/55">
              Every order is paid into escrow and held until you confirm delivery. Suppliers are
              verified before they can list, and routed on reliability rather than the lowest price.
            </p>
          </div>

          {[
            {
              heading: 'Marketplace',
              links: [
                ['Browse all', '/browse'],
                ['How pricing works', '/pricing'],
                ['Request a runner', '/request-a-runner'],
                ['Your orders', '/orders'],
              ],
            },
            {
              heading: 'Suppliers',
              links: [
                ['Become a supplier', '/login'],
                ['Supplier portal', '/supplier/dashboard'],
                ['Verification', '/login'],
              ],
            },
            {
              heading: 'Platform',
              links: [
                ['How AfriDeal works', '/how-it-works'],
                ['Runner portal', '/runner/dashboard'],
                ['Admin console', '/admin/dashboard'],
                ['Sign in', '/login'],
              ],
            },
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

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6">
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
