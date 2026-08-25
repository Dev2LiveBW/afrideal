'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight, LogOut, Menu, Package, ShoppingBag, User, X } from 'lucide-react';

import { AfriDealLogo } from '@/components/brand/AfriDealLogo';
import { CategoryIcon } from '@/components/storefront/CategoryIcon';
import { GoldButton } from '@/components/brand/GoldButton';
import { cartCount, useAfriDealStore } from '@/store/useAfriDealStore';
import type { Category } from '@/types';
import { cn } from '@/lib/utils';

/*
 * Two category shortcuts at most, and they go to what the platform sells. This
 * used to point at Building Materials and Agriculture, which between them are
 * four listings - the header was advertising the tail of the catalogue.
 */
const LINKS = [
  { href: '/browse', label: 'Browse' },
  { href: '/browse?category=hair-weaves-extensions', label: 'Hair & Weaves' },
  { href: '/request-a-runner', label: 'Request a runner' },
  /*
   * The instruction manual, in the header rather than buried in the footer. A
   * marketplace whose whole argument is a published price ladder has to be able
   * to explain the ladder from any page a visitor happens to land on.
   */
  { href: '/how-it-works', label: 'How it works' },
  { href: '/orders', label: 'My orders' },
];

/**
 * Storefront navigation - a floating pill that detaches from the top and gains
 * a glass ground once the page scrolls under it.
 */
export function StorefrontNav({ categories = [] }: { categories?: Category[] }) {
  const pathname = usePathname();
  const router = useRouter();
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

  /*
   * The nav used to switch to white type at the top of the landing page, on the
   * assumption that the hero sat on a dark ground. It does not - the hero is on
   * the warm page surface and the only dark object is the price ladder beside
   * it - so every control in the header was white on #f5f5f5 until the first
   * scroll. Ink throughout: the pill still fades its own background in, which
   * is what the effect was actually for.
   */

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
            <AfriDealLogo variant="light" size="sm" />
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
                    active
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
                'text-body hover:bg-ink/[0.05] hover:text-ink',
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
                    'bg-ink/[0.05] text-ink hover:bg-ink/[0.08]',
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
                    'text-muted hover:bg-ink/[0.05] hover:text-ink',
                  )}
                >
                  <LogOut size={16} strokeWidth={1.5} />
                </button>
              </div>
            ) : (
              /*
                Sign in is the quieter of the two: anyone who already has an
                account knows to look for it, while a first-time visitor needs
                the account offer put in front of them. So registration takes
                the gold button and signing in sits beside it as plain text.
              */
              <div className="hidden items-center gap-1 md:flex">
                <Link
                  href="/login"
                  className={cn(
                    'rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors',
                    'text-body hover:bg-ink/[0.05] hover:text-ink',
                  )}
                >
                  Sign in
                </Link>

                {/*
                  Pushed rather than wrapped in a Link: GoldButton always
                  renders a <button>, and a button inside an anchor is invalid
                  content. router.push keeps it a client-side navigation, which
                  the previous window.location assignment did not.
                */}
                <GoldButton
                  size="sm"
                  variant="ink"
                  onClick={() => router.push('/signup')}
                >
                  Sign up
                </GoldButton>
              </div>
            )}

            <button
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              className={cn(
                'rounded-full p-2.5 transition-colors md:hidden',
                'text-ink',
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

            <nav className="max-h-[calc(100dvh-4rem)] overflow-y-auto px-6 pb-10 pt-6">
              {[...LINKS, { href: '/cart', label: 'Cart' }].map((link, index) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.06 + index * 0.05, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Link
                    href={link.href}
                    className="block border-b border-white/10 py-3.5 font-display text-[24px] font-semibold text-white"
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}

              {/*
                The catalogue, in the order the business actually sells it.
                A menu that opens on four verbs and no goods makes a shopper
                guess what is in here; naming the categories is the difference
                between a navigation and a table of contents.
              */}
              {categories.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  className="pt-7"
                >
                  <p className="font-mono text-eyebrow font-medium uppercase text-white/35">
                    Shop by category
                  </p>
                  <ul className="mt-3">
                    {categories.map((category) => (
                      <li key={category.id}>
                        <Link
                          href={`/browse?category=${category.slug}`}
                          className="flex items-center gap-3.5 border-b border-white/[0.07] py-3 text-[15px] text-white/75 transition-colors hover:text-gold-light"
                        >
                          <CategoryIcon
                            categoryId={category.id}
                            size={17}
                            className="shrink-0 text-gold-light/70"
                          />
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
                  <GoldButton variant="gold" size="lg" className="w-full" onClick={() => signOut({ callbackUrl: '/' })} icon={<LogOut size={16} strokeWidth={1.5} />}>
                    Sign out
                  </GoldButton>
                ) : (
                  <div className="space-y-3">
                    <GoldButton
                      variant="gold"
                      size="lg"
                      className="w-full"
                      withArrow
                      onClick={() => router.push('/signup')}
                    >
                      Create an account
                    </GoldButton>

                    <Link
                      href="/login"
                      className="block rounded-full border border-white/15 py-3.5 text-center text-[14px] font-medium text-white transition-colors hover:bg-white/10"
                    >
                      Sign in
                    </Link>
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

export function StorefrontFooter() {
  return (
    <footer className="grain relative overflow-hidden bg-ink text-white">
      <div className="mx-auto max-w-market px-6 py-16">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <AfriDealLogo variant="dark" size="md" />
            <p className="measure mt-4 text-[13.5px] leading-6 text-white/55">
              A procurement marketplace for Botswana and South Africa. Five published packages
              price every product from a single unit to ninety-nine, suppliers are verified before
              they can list, and orders are routed on reliability rather than on the lowest cost.
            </p>
          </div>

          {[
            { heading: 'Marketplace', links: [['Hair, weaves & extensions', '/browse?category=hair-weaves-extensions'], ['Beauty & personal care', '/browse?category=beauty-personal-care'], ['Browse all', '/browse'], ['Request a runner', '/request-a-runner'], ['How it works', '/how-it-works'], ['Your orders', '/orders']] },
            { heading: 'Suppliers', links: [['Become a supplier', '/login'], ['Supplier portal', '/supplier/dashboard'], ['Verification', '/login']] },
            { heading: 'Platform', links: [['Runner portal', '/runner/dashboard'], ['Admin console', '/admin/dashboard'], ['Create an account', '/signup'], ['Sign in', '/login']] },
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

        {/*
          The payment line is a legal position and is worded exactly as the
          business needs it worded. AfriDeal is the merchant on the sale and the
          money is processed by licensed partners; the platform is not itself a
          payment provider and holds nothing on a customer's behalf. Do not
          soften this into a reassurance about money being safe with us.
        */}
        <div className="mt-12 border-t border-white/10 pt-6">
          <p className="text-[12px] leading-5 text-white/45">
            AfriDeal is not a payment provider. Customer payments are processed by licensed payment
            partners, and AfriDeal does not hold funds on behalf of buyers or suppliers.
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
            <p className="text-[12.5px] text-white/40">
              © {new Date().getFullYear()} AfriDeal. Gaborone, Botswana. Proudly connecting
              Botswana to the world.
            </p>
            <p className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-white/35">
              <Package size={13} strokeWidth={1.5} />
              DPO Pay · Orange Money · PayGate
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
