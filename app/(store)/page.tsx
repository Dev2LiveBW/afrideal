import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  CreditCard,
  Headphones,
  MapPin,
  Package,
  RefreshCw,
  Route,
  ShieldCheck,
  Sparkles,
  Store,
  Tag,
  Trophy,
  Truck,
  UserCheck,
} from 'lucide-react';

import { GoldButton } from '@/components/brand/GoldButton';
import { PriceTag } from '@/components/brand/MoneyText';
import { BuyingModes } from '@/components/storefront/BuyingModes';
import { CategoryTiles, SupplierRail } from '@/components/storefront/DiscoveryRails';
import { FlashDealsRail } from '@/components/storefront/FlashDealsRail';
import { PlatformExplainer } from '@/components/storefront/PlatformExplainer';
import { ProductRail } from '@/components/storefront/ProductRail';
import { readAll } from '@/lib/db';
import { getCatalogue } from '@/lib/queries';
import { rankOffers } from '@/lib/supplier-selection';

import { Reveal } from './_components/Reveal';

export const dynamic = 'force-dynamic';

/**
 * The marketplace home, built for a phone.
 *
 * Two entry points sit above everything else because the platform has exactly
 * two: buy what is listed, or send a runner after what is not. Everything below
 * them — how you want to buy, what is on the shelves, how the money is held —
 * is a shopper's ordinary next question, in the order they tend to ask it.
 */
