import Link from 'next/link';
import { ArrowRight, BadgeCheck } from 'lucide-react';

import { ActionButton } from '@/components/brand/ActionButton';
import { CategoryTiles } from '@/components/storefront/DiscoveryRails';
import { LadderProof, type LadderProofRow } from '@/components/storefront/LadderProof';
import { PackagesBoard } from '@/components/storefront/PackagesBoard';
import { MockupCategories } from '@/components/storefront/MockupCategories';
import { StatsBanner, PromoCards, TrustPaymentStrip } from '@/components/storefront/HomePromoSections';
import { MockupHero } from '@/components/storefront/MockupHero';
import { PathChooser } from '@/components/storefront/PathChooser';
import { ProductRail } from '@/components/storefront/ProductRail';
import { TrustStrip } from '@/components/storefront/TrustStrip';
import { auth } from '@/lib/auth';
import { readAll } from '@/lib/db';
import { MARKUP_PCT, QUOTATION_THRESHOLD, deepestSavingPct } from '@/lib/pricing-model';
import { getCatalogue } from '@/lib/queries';
import { rankOffers } from '@/lib/supplier-selection';
import { doorForQuantity, ladderSpread, tierDoors } from '@/lib/tier-doors';

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
      
      <MockupHero />

      {/* Choose how to buy + Popular categories */}
      <section className="bg-white py-8">
        <div className="mx-auto max-w-[1400px] px-4">
          <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:gap-12">
            <div>
              <h2 className="mb-5 text-[20px] font-bold text-gray-900">Choose how you want to buy</h2>
              <PathChooser />
            </div>
            <div>
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-[20px] font-bold text-gray-900">Popular categories</h2>
                <Link href="/browse" className="flex items-center gap-1 text-[13px] font-bold text-[#E67E22] hover:underline">View all &#8594;</Link>
              </div>
              <MockupCategories />
            </div>
          </div>
        </div>
      </section>

      <StatsBanner />

      <PromoCards />

      <TrustPaymentStrip />

      {/* ── What you pay at each quantity ──────────────────────────────── */}
      {featured && doors.length > 0 && (
        <section id="packages" className="py-4">
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
        <div className="grain relative overflow-hidden rounded-xl bg-[#111111] px-8 py-14 text-center sm:px-14">
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
                <ActionButton variant="primary" size="lg" withArrow>
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
