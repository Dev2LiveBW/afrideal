'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronDown,
  ChevronRight,
  Grid2x2,
  Home,
  LogOut,
  MapPin,
  Menu,
  Package,
  Search,
  ShoppingCart,
  User,
  X,
} from 'lucide-react';

import { AfriDealLogo } from '@/components/brand/AfriDealLogo';
import { markTabNavigation } from '@/components/motion/PageTransition';
import { CategoryIcon } from '@/components/storefront/CategoryIcon';
import { DELIVERY_CITIES, cartCount, useAfriDealStore } from '@/store/useAfriDealStore';
import type { Category } from '@/types';
import {
  DIRECTORY_IN_NAV,
  DIRECTORY_LABEL,
  DIRECTORY_ROUTE,
} from '@/lib/directory-placement';
import { cn } from '@/lib/utils';

/**
 * Where to deliver.
 *
 * Was a label with a chevron that did nothing. The chevron promised a control,
 * so this is the control: ten cities, persisted, and read only after hydration
 * because a persisted value differs from what the server rendered and React
 * would otherwise flag the mismatch on first paint.
 */
function DeliverToPicker() {
  const deliverTo = useAfriDealStore((state) => state.deliverTo);
  const setDeliverTo = useAfriDealStore((state) => state.setDeliverTo);

  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

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
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex max-w-full items-center gap-1.5 text-[11.5px] text-gray-600 hover:text-gray-900 sm:text-[12px]"
      >
        <MapPin size={13} className="shrink-0 text-[#E67E22]" />
        {/* "Deliver to:" and the country are dropped below `sm`; the pin says it. */}
        <span className="truncate">
          <span className="hidden sm:inline">Deliver to: </span>
          <span className="font-semibold text-gray-900">{city}<span className="hidden sm:inline">, Botswana</span></span>
        </span>
        <ChevronDown
          size={13}
          className={cn('text-gray-400 transition-transform', open && 'rotate-180')}
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
            className="absolute left-0 top-[calc(100%+6px)] z-50 max-h-64 w-56 overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
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
                    'flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[13px] transition-colors hover:bg-gray-50',
                    option === city ? 'font-semibold text-gray-900' : 'text-gray-600',
                  )}
                >
                  <MapPin
                    size={13}
                    className={option === city ? 'text-[#E67E22]' : 'text-gray-300'}
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

/**
 * The search field. Benchmark §3a, measured live: a 34px pill on `#f4f4f4`
 * with 16px of left padding, the text at 16px (which is also what stops iOS
 * zooming the page when the field is tapped), and a 40×26 black pill at the
 * right end holding a white magnifier - the button dips to 80% while it is
 * pressed. No border, no ring.
 *
 * The placeholder rolls. The benchmark keeps a list of live searches and
 * drops a new one into the empty field every few seconds (`slideIn`, .3s
 * ease-in, from above). Submitting the field empty searches for whatever
 * term is showing, which is what makes the rolling worth doing: the reader
 * can take the suggestion with one tap.
 */
const TICKER_MS = 3000;

function SearchField({ terms }: { terms: string[] }) {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (terms.length < 2) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % terms.length), TICKER_MS);
    return () => window.clearInterval(id);
  }, [terms.length]);

  const showing = terms[index];
  const rolling = terms.length > 0 && !focused && value === '';

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const term = (value.trim() || showing || '').trim();
    router.push(term ? `/browse?q=${encodeURIComponent(term)}` : '/browse');
  }

  return (
    <form
      role="search"
      onSubmit={submit}
      className="flex h-[34px] min-w-0 flex-1 items-center rounded-full bg-[#f4f4f4] pl-4 pr-1"
    >
      <label htmlFor="storefront-search" className="sr-only">
        Search products
      </label>
      <div className="relative h-[22px] min-w-0 flex-1">
        <input
          id="storefront-search"
          type="search"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={rolling ? '' : 'Search products'}
          autoComplete="off"
          className="h-full w-full bg-transparent p-0 text-[16px] leading-[22px] text-[#222] outline-none placeholder:text-[#b8b8b8] sm:text-[14px]"
        />
        {rolling && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden"
          >
            <span
              key={showing}
              className="block animate-ticker-in truncate text-[13px] leading-[22px] text-[#b8b8b8]"
            >
              {showing}
            </span>
          </span>
        )}
      </div>
      <button
        type="submit"
        aria-label="Search"
        className="press ml-1 flex h-[26px] w-10 shrink-0 items-center justify-center rounded-full bg-[#222] text-white"
      >
        <Search size={15} strokeWidth={2.5} aria-hidden="true" />
      </button>
    </form>
  );
}

