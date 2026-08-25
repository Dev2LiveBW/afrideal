import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, BadgeCheck, PackageSearch, Truck } from 'lucide-react';

import { AfriDealTagline } from '@/components/brand/AfriDealLogo';
import { GoldButton } from '@/components/brand/GoldButton';
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
      <section className="relative isolate overflow-hidden bg-gradient-to-b from-[#FBF7EF] via-surface to-surface">
        <div className="mx-auto grid max-w-market gap-12 px-6 pb-14 pt-28 sm:pt-32 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)] lg:items-center lg:gap-16 lg:pb-20 lg:pt-40">
          {/*
            `min-w-0` on both columns: a grid item defaults to `min-width:auto`,
            so the column could not shrink below the headline's min-content
            width and pushed the page past the viewport on a 375px screen.
          */}
          <div className="min-w-0">
            {/*
              The strapline from the brand lockup, used as the hero's eyebrow
              rather than repeated as a second logo. The mark is already in the
              header pill a few pixels above this line; what the lockup adds
              here is the sentence that says what kind of marketplace it is.
            */}
            <AfriDealTagline className="mb-5" />

            <h1 className="font-display text-[34px] font-bold leading-[1.04] tracking-[-0.035em] text-ink sm:text-[54px] lg:text-[60px]">
              Find it.
              <br />
              Compare it.
              <br />
              <span className="text-gold-dark">Procure it.</span>
              <br />
              Get it delivered.
            </h1>

            <p className="measure mt-6 text-[16px] leading-8 text-body">
              Buy from verified suppliers at a price that is published before you commit — or send a
              verified runner to find what the catalogue does not carry, and pay only once you have
              seen what it costs.
            </p>

            {/*
              Three chips, one per party the platform vets. They are the
              condition under which the sentence above is worth anything, so
              they sit with it rather than in a band further down the page.
            */}
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3">
              {[
                { icon: BadgeCheck, label: 'Verified suppliers', tone: 'text-forest' },
                { icon: PackageSearch, label: 'Verified runners', tone: 'text-gold-dark' },
                { icon: Truck, label: 'Verified delivery partners', tone: 'text-royal' },
              ].map((chip) => (
                <li key={chip.label} className="flex items-center gap-2">
                  <chip.icon size={16} strokeWidth={1.6} aria-hidden="true" className={chip.tone} />
                  <span className="text-[13px] font-medium text-ink">{chip.label}</span>
                </li>
              ))}
            </ul>

            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link href="/browse">
                <GoldButton variant="forest" size="lg" withArrow>
                  Shop the marketplace
                </GoldButton>
              </Link>
              <Link
                href="/how-it-works"
                className="text-[14.5px] font-medium text-ink underline decoration-gold decoration-2 underline-offset-[6px] transition-colors duration-300 hover:text-gold-dark"
              >
                How AfriDeal works
              </Link>
            </div>

            {/*
              Deliberately a sentence, not a stat block. The real figures are
              small - this is a young marketplace - and three big numerals
              would make a modest catalogue look like a boast rather than a
              fact.
            */}
            <p className="mt-10 border-t border-hairline pt-6 text-[13px] leading-6 text-muted">
              <span className="font-mono tabular-nums text-ink">{products.length}</span> products
              from <span className="font-mono tabular-nums text-ink">{verified.length}</span>{' '}
              verified suppliers in Botswana and South Africa, delivered to your door.
            </p>
          </div>

          {/*
            The ladder. Ink and gold against the light page, so the one object
            carrying the argument is also the one object that reads as an
            instrument rather than as page furniture.

            It is also the page's only staged entrance. Every section used to
            arrive on the same fade-up, which is not choreography - it is the
            same effect fifteen times, and it made the thesis object arrive with
            no more ceremony than a footer. One moment, on the thing the page is
            about.
          */}
          <div className="relative min-w-0">
            {/*
              The frame follows the source's own proportions rather than fighting
              them. A portrait frame over a 940x529 photograph crops two thirds
              of the width away and then upscales what is left; 3:2 keeps the
              picture close to native and lets the subject stay whole. The focal
              point is set above centre because that is where the face is.
            */}
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-surface-sunk shadow-card ring-1 ring-inset ring-hairline sm:aspect-[3/2]">
              <Image
                src="/products/hero.jpg"
                alt="An AfriDeal order arriving at the door"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 46vw"
                className="object-cover object-[50%_28%]"
              />
            </div>

            {/*
              The panel is pulled up over the photograph's lower edge and held
              off the right, so it overlaps the picture rather than replacing
              it. What stays visible above it is the showroom the instrument is
              standing on, and losing that collapses the hero's two materials
              into one.
            */}
            {featured && doors.length > 0 && (
            <Reveal delay={0.1} className="relative z-10 -mt-16 min-w-0">
              <div className="grain relative overflow-hidden rounded-xl bg-ink p-2 shadow-[0_24px_60px_-16px_rgba(0,0,0,0.55)] ring-1 ring-white/10">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-[radial-gradient(100%_70%_at_85%_0%,rgba(212,146,10,0.18),transparent_62%)]"
                />

                <div className="relative rounded-[calc(2rem-0.5rem)] p-5 sm:p-6">
                  <div className="flex items-center gap-4">
                    <Swatch
                      image={primaryImage.get(featured.id)}
                      fallback={featured.swatch}
                      emoji={featured.emoji}
                      label={featured.name}
                      className="h-12 w-12 shrink-0 rounded"
                      glyphClassName="text-[20px]"
                      zoomOnHover={false}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-[14.5px] font-semibold text-white">
                        {featured.name}
                      </p>
                      <p className="mt-0.5 text-[12px] text-white/60">
                        {categoryName.get(featured.category_id)} · one product, five packages
                      </p>
                    </div>
                  </div>

                  <div className="mt-5">
                    <PriceLadder doors={doors} productName={featured.name} compact />
                  </div>

                  <p className="mt-5 text-[11.5px] leading-5 text-white/55">
                    Prices are per unit in Pula and applied automatically at checkout. The same five
                    packages are published on every product in the catalogue.
                  </p>
                </div>
              </div>
            </Reveal>
            )}
          </div>
        </div>

        {/*
          The three ways in, closing the hero block rather than opening a
          section of their own. A visitor who already knows which one they want
          should not have to scroll past the argument to find the door.
        */}
        <div className="mx-auto max-w-market px-6 pb-16 lg:pb-20">
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
                  className="mt-6 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-gold-dark underline-offset-4 hover:underline"
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
                <GoldButton variant="ghost" size="sm">
                  See all {flagship.length}
                </GoldButton>
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
                className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-gold-dark underline-offset-4 hover:underline"
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
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_120%_at_50%_0%,rgba(212,146,10,0.20),transparent_60%)]"
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
                <GoldButton variant="gold" size="lg" withArrow>
                  Request a quotation
                </GoldButton>
              </Link>
              <Link href="/login">
                <GoldButton
                  variant="ghost"
                  size="lg"
                  className="text-white ring-white/20 hover:bg-white/[0.08]"
                >
                  Apply as a supplier
                </GoldButton>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
