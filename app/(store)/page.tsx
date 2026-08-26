import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, BadgeCheck, User, Truck } from "lucide-react";

import { ActionButton } from '@/components/brand/ActionButton';
import { CategoryTiles } from '@/components/storefront/DiscoveryRails';
import { FlashDealsRail } from '@/components/storefront/FlashDealsRail';
import { HowItWorks } from '@/components/storefront/HowItWorks';
import { LadderProof, type LadderProofRow } from '@/components/storefront/LadderProof';
import { PackagesBoard } from '@/components/storefront/PackagesBoard';
import { PathChooser } from '@/components/storefront/PathChooser';
import { PriceLadder } from '@/components/storefront/PriceLadder';
import { ProductRail } from '@/components/storefront/ProductRail';
import { Swatch } from '@/components/storefront/Swatch';
import { TrustStrip } from '@/components/storefront/TrustStrip';
import { auth } from '@/lib/auth';
import { readAll } from '@/lib/db';
import { MARKUP_PCT, QUOTATION_THRESHOLD, deepestSavingPct } from '@/lib/pricing-model';
import { getCatalogue } from '@/lib/queries';
import { rankOffers } from '@/lib/supplier-selection';
import { doorForQuantity, ladderSpread, tierDoors } from '@/lib/tier-doors';

import { Reveal } from '@/app/(store)/_components/Reveal';

export const dynamic = 'force-dynamic';

/** The category the platform actually sells. It leads the page. */
const FLAGSHIP_CATEGORY = 'c1';

/**
 * The quantity a visitor is standing on before they have chosen one. It is the
 * entry rung by definition, and naming it here keeps the "your tier" marker on
 * the packages board honest rather than decorative.
 */
const DEFAULT_QUANTITY = 1;