export function StorefrontNav({
  categories = [],
  hotSearches = [],
}: {
  categories?: Category[];
  /** What the search field suggests while it is empty. */
  hotSearches?: string[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const cart = useAfriDealStore((state) => state.cart);
  const pulse = useAfriDealStore((state) => state.cartPulse);

  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [compact, setCompact] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => setMenuOpen(false), [pathname]);

  /**
   * The delivery row folds away once the shopper is past the fold.
   *
   * Both rows pinned cost 190px of an 844px phone screen — nearly a quarter of
   * the viewport spent on chrome the shopper has already used. Search stays,
   * because search is what a marketplace header is for; the delivery row goes,
   * and comes straight back at the top of the page.
   */
  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 120);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const count = mounted ? cartCount(cart) : 0;

  return (
    <>
      <header className="sticky top-0 z-40 bg-white shadow-[0_1px_0_rgba(0,0,0,0.12)]">
        {/*
          Row 1: Logo | Search | Controls. Benchmark §3a: 50px tall, the
          logo at the left, the search pill taking the rest. The cart is
          not up here on a phone - it is a tab on the bottom bar, as on the
          benchmark - and comes back from `md`, where there is no bar.
        */}
        <div className="mx-auto flex h-[50px] max-w-[1400px] items-center gap-2 px-3 sm:h-14 sm:gap-3 sm:px-4">
          <Link href="/" className="shrink-0">
            <AfriDealLogo variant="light" size="sm" />
          </Link>

          <SearchField terms={hotSearches} />

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <Link
              href="/cart"
              aria-label={`Cart, ${count} item${count === 1 ? '' : 's'}`}
              className="relative hidden h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-gray-100 md:flex"
            >
              <ShoppingCart size={20} strokeWidth={1.75} className="text-gray-700" />
              <AnimatePresence>
                {count > 0 && (
                  <motion.span
                    key={pulse}
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: [0.4, 1.25, 1], opacity: 1 }}
                    transition={{ duration: 0.42, ease: [0.34, 1.56, 0.64, 1] }}
                    className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#E67E22] px-1 font-mono text-[10px] font-semibold tabular-nums text-white"
                  >
                    {count}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>

            {session?.user ? (
              <div className="hidden items-center gap-2 md:flex">
                <Link href="/orders" className="flex items-center gap-2 rounded-full bg-gray-100 py-1.5 pl-1.5 pr-3.5 hover:bg-gray-200 transition-colors">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#27AE60] font-mono text-[10.5px] font-semibold text-white">
                    {session.user.avatar}
                  </span>
                  <span className="text-[13px] font-medium text-gray-800">{session.user.name?.split(' ')[0]}</span>
                </Link>
                <button onClick={() => signOut({ callbackUrl: '/' })} aria-label="Sign out" className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors">
                  <LogOut size={16} strokeWidth={1.5} />
                </button>
              </div>
            ) : (
              <div className="hidden items-center gap-2 md:flex">
                <Link href="/login" className="rounded-full px-4 py-2 text-[13px] font-medium text-gray-700 hover:bg-gray-100 transition-colors">Sign in</Link>
                <button onClick={() => router.push('/signup')} className="press rounded-full bg-[#E67E22] px-4 py-2 text-[13px] font-bold text-white hover:bg-[#D35400] transition-colors">Sign up</button>
              </div>
            )}

            <button onClick={() => setMenuOpen(true)} aria-label="Open menu" className="press flex h-9 w-9 items-center justify-center rounded-full md:hidden">
              <Menu size={22} strokeWidth={1.75} className="text-[#222]" />
            </button>
          </div>
        </div>

        {/* Row 2: Location | Track order */}
        <div
          className={cn(
            'border-t border-gray-100 bg-white transition-[max-height,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
            /*
             * Clipped only while collapsing — that is what hides the row. Left
             * clipped when open it would also cut off the delivery dropdown,
             * which escapes this box by design.
             */
            compact ? 'max-h-0 overflow-hidden border-t-0 opacity-0' : 'max-h-16 opacity-100',
          )}
        >
          {/*
            A strip. Three links on the right and a city on the left is more
            than 360px holds at 12px, so nothing here may wrap: the links keep
            their words, the picker takes what is left and truncates.
          */}
          <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3 px-3 py-1.5 sm:px-4">
            <div className="min-w-0 flex-1 truncate">
              <DeliverToPicker />
            </div>
            <div className="flex shrink-0 items-center gap-2.5 sm:gap-4">
              {/*
                TODO(TICKET-007): temporary entry point. The supplier / product
                directory's final placement - homepage section, dedicated page or a
                nav tab of its own - is unconfirmed. Toggle with DIRECTORY_IN_NAV in
                lib/directory-placement.ts.
              */}
              {DIRECTORY_IN_NAV && (
                <Link
                  href={DIRECTORY_ROUTE}
                  className="whitespace-nowrap text-[11.5px] font-medium text-gray-600 hover:text-gray-900 sm:text-[12px]"
                >
                  {DIRECTORY_LABEL}
                </Link>
              )}
              {/* The quotation door TICKET-006 took off the front page, restored here. */}
              <Link href="/rfq" className="whitespace-nowrap text-[11.5px] font-medium text-gray-600 hover:text-gray-900 sm:text-[12px]">
                Get a quote
              </Link>
              <Link href="/orders" className="whitespace-nowrap text-[11.5px] font-medium text-[#E67E22] hover:underline sm:text-[12px]">
                Track order →
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile slide-out menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-50 bg-[#111]/95 backdrop-blur-xl md:hidden"
          >
            <div className="flex h-16 items-center justify-between px-5">
              <AfriDealLogo variant="dark" size="sm" />
              <button onClick={() => setMenuOpen(false)} aria-label="Close menu" className="p-2 text-white">
                <X size={22} strokeWidth={1.5} />
              </button>
            </div>

            <nav className="max-h-[calc(100dvh-4rem)] overflow-y-auto px-6 pb-10 pt-6">
              {[
                { href: '/browse', label: 'Browse' },
                // TODO(TICKET-007): temporary entry point, see the nav row above.
                { href: DIRECTORY_ROUTE, label: DIRECTORY_LABEL },
                { href: '/rfq', label: 'Request a quote' },
                { href: '/browse?category=hair-weaves-extensions', label: 'Hair & Weaves' },
                { href: '/request-a-runner', label: 'Request a runner' },
                { href: '/how-it-works', label: 'How it works' },
                { href: '/orders', label: 'My orders' },
                { href: '/cart', label: 'Cart' },
              ].map((link, index) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.06 + index * 0.05, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Link href={link.href} className="block border-b border-white/10 py-3.5 font-display text-[24px] font-semibold text-white">
                    {link.label}
                  </Link>
                </motion.div>
              ))}

              {categories.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  className="pt-7"
                >
                  <p className="font-mono text-[11px] font-medium uppercase tracking-widest text-white/55">Shop by category</p>
                  <ul className="mt-3">
                    {categories.map((category) => (
                      <li key={category.id}>
                        <Link href={`/browse?category=${category.slug}`} className="flex items-center gap-3.5 border-b border-white/[0.07] py-3 text-[15px] text-white/75 hover:text-[#E67E22] transition-colors">
                          <CategoryIcon categoryId={category.id} size={17} className="shrink-0 text-white/70" />
                          <span className="min-w-0 flex-1 truncate">{category.name}</span>
                          <ChevronRight size={15} strokeWidth={1.75} className="shrink-0 text-white/25" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.36, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="pt-8"
              >
                {session?.user ? (
                  <button onClick={() => signOut({ callbackUrl: '/' })} className="w-full rounded-full border border-white/25 py-3.5 text-center text-[14px] font-medium text-white hover:bg-white/10 transition-colors">Sign out</button>
                ) : (
                  <div className="space-y-3">
                    <button onClick={() => router.push('/signup')} className="w-full rounded-full bg-[#E67E22] py-3.5 text-[14px] font-bold text-white hover:bg-[#D35400] transition-colors">Create an account</button>
                    <Link href="/login" className="block rounded-full border border-white/15 py-3.5 text-center text-[14px] font-medium text-white hover:bg-white/10 transition-colors">Sign in</Link>
                  </div>
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
 * The thumb rail. Benchmark §3a, measured live: 56px, white, a 1px `#eee`
 * rule along its top, five equal tabs of a 26px icon over a 12px label, the
 * active one in the accent. Pinned to the bottom on phones and tablets,
 * gone from `md` up where the header carries the same links. Padded for
 * the home indicator through `env(safe-area-inset-bottom)`, which is why
 * the root viewport export declares `viewport-fit=cover`.
 *
 * `Home | Categories | Cart | Orders | Account` follows the benchmark's
 * `Home | Categories | Messenger | Cart | My Alibaba` as far as this
 * marketplace has the screens - we have no messenger, and the cart is the
 * tab the header gives up on a phone.
 *
 * Every tap here tells the page transition it is a tab switch, which the
 * benchmark performs as an instant swap rather than a push.
 */
const TABS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/categories', label: 'Categories', icon: Grid2x2 },
  { href: '/cart', label: 'Cart', icon: ShoppingCart },
  { href: '/orders', label: 'Orders', icon: Package },
  { href: '/login', label: 'Account', icon: User },
];

export function MobileTabBar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const cart = useAfriDealStore((state) => state.cart);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  const count = mounted ? cartCount(cart) : 0;

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#eee] bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="mx-auto flex h-14 max-w-[1400px] px-2">
        {TABS.map((tab) => {
          // Signed in, the account tab is the buyer's own area rather than the
          // sign-in screen they have already been through.
          const href = tab.href === '/login' && session?.user ? '/orders' : tab.href;
          const active = pathname === tab.href;

          return (
            <li key={tab.label} className="flex-1">
              <Link
                href={href}
                onClick={markTabNavigation}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'press-soft relative flex h-full flex-col items-center pt-[5px] outline-none transition-colors',
                  active ? 'text-[#E67E22]' : 'text-[#222]',
                )}
              >
                <span className="relative flex h-[26px] w-[26px] items-center justify-center">
                  <tab.icon size={24} strokeWidth={active ? 2.25 : 1.75} />
                  {tab.href === '/cart' && count > 0 && (
                    <span className="absolute -right-2 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#E67E22] px-1 font-mono text-[9.5px] font-bold leading-none text-white">
                      {count}
                    </span>
                  )}
                </span>
                <span className="mt-px text-[12px] leading-[14px]">{tab.label}</span>
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
    <footer className="relative overflow-hidden bg-[#1a2e1a] text-white">
      <div className="mx-auto max-w-[1400px] px-6 py-16">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <AfriDealLogo variant="dark" size="md" withTagline />
            <p className="mt-4 max-w-[280px] text-[13.5px] leading-6 text-white/65">
              A procurement marketplace for Botswana and South Africa. Verified suppliers, published pricing, and runner-assisted sourcing.
            </p>
          </div>

          {[
            { heading: 'Marketplace', links: [['Hair, weaves & extensions', '/browse?category=hair-weaves-extensions'], ['Beauty & personal care', '/browse?category=beauty-personal-care'], ['Browse all', '/browse'], ['Request a runner', '/request-a-runner'], ['How it works', '/how-it-works'], ['Your orders', '/orders']] },
            { heading: 'Suppliers', links: [['Become a supplier', '/login'], ['Supplier portal', '/supplier/dashboard'], ['Verification', '/login']] },
            { heading: 'Platform', links: [['Runner portal', '/runner/dashboard'], ['Admin console', '/admin/dashboard'], ['Create an account', '/signup'], ['Sign in', '/login']] },
          ].map((column) => (
            <div key={column.heading}>
              <p className="font-mono text-[11px] font-medium uppercase tracking-widest text-white/55">{column.heading}</p>
              <ul className="mt-4 space-y-2.5">
                {column.links.map(([label, href]) => (
                  <li key={label}><Link href={href} className="text-[13.5px] text-white/65 hover:text-[#E67E22] transition-colors">{label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-white/10 pt-6">
          <p className="text-[12px] leading-5 text-white/60">AfriDeal is not a payment provider. Customer payments are processed by licensed payment partners.</p>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
            <p className="text-[12.5px] text-white/60">\u00a9 {new Date().getFullYear()} AfriDeal. Gaborone, Botswana.</p>
            <p className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-white/55">
              <Package size={13} strokeWidth={1.5} />
              DPO Pay \u00b7 Orange Money \u00b7 PayGate
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
