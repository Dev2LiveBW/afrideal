'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ChevronRight, LogOut, MapPin, Menu, Package, Search, ShoppingCart, X } from 'lucide-react';

import { AfriDealLogo } from '@/components/brand/AfriDealLogo';
import { CategoryIcon } from '@/components/storefront/CategoryIcon';
import { ActionButton } from '@/components/brand/ActionButton';
import { cartCount, useAfriDealStore } from '@/store/useAfriDealStore';
import type { Category } from '@/types';
import { cn } from '@/lib/utils';

export function StorefrontNav({ categories = [] }: { categories?: Category[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const cart = useAfriDealStore((state) => state.cart);
  const pulse = useAfriDealStore((state) => state.cartPulse);

  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => setMenuOpen(false), [pathname]);

  const count = mounted ? cartCount(cart) : 0;

  return (
    <>
      <header className="sticky top-0 z-40 bg-white shadow-sm">
        {/* Row 1: Logo | Search | Controls */}
        <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-2.5">
          <Link href="/" className="shrink-0">
            <AfriDealLogo variant="light" size="sm" />
          </Link>

          <div className="relative flex flex-1 items-center">
            <Search size={16} className="absolute left-3.5 text-gray-400 pointer-events-none" />
            <input
              type="search"
              placeholder="Search products, brands or categories\u2026"
              className="h-10 w-full rounded-full border border-gray-200 bg-gray-50 pl-10 pr-28 text-[14px] text-gray-700 outline-none focus:border-[#E67E22] focus:bg-white focus:ring-2 focus:ring-[#E67E22]/20"
            />
            <button className="absolute right-1 flex h-8 items-center rounded-full bg-[#E67E22] px-4 text-[13px] font-bold text-white hover:bg-[#D35400] transition-colors">
              Search
            </button>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/cart"
              aria-label={`Cart, ${count} item${count === 1 ? '' : 's'}`}
              className="relative flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
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
                <button onClick={() => router.push('/signup')} className="rounded-full bg-[#E67E22] px-4 py-2 text-[13px] font-bold text-white hover:bg-[#D35400] transition-colors">Sign up</button>
              </div>
            )}

            <button onClick={() => setMenuOpen(true)} aria-label="Open menu" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100 transition-colors md:hidden">
              <Menu size={20} strokeWidth={1.75} className="text-gray-700" />
            </button>
          </div>
        </div>

        {/* Row 2: Location | Track order */}
        <div className="border-t border-gray-100 bg-white">
          <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-1.5">
            <button className="flex items-center gap-1.5 text-[12px] text-gray-600 hover:text-gray-900">
              <MapPin size={13} className="text-[#E67E22]" />
              <span>Deliver to: <span className="font-semibold text-gray-900">Gaborone, Botswana</span></span>
              <ChevronDown size={13} className="text-gray-400" />
            </button>
            <Link href="/orders" className="text-[12px] font-medium text-[#E67E22] hover:underline">
              Track order \u2192
            </Link>
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
