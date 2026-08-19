import Link from 'next/link';
import { BadgeCheck, Lock, PackageCheck, ShieldCheck, Truck } from 'lucide-react';

import { AfriDealMark } from '@/components/brand/AfriDealLogo';
import { GoldButton } from '@/components/brand/GoldButton';
import { MoneyText } from '@/components/brand/MoneyText';
import { CustomerTierBar } from '@/components/procurement/CustomerTierBar';
import { CategoryTiles, SupplierRail } from '@/components/storefront/DiscoveryRails';
import { FlashDealsRail } from '@/components/storefront/FlashDealsRail';
import { Float } from '@/components/motion/Float';
import { ProductRail } from '@/components/storefront/ProductRail';
import { auth } from '@/lib/auth';
import { readAll } from '@/lib/db';
import { getCatalogue } from '@/lib/queries';
import { rankOffers } from '@/lib/supplier-selection';

import { Reveal } from './_components/Reveal';

export const dynamic = 'force-dynamic';

export default async function LandingPage() {
  const [{ categories, products }, suppliers, orders, images, offers, session] = await Promise.all([
    getCatalogue(),
    readAll('suppliers'),
    readAll('orders'),
    readAll('product-images'),
    readAll('supplier-offers'),
    auth(),
  ]);

  const verified = suppliers.filter((supplier) => supplier.status === 'VERIFIED');
  const delivered = orders.filter((order) => order.status === 'DELIVERED').length;
  const customerType = session?.user?.customer_type ?? null;

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

  // A real delivered order for the hero receipt.
  const sample = orders.find((order) => order.status === 'DELIVERED') ?? orders[0];

  return (
    <>
      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="grain relative overflow-hidden bg-ink">
        {/*
          Full-bleed photograph under a heavy tonal overlay. The image sets the
          scene; the overlay is what keeps the headline at full contrast, so the
          text never depends on which part of the photo sits behind it.
        */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/products/hero.jpg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.28]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-ink via-ink/90 to-ink/60"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_78%_18%,rgba(212,146,10,0.16),transparent_58%)]"
        />

        <div className="relative mx-auto grid max-w-market gap-14 px-6 pb-24 pt-32 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center lg:gap-16 lg:pb-28 lg:pt-40">
          <div>
            <Reveal>
              <p className="eyebrow text-white/40">Botswana · South Africa</p>
            </Reveal>

            <Reveal delay={0.06}>
              <h1 className="mt-4 font-display text-[42px] font-bold leading-[1.04] tracking-[-0.035em] text-white sm:text-[56px] lg:text-[64px]">
                Africa&rsquo;s marketplace.
                <br />
                <span className="text-gold-light">Your way.</span>
              </h1>
            </Reveal>

            <Reveal delay={0.12}>
              <p className="measure mt-6 text-[16px] leading-8 text-white/60">
                Buy from suppliers who have been verified before they were allowed to list. Your
                payment sits in escrow, untouched, until you confirm the goods actually arrived.
              </p>
            </Reveal>

            <Reveal delay={0.18}>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link href="/browse">
                  <GoldButton variant="gold" size="lg" withArrow>
                    Browse the marketplace
                  </GoldButton>
                </Link>
                <Link href="/login">
                  <GoldButton
                    variant="ghost"
                    size="lg"
                    className="text-white ring-white/20 hover:bg-white/[0.08]"
                  >
                    Become a supplier
                  </GoldButton>
                </Link>
              </div>
            </Reveal>

            <Reveal delay={0.24}>
              <dl className="mt-14 grid max-w-lg grid-cols-3 gap-6 border-t border-white/10 pt-8">
                {[
                  [String(verified.length), 'verified suppliers'],
                  [String(products.length), 'products listed'],
                  [String(delivered), 'orders delivered'],
                ].map(([value, label]) => (
                  <div key={label}>
                    <dt className="font-mono text-[26px] font-semibold leading-none tabular-nums text-white">
                      {value}
                    </dt>
                    <dd className="mt-2 text-[12.5px] leading-4 text-white/40">{label}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>

          {sample && (
            <Float delay={0.2} className="lg:justify-self-end">
              <div className="w-full max-w-[400px] rounded-xl bg-white/[0.06] p-1.5 ring-1 ring-white/10 backdrop-blur-sm">
                <div className="rounded-[calc(2rem-0.375rem)] bg-[#1a1a1a] p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2.5">
                      <AfriDealMark size={22} tone="gold" />
                      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">
                        Escrow receipt
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-forest/25 px-2.5 py-1 text-[11px] font-medium text-[#8FD69F] ring-1 ring-inset ring-forest/30">
                      <Lock size={11} strokeWidth={2} />
                      Released
                    </span>
                  </div>

                  <p className="mt-7 text-[12px] text-white/40">Held on behalf of the buyer</p>
                  <p className="mt-1">
                    <MoneyText amount={sample.total} size="xl" tone="white" />
                  </p>

                  <dl className="mt-7 space-y-3.5 border-t border-white/10 pt-5 text-[12.5px]">
                    {[
                      ['Reference', sample.reference],
                      ['Buyer', sample.customer_name],
                      ['Destination', sample.delivery_city],
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between gap-4">
                        <dt className="text-white/40">{label}</dt>
                        <dd className="truncate font-mono tabular-nums text-white/85">{value}</dd>
                      </div>
                    ))}
                  </dl>

                  <div className="mt-6 flex items-start gap-2.5 rounded border border-white/10 bg-white/[0.03] p-3.5">
                    <ShieldCheck
                      size={15}
                      strokeWidth={1.5}
                      className="mt-0.5 shrink-0 text-[#8FD69F]"
                    />
                    <p className="text-[12px] leading-5 text-white/50">
                      Funds were released to the supplier only after the buyer confirmed delivery.
                    </p>
                  </div>
                </div>
              </div>
            </Float>
          )}
        </div>
      </section>

      {/* ── Categories ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-market px-6 pt-20">
        <Reveal>
          <CategoryTiles categories={categories} products={products} />
        </Reveal>
      </section>

      {/* ── Live deals ─────────────────────────────────────────────────── */}
      {onPromotion.length > 0 && (
        <section className="mx-auto max-w-market px-6 pt-20">
          <Reveal>
            <FlashDealsRail products={onPromotion} images={images} />
          </Reveal>
        </section>
      )}

      {/* ── Suppliers near you ─────────────────────────────────────────── */}
      <section className="mx-auto max-w-market px-6 pt-20">
        <Reveal>
          <SupplierRail suppliers={verified} />
        </Reveal>
      </section>

      {/* ── New arrivals ───────────────────────────────────────────────── */}
      <section className="mx-auto max-w-market px-6 pt-20">
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
      </section>

      {/* ── How escrow works ───────────────────────────────────────────── */}
      <section className="mt-24 border-y border-hairline bg-surface-raised">
        <div className="mx-auto grid max-w-market gap-14 px-6 py-24 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
          <Reveal className="lg:sticky lg:top-28 lg:self-start">
            <p className="eyebrow">How you are protected</p>
            <h2 className="mt-3 font-display text-headline-lg font-semibold leading-tight text-ink">
              The money moves last
            </h2>
            <p className="measure mt-4 text-[14.5px] leading-7 text-body">
              A marketplace is only worth using if the payment cannot disappear ahead of the goods.
              Every order runs through the same four states, and a supplier is paid at the fourth.
            </p>
          </Reveal>

          <ol className="relative">
            {[
              {
                state: 'Paid',
                tone: 'amber',
                title: 'You pay AfriDeal, not the supplier',
                body: 'The payment settles into a platform-held account through DPO Pay, Orange Money or PayGate. The supplier can see that it landed. They cannot touch it.',
                icon: <Lock size={15} strokeWidth={1.5} />,
              },
              {
                state: 'Held',
                tone: 'amber',
                title: 'The order is routed and prepared',
                body: 'Your order splits to whichever verified suppliers are carrying the stock. Each of them sees only their own part of it, and each has their own escrow leg.',
                icon: <PackageCheck size={15} strokeWidth={1.5} />,
              },
              {
                state: 'In transit',
                tone: 'ink',
                title: 'A runner collects and delivers',
                body: 'Pickup and delivery are tracked against the order. If a leg fails, that leg refunds without unwinding the rest of the order.',
                icon: <Truck size={15} strokeWidth={1.5} />,
              },
              {
                state: 'Released',
                tone: 'green',
                title: 'You confirm, and only then is the supplier paid',
                body: 'Nothing releases automatically on a timer. If what arrived is wrong, you raise a dispute instead and the funds freeze until it is resolved.',
                icon: <BadgeCheck size={15} strokeWidth={1.5} />,
              },
            ].map((step, index, all) => (
              <Reveal key={step.state} delay={index * 0.08}>
                <li className="relative flex gap-5 pb-9 last:pb-0">
                  {index < all.length - 1 && (
                    <span className="absolute left-[19px] top-11 h-[calc(100%-1rem)] w-px bg-hairline-strong" />
                  )}

                  <span
                    className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-1 ring-inset ${
                      step.tone === 'amber'
                        ? 'bg-gold-50 text-gold-700 ring-gold/25'
                        : step.tone === 'green'
                          ? 'bg-forest-wash text-forest ring-forest/20'
                          : 'bg-ink/[0.06] text-ink ring-hairline-strong'
                    }`}
                  >
                    {step.icon}
                  </span>

                  <div className="min-w-0 flex-1 pt-1">
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                      {step.state}
                    </p>
                    <h3 className="mt-1.5 text-[16px] font-semibold leading-6 text-ink">
                      {step.title}
                    </h3>
                    <p className="measure mt-2 text-[13.5px] leading-6 text-body">{step.body}</p>
                  </div>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Account tiers ──────────────────────────────────────────────── */}
      <section className="mx-auto max-w-market px-6 py-24">
        <Reveal>
          <CustomerTierBar customerType={customerType} />
        </Reveal>
      </section>

      {/* ── Supplier CTA ───────────────────────────────────────────────── */}
      <section className="mx-auto max-w-market px-6 pb-24">
        <Reveal>
          <div className="grain relative overflow-hidden rounded-xl bg-ink px-8 py-14 text-center sm:px-14">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_120%_at_50%_0%,rgba(212,146,10,0.20),transparent_60%)]"
            />
            <div className="relative">
              <h2 className="mx-auto max-w-2xl font-display text-[30px] font-bold leading-[1.12] tracking-[-0.025em] text-white sm:text-[38px]">
                Sell into Botswana and South Africa without chasing payment
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-[15px] leading-7 text-white/55">
                You see the money land in escrow before you pick and pack, and it settles to you once
                the buyer confirms. Verification takes a few days.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link href="/login">
                  <GoldButton variant="gold" size="lg" withArrow>
                    Apply as a supplier
                  </GoldButton>
                </Link>
                <Link href="/browse">
                  <GoldButton
                    variant="ghost"
                    size="lg"
                    className="text-white ring-white/20 hover:bg-white/[0.08]"
                  >
                    See what sells
                  </GoldButton>
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