export default async function LandingPage() {
  const [{ categories, products }, suppliers, images, offers, bands, session] = await Promise.all([
    getCatalogue(),
    readAll('suppliers'),
    readAll('product-images'),
    readAll('supplier-offers'),
    readAll('customer-prices'),
    auth(),
  ]);

  const verified = suppliers.filter((supplier) => supplier.status === 'VERIFIED');
  const customerType = session?.user?.customer_type ?? 'GUEST';

  const categoryName = new Map(categories.map((category) => [category.id, category.name]));
  const primaryImage = new Map(
    images.filter((image) => image.sort_order === 0).map((image) => [image.product_id, image]),
  );

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

  const flagship = products.filter((product) => product.category_id === FLAGSHIP_CATEGORY);
  const onPromotion = products.filter((product) => product.promotion).map(decorate);

  const spreads = products
    .map((product) => ({ product, spread: ladderSpread(bands, product) }))
    .filter(
      (
        row,
      ): row is {
        product: (typeof products)[number];
        spread: NonNullable<ReturnType<typeof ladderSpread>>;
      } => row.spread !== null,
    );

  /*
   * The hero prices its ladder against the flagship line, because that is what
   * the business sells most of. Within the category it takes the most expensive
   * product that is not currently discounted: the highest figures make the gap
   * between the rungs legible at a glance, and a promotional price would have
   * the hero arguing about a sale when the point is the standing price list.
   */
  const featured =
    flagship.filter((product) => !product.promotion).sort((a, b) => b.price - a.price)[0] ??
    flagship[0] ??
    products[0];

  const doors = featured ? tierDoors(bands, featured, customerType) : [];
  const yourTier = doorForQuantity(DEFAULT_QUANTITY);

  const proofRows: LadderProofRow[] = spreads
    .filter(({ product }) => product.id !== featured?.id)
    .sort((a, b) => {
      // The flagship category first, then by value, so the strip reads as the
      // same catalogue the hero came from rather than a random sample of it.
      const aFlagship = a.product.category_id === FLAGSHIP_CATEGORY ? 0 : 1;
      const bFlagship = b.product.category_id === FLAGSHIP_CATEGORY ? 0 : 1;
      return aFlagship - bFlagship || b.spread.from - a.spread.from;
    })
    .slice(0, 4)
    .map(({ product, spread }) => ({
      product,
      image: primaryImage.get(product.id),
      ...spread,
    }));

  const flagshipCategory = categories.find((category) => category.id === FLAGSHIP_CATEGORY);

  return (
    <>
      {/* ── The offer, priced ──────────────────────────────────────────── */}
      {/*
        The hero is two materials that never blend. The showroom is the
        photograph on the right - an order arriving, which is the end of the
        sentence the headline starts. The instrument is the ink panel set down
        across its lower edge, carrying the published ladder.

        The photograph is a framed object rather than a bleed behind the whole
        section. Run full-bleed it sat behind the three doors as well, and those
        cards are washed tints: a picture reading through them turned three flat
        panels into three windows onto the same photograph.

        The text column sits on flat warm ground, never on the picture, so every
        line of it clears AA without a scrim doing the work.
      */}
      <section className="relative isolate overflow-hidden bg-white">
        <div className="mx-auto grid max-w-market gap-12 px-6 pb-14 pt-24 sm:pt-28 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-16 lg:pb-16 lg:pt-36">
          <div className="min-w-0">
            <h1 className="font-display text-[38px] font-bold leading-[1.08] tracking-[-0.035em] text-ink sm:text-[54px] lg:text-[64px]">
              Find it.<br />
              Compare it.<br />
              <span className="text-gold-dark">Procure it.</span><br />
              Get it delivered.
            </h1>

            <p className="measure mt-6 text-[16px] leading-8 text-body">
              Shop from <span className="font-bold text-ink">verified</span> suppliers or let us
              procure it for you through our <span className="font-bold text-ink">trusted</span> runner and delivery network.
            </p>

            <ul className="mt-10 flex flex-wrap gap-x-8 gap-y-8">
              {[
                { icon: BadgeCheck, label: "Verified\nSuppliers", tone: "text-forest", circle: "bg-forest-wash" },
                { icon: User, label: "Verified\nRunners", tone: "text-gold-dark", circle: "bg-gold-50" },
                { icon: Truck, label: "Verified\nDelivery Partners", tone: "text-royal", circle: "bg-royal-wash" },
              ].map((chip) => (
                <li key={chip.label} className="flex flex-col items-center gap-3">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-full ${chip.circle}`}>
                    <chip.icon size={24} strokeWidth={1.5} aria-hidden="true" className={chip.tone} />
                  </div>
                  <span className="text-[13px] font-semibold text-ink text-center max-w-[90px] leading-snug whitespace-pre-line">
                    {chip.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative min-w-0 flex justify-center lg:justify-end">
            <div className="relative w-full max-w-[480px] aspect-[4/5] overflow-hidden rounded-[32px] shadow-2xl ring-1 ring-inset ring-black/5">
              <Image
                src="/images/home/hero-woman.jpg"
                alt="AfriDeal trusted sourcing"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover object-top"
              />
            </div>
            
            {/* Phone Mockup floating over */}
            <div className="absolute -left-4 sm:-left-8 lg:-left-12 bottom-12 w-[180px] sm:w-[220px] lg:w-[260px] drop-shadow-[0_35px_35px_rgba(0,0,0,0.25)] rounded-[32px] sm:rounded-[40px] border-[8px] sm:border-[10px] border-white bg-white overflow-hidden">
              <div className="relative aspect-[9/19.5] w-full">
                <Image
                  src="/images/home/phone-mockup.jpg"
                  alt="AfriDeal App"
                  fill
                  className="object-cover rounded-[24px] sm:rounded-[30px]"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-market px-6 pb-20 lg:pb-28 pt-8">
          <PathChooser productCount={products.length} />
        </div>
      </section>
      {/* ── What you pay at each quantity ──────────────────────────────── */}
      {featured && doors.length > 0 && (
        <section id="packages" className="border-y border-hairline bg-surface-raised">
          <div className="mx-auto max-w-market px-6 py-20 lg:py-24">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] lg:gap-20">
              <div className="min-w-0 lg:sticky lg:top-28 lg:self-start">
                <h2 className="font-display text-headline-lg font-semibold leading-tight text-ink">
                  The price depends on who is buying, and how many
                </h2>
                <p className="measure mt-4 text-[14.5px] leading-7 text-body">
                  A product does not have one universal price. AfriDeal buys from the supplier and
                  resells to you at a published markup that falls as the quantity rises:{' '}
                  <span className="font-mono tabular-nums text-ink">{MARKUP_PCT.RETAIL}%</span> at
                  retail down to{' '}
                  <span className="font-mono tabular-nums text-ink">
                    {MARKUP_PCT.WHOLESALE_PLUS}%
                  </span>{' '}
                  at fifty units. The same five packages run on every product, and the rung your
                  quantity falls on is applied automatically at checkout.
                </p>

                {/*
                  Which rung the reader is on right now, stated plainly. The
                  board marks it too, but a reader who scanned the heading and
                  stopped should still leave knowing the answer.
                */}
                <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-forest-wash px-4 py-2 text-[13px] font-medium text-forest-ink ring-1 ring-inset ring-forest/20">
                  <BadgeCheck size={15} strokeWidth={1.6} aria-hidden="true" className="text-forest" />
                  You are on the Retail tier
                </p>

                <p className="mt-4 text-[13px] leading-6 text-muted">
                  Take five units and the Bulk price applies on its own. Nothing to apply for, and
                  no rung is hidden behind an account.
                </p>

                <Link
                  href="/browse"
                  className="mt-6 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-forest underline-offset-4 hover:underline"
                >
                  See the whole catalogue
                  <ArrowRight size={13} strokeWidth={1.75} aria-hidden="true" />
                </Link>
              </div>

              <div className="min-w-0">
                <p className="text-[12.5px] leading-5 text-muted">
                  Priced on <span className="font-medium text-ink">{featured.name}</span>, per unit.
                </p>

                <PackagesBoard
                  doors={doors}
                  productName={featured.name}
                  activeTier={yourTier}
                  className="mt-4"
                />

                {/*
                  The same claim, checked against four more products. The board
                  above could be one generous product; this is the part that
                  says it is the catalogue.
                */}
                {proofRows.length > 0 && (
                  <div className="mt-10 border-t border-hairline pt-8">
                    <h3 className="text-[14px] font-semibold text-ink">And on everything else</h3>
                    <p className="mt-1.5 text-[13px] leading-5 text-muted">
                      Retail price, the deepest published price, and what the drop is worth per
                      unit — up to{' '}
                      <span className="font-mono tabular-nums text-ink">
                        {deepestSavingPct().toFixed(0)}%
                      </span>{' '}
                      off the retail rung.
                    </p>
                    <LadderProof rows={proofRows} className="mt-5" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── The flagship category ──────────────────────────────────────── */}
      {flagship.length > 0 && (
        <section className="mx-auto max-w-market px-6 pt-20 lg:pt-24">
          <ProductRail
            products={flagship.map(decorate)}
            images={images}
            title={flagshipCategory?.name ?? 'Hair, Weaves & Extensions'}
            description="Bundles, frontals, closures, wigs and braiding hair, in the range salons reorder"
            action={
              <Link href="/browse?category=hair-weaves-extensions">
                <ActionButton variant="ghost" size="sm">
                  See all {flagship.length}
                </ActionButton>
              </Link>
            }
          />
        </section>
      )}

      {/* ── Categories ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-market px-6 pt-20">
        <CategoryTiles categories={categories} products={products} />
      </section>

      {/* ── Live deals ─────────────────────────────────────────────────── */}
      {onPromotion.length > 0 && (
        <section className="mx-auto max-w-market px-6 pt-20">
          <FlashDealsRail products={onPromotion} images={images} />
        </section>
      )}

      {/* ── How the order actually runs ────────────────────────────────── */}
      <section id="how-it-works" className="mt-24 border-y border-hairline bg-surface-raised">
        <div className="mx-auto max-w-market px-6 py-20 lg:py-24">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-end lg:gap-20">
            <div className="min-w-0">
              <h2 className="font-display text-headline-lg font-semibold leading-tight text-ink">
                How it works
              </h2>
              <p className="measure mt-4 text-[14.5px] leading-7 text-body">
                You are buying from AfriDeal, not from the supplier. We are the merchant on your
                order rather than an introduction service, so you get one invoice and one number to
                call — and if the order goes wrong it is ours to fix.
              </p>
            </div>

            <div className="min-w-0 lg:justify-self-end">
              <Link
                href="/how-it-works"
                className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-forest underline-offset-4 hover:underline"
              >
                See both flows, step by step
                <ArrowRight size={13} strokeWidth={1.75} aria-hidden="true" />
              </Link>
            </div>
          </div>

          <HowItWorks className="mt-14" />
        </div>
      </section>

      {/*
        The conditions under which everything above is true, on the forest band
        that closes the page's argument. No heading: it is a specification plate
        under the sequence, not a section making its own case.
      */}
      <section className="bg-forest-deep">
        <div className="mx-auto max-w-market px-6 py-12">
          <TrustStrip tone="dark" />
        </div>
      </section>

      {/* ── Trade enquiries ────────────────────────────────────────────── */}
      <section className="mx-auto max-w-market px-6 pb-24 pt-20">
        <div className="grain relative overflow-hidden rounded-xl bg-ink px-8 py-14 text-center sm:px-14">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_120%_at_50%_0%,rgba(192,138,30,0.20),transparent_60%)]"
          />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl font-display text-[30px] font-bold leading-[1.12] tracking-[-0.025em] text-white sm:text-[38px]">
              Buying {QUOTATION_THRESHOLD} units or more?
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-[15px] leading-7 text-white/55">
              Above the published packages we quote rather than list, because at that volume the
              price depends on your delivery point and how much notice you can give us. Send the
              specification and we will come back with a written quotation.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/browse?tier=CUSTOM">
                <ActionButton variant="gold" size="lg" withArrow>
                  Request a quotation
                </ActionButton>
              </Link>
              <Link href="/login">
                <ActionButton
                  variant="ghost"
                  size="lg"
                  className="text-white ring-white/20 hover:bg-white/[0.08]"
                >
                  Apply as a supplier
                </ActionButton>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