export default async function LandingPage() {
  const [{ categories, products }, suppliers, orders, images, offers] = await Promise.all([
    getCatalogue(),
    readAll('suppliers'),
    readAll('orders'),
    readAll('product-images'),
    readAll('supplier-offers'),
  ]);

  const verified = suppliers.filter((supplier) => supplier.status === 'VERIFIED');
  const delivered = orders.filter((order) => order.status === 'DELIVERED').length;

  const categoryName = new Map(categories.map((category) => [category.id, category.name]));

  // Attach the supplier the engine would route to, so quick-add on a rail card
  // books against a real supplier rather than an empty string.
  const decorate = (product: (typeof products)[number]) => ({
    ...product,
    categoryName: categoryName.get(product.category_id),
    primarySupplierId:
      rankOffers(
        offers.filter((offer) => offer.product_id === product.id),
        suppliers,
      ).primary?.supplier.id ?? '',
  });

  const onPromotion = products.filter((product) => product.promotion).map(decorate);
  const newArrivals = [...products]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 8)
    .map(decorate);
  const topRated = [...products]
    .sort((a, b) => b.rating - a.rating || b.review_count - a.review_count)
    .slice(0, 8)
    .map(decorate);

  // The cheapest live listing, for the "from" figure on the marketplace card.
  const cheapest = products.reduce(
    (lowest, product) => (product.price < lowest.price ? product : lowest),
    products[0],
  );

  return (
    <div className="mx-auto max-w-market space-y-8 px-4 pb-10 pt-4 sm:px-6 sm:space-y-10 sm:pt-6">
      {/* ── The two ways in ─────────────────────────────────────────────── */}
      <Reveal>
        <section className="grid gap-3 lg:grid-cols-2">
          {/* Marketplace */}
          <div className="grain relative overflow-hidden rounded-lg bg-ink p-5 sm:p-7">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_110%_at_85%_10%,rgba(212,146,10,0.20),transparent_60%)]"
            />
            <div className="relative">
              <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-white/70">
                <Store size={12} strokeWidth={1.6} />
                Shop the marketplace
              </p>

              <h1 className="mt-4 font-display text-[30px] font-bold leading-[1.06] tracking-[-0.03em] text-white sm:text-[40px]">
                Compare. Buy.
                <span className="block text-gold-light">Save more.</span>
              </h1>

              <p className="mt-3 max-w-md text-[13.5px] leading-6 text-white/60 sm:text-[15px]">
                Compare prices from trusted local and international suppliers. Retail, bulk or
                wholesale — you choose.
              </p>

              <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
                {['Best prices', 'Verified suppliers', 'Secure payments', 'Fast delivery'].map(
                  (item) => (
                    <li key={item} className="flex items-center gap-2 text-[12.5px] text-white/75">
                      <BadgeCheck size={14} strokeWidth={1.75} className="shrink-0 text-gold-light" />
                      {item}
                    </li>
                  ),
                )}
              </ul>

              {cheapest && (
                <p className="mt-5 flex items-baseline gap-2 text-white/50">
                  <span className="text-[12px]">Listings from</span>
                  <PriceTag amount={cheapest.price} size="md" tone="white" />
                </p>
              )}

              <Link href="/browse" className="mt-4 inline-block">
                <GoldButton variant="gold" size="lg" withArrow>
                  Browse products
                </GoldButton>
              </Link>
            </div>
          </div>

          {/* Runner service */}
          <div className="relative overflow-hidden rounded-lg bg-gold-50/80 p-5 ring-1 ring-inset ring-gold/20 sm:p-7">
            <p className="inline-flex items-center gap-2 rounded-full bg-surface-raised px-3 py-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-gold-700 ring-1 ring-inset ring-gold/25">
              <Route size={12} strokeWidth={1.6} />
              Runner service
            </p>

            <h2 className="mt-4 font-display text-[26px] font-bold leading-[1.08] tracking-[-0.025em] text-ink sm:text-[34px]">
              Can&rsquo;t find it listed?
              <span className="block text-gold-dark">
                Our verified runners will source it for you.
              </span>
            </h2>

            <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
              {['Find anything', 'Inspect & negotiate', 'Buy on your behalf', 'Personal tasks'].map(
                (item) => (
                  <li key={item} className="flex items-center gap-2 text-[12.5px] text-body">
                    <BadgeCheck size={14} strokeWidth={1.75} className="shrink-0 text-forest" />
                    {item}
                  </li>
                ),
              )}
            </ul>

            <p className="mt-5 text-[12.5px] leading-5 text-muted">
              Nothing is paid out until you confirm what the runner brings back.
            </p>

            <Link href="/request-a-runner" className="mt-4 inline-block">
              <GoldButton variant="gold" size="lg" withArrow>
                Request a runner
              </GoldButton>
            </Link>
          </div>
        </section>
      </Reveal>

      {/* ── Why AfriDeal ────────────────────────────────────────────────── */}
      <Reveal>
        <ul className="grid grid-cols-3 gap-y-5 rounded-lg border border-hairline bg-surface-raised px-3 py-5 sm:grid-cols-6 sm:px-5">
          {[
            { icon: Tag, tone: 'text-gold-dark', title: 'Best prices', body: 'Compare & save' },
            {
              icon: ShieldCheck,
              tone: 'text-forest',
              title: 'Verified suppliers',
              body: 'Trusted & reliable',
            },
            { icon: Truck, tone: 'text-royal', title: 'Fast delivery', body: 'Across Botswana' },
            {
              icon: UserCheck,
              tone: 'text-plum',
              title: 'Verified partners',
              body: 'Background checked',
            },
            { icon: RefreshCw, tone: 'text-gold-dark', title: 'Easy returns', body: 'Hassle-free refunds' },
            { icon: Headphones, tone: 'text-forest', title: '24/7 support', body: 'We’re here to help' },
          ].map((item) => (
            <li key={item.title} className="flex flex-col items-center px-1 text-center">
              <item.icon size={22} strokeWidth={1.4} className={item.tone} />
              <p className="mt-2 text-[12px] font-medium leading-4 text-ink">{item.title}</p>
              <p className="mt-0.5 text-[11px] leading-4 text-muted">{item.body}</p>
            </li>
          ))}
        </ul>
      </Reveal>

      {/* ── How to buy + categories ─────────────────────────────────────── */}
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-6">
        <Reveal>
          <BuyingModes />
        </Reveal>

        <Reveal delay={0.06}>
          <CategoryTiles categories={categories} products={products} />
        </Reveal>
      </div>

      {/* ── Scale ───────────────────────────────────────────────────────── */}
      <Reveal>
        <ul className="grid grid-cols-2 gap-4 rounded-lg bg-ink px-5 py-5 sm:grid-cols-4 sm:px-7">
          {[
            {
              icon: UserCheck,
              value: `${verified.length}`,
              label: 'Verified suppliers',
            },
            { icon: Package, value: `${products.length}`, label: 'Products listed' },
            { icon: ShieldCheck, value: `${delivered}`, label: 'Orders delivered' },
            { icon: Truck, value: 'Escrow', label: 'On every order' },
          ].map((stat) => (
            <li key={stat.label} className="flex items-center gap-3">
              <stat.icon size={20} strokeWidth={1.4} className="shrink-0 text-gold-light" />
              <span className="min-w-0">
                <span className="block font-mono text-[17px] font-semibold leading-tight tabular-nums text-white">
                  {stat.value}
                </span>
                <span className="block truncate text-[11.5px] text-white/45">{stat.label}</span>
              </span>
            </li>
          ))}
        </ul>
      </Reveal>

      {/* ── Live deals ──────────────────────────────────────────────────── */}
      {onPromotion.length > 0 && (
        <Reveal>
          <FlashDealsRail products={onPromotion} images={images} />
        </Reveal>
      )}

      {/* ── Shortcuts ───────────────────────────────────────────────────── */}
      <Reveal>
        <ul className="grid gap-2.5 sm:grid-cols-3">
          {[
            {
              icon: Sparkles,
              title: 'New arrivals',
              body: 'Fresh products added daily.',
              cta: 'Explore now',
              href: '/browse?sort=newest',
              card: 'bg-forest-wash/60',
              button: 'bg-forest text-white hover:bg-forest-light',
              tone: 'text-forest',
            },
            {
              icon: Trophy,
              title: 'Top rated',
              body: 'Shop from the most loved products.',
              cta: 'Shop now',
              href: '/browse?sort=rating',
              card: 'bg-plum-wash/60',
              button: 'bg-plum text-white hover:bg-plum-ink',
              tone: 'text-plum',
            },
            {
              icon: Store,
              title: 'Become a supplier',
              body: 'Grow your business with thousands of buyers.',
              cta: 'Join AfriDeal',
              href: '/login',
              card: 'bg-gold-50/70',
              button: 'bg-gold text-ink hover:bg-gold-dark hover:text-white',
              tone: 'text-gold-dark',
            },
          ].map((item) => (
            <li key={item.title} className={`flex flex-col rounded-md p-4 ${item.card}`}>
              <item.icon size={22} strokeWidth={1.5} className={item.tone} />
              <h3 className="mt-2.5 font-display text-[17px] font-semibold text-ink">{item.title}</h3>
              <p className="mt-1 flex-1 text-[12.5px] leading-5 text-body">{item.body}</p>
              <Link
                href={item.href}
                className={`mt-3.5 inline-flex h-10 items-center justify-center gap-1.5 rounded-full px-4 text-[13px] font-medium transition-colors ${item.button}`}
              >
                {item.cta}
                <ArrowRight size={14} strokeWidth={1.75} />
              </Link>
            </li>
          ))}
        </ul>
      </Reveal>

      {/* ── New arrivals ────────────────────────────────────────────────── */}
      <Reveal>
        <ProductRail
          products={newArrivals}
          images={images}
          title="New arrivals"
          description="Most recently listed by verified suppliers"
          action={
            <Link href="/browse">
              <GoldButton variant="ghost" size="sm">
                See all {products.length}
              </GoldButton>
            </Link>
          }
        />
      </Reveal>

      {/* ── Top rated ───────────────────────────────────────────────────── */}
      <Reveal>
        <ProductRail
          products={topRated}
          images={images}
          title="Top rated"
          description="Highest rated by buyers who confirmed delivery"
        />
      </Reveal>

      {/* ── Suppliers near you ──────────────────────────────────────────── */}
      <Reveal>
        <SupplierRail suppliers={verified} />
      </Reveal>

      {/* ── How the platform works ──────────────────────────────────────── */}
      <Reveal>
        <PlatformExplainer />
      </Reveal>

      {/* ── Payment and protection ──────────────────────────────────────── */}
      <Reveal>
        <ul className="grid gap-3 rounded-lg border border-hairline bg-surface-raised p-4 sm:grid-cols-3 sm:p-5">
          {[
            {
              icon: CreditCard,
              tone: 'text-royal',
              title: 'Multiple payment options',
              body: 'DPO Pay, Orange Money or PayGate — pay how you like.',
            },
            {
              icon: ShieldCheck,
              tone: 'text-forest',
              title: 'Buyer protection',
              body: 'Funds are held until you confirm the goods arrived.',
            },
            {
              icon: MapPin,
              tone: 'text-gold-dark',
              title: 'Easy order tracking',
              body: 'Follow every leg from pickup to your door.',
            },
          ].map((item) => (
            <li key={item.title} className="flex gap-3">
              <item.icon size={19} strokeWidth={1.5} className={`mt-0.5 shrink-0 ${item.tone}`} />
              <span>
                <span className="block text-[13px] font-medium text-ink">{item.title}</span>
                <span className="mt-0.5 block text-[12px] leading-5 text-muted">{item.body}</span>
              </span>
            </li>
          ))}
        </ul>
      </Reveal>
    </div>
  );
}
