import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { HowItWorks } from '@/components/storefront/HowItWorks';
import { InfoRibbon } from '@/components/storefront/InfoRibbon';
import { LiveDeals, type LiveDealRow } from '@/components/storefront/LiveDeals';
import { StatsBanner, PromoCards } from '@/components/storefront/HomePromoSections';
import { MockupHero } from '@/components/storefront/MockupHero';
import { PopularCategories } from '@/components/storefront/PopularCategories';
import { PathChooser } from '@/components/storefront/PathChooser';
import { SupplierDirectorySection } from '@/components/storefront/SupplierDirectory';
import { TrustStrip } from '@/components/storefront/TrustStrip';
import { auth } from '@/lib/auth';
import { readAll } from '@/lib/db';
import { getDirectoryListings } from '@/lib/directory';
import {
  DIRECTORY_ON_HOMEPAGE,
  DIRECTORY_PREVIEW_COUNT,
  DIRECTORY_ROUTE,
} from '@/lib/directory-placement';
import { getCatalogue } from '@/lib/queries';
import { rankOffers } from '@/lib/supplier-selection';
import { ladderSpread } from '@/lib/tier-doors';

export const dynamic = 'force-dynamic';

/**
 * The quantity a visitor is standing on before they have chosen one. It is the
 * entry rung by definition, and naming it here keeps the "your tier" badge on
 * the pricing explainer honest rather than decorative.
 */
const DEFAULT_QUANTITY = 1;

/** The category the platform sells most of. It prices the ladder. */
const FLAGSHIP_CATEGORY = 'c1';

export default async function LandingPage() {
  const [{ categories, products }, images, bands, offers, suppliers, session, directory] =
    await Promise.all([
      getCatalogue(),
      readAll('product-images'),
      readAll('customer-prices'),
      readAll('supplier-offers'),
      readAll('suppliers'),
      auth(),
      getDirectoryListings({ limit: DIRECTORY_PREVIEW_COUNT }),
    ]);


  const primaryImage = new Map(
    images.filter((image) => image.sort_order === 0).map((image) => [image.product_id, image]),
  );
  const categoryName = new Map(categories.map((category) => [category.id, category.name]));

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
   * The ladder is priced against the flagship line, because that is what the
   * business sells most of. Within the category it takes the most expensive
   * product that is not currently discounted: the highest figures make the gap
   * between the rungs legible at a glance, and a promotional price would have
   * the section arguing about a sale when the point is the standing price list.
   */
  const featured =
    flagship.filter((product) => !product.promotion).sort((a, b) => b.price - a.price)[0] ??
    flagship[0] ??
    products[0];


  /*
   * Biggest saving in Pula first, not the deepest percentage.
   *
   * The ladder is one rule applied to the whole catalogue, so every product
   * that is not on promotion drops by the same percentage between the retail
   * rung and the cheapest one - sorting on `pct` puts four identical −24%
   * badges on screen in arbitrary order and the section reads as a rendering
   * bug. What actually differs between products is what the drop is worth,
   * and that is the number a buyer is choosing on.
   *
   * The product the pricing explainer is priced against is excluded: it is
   * already on the page with its full ladder shown.
   */
  const dealRows: LiveDealRow[] = spreads
    .filter(({ product }) => product.id !== featured?.id)
    .sort((a, b) => b.spread.from - b.spread.to - (a.spread.from - a.spread.to))
    .slice(0, 4)
    .map(({ product, spread }) => ({
      product,
      image: primaryImage.get(product.id),
      categoryName: categoryName.get(product.category_id),
      /*
       * Quick-add on a deal card has to book against a real supplier, or the
       * cart line carries an empty supplier_id and the routing engine has
       * nothing to fulfil it with.
       */
      primarySupplierId:
        rankOffers(
          offers.filter((offer) => offer.product_id === product.id),
          suppliers,
        ).primary?.supplier.id ?? '',
      ...spread,
    }));

  return (
    <>
      <MockupHero />

      {/* ── Popular Categories ──────────────────────────────────────────
        TICKET-001. Exactly one block, and the heading lives inside the
        component so it cannot be duplicated from a call site. The old
        "Choose how you want to buy" cards that sat beside it were the
        Retail/Bulk/Wholesale explainer a third time over - consolidated into
        PricingExplainer below for TICKET-003 - so this now runs full width.
      */}
      <section className="bg-surface-raised py-8">
        <div className="mx-auto max-w-market px-4">
          <PopularCategories />
        </div>
      </section>

      {/* ── The service guarantees, compact ─────────────────────────────
        TICKET-005. One hairline row where a boxed panel used to stand, so the
        supplier listings below it clear the fold.
      */}
      <InfoRibbon className="pb-6" />

      {/* ── Supplier / product directory ────────────────────────────────
        TICKET-007. TODO(TICKET-007): this homepage placement is temporary.
        The directory also stands alone at DIRECTORY_ROUTE and appears in the
        storefront nav; which of the three survives is the product owner's
        call. Flip DIRECTORY_ON_HOMEPAGE in lib/directory-placement.ts.
      */}
      {DIRECTORY_ON_HOMEPAGE && (
        <SupplierDirectorySection listings={directory} href={DIRECTORY_ROUTE} className="pb-8" />
      )}

      {/* ── Live Deals ──────────────────────────────────────────────────
        TICKET-004. Was "And on everything else", a caption-and-list block
        buried under the packages board. Cards now, each carrying the drop and
        the quantity that earns it.
      */}
      <LiveDeals rows={dealRows} className="pb-10" />

      {/* ── How the quantity ladder works ──────────────────────────────
        TICKET-003. The single pricing block on the page. The prose explainer
        and the five-rung board that used to sit here were the same argument a
        second and third time; the product owner asked for the cards alone,
        which say it without the essay.
      */}
      <PathChooser className="mx-auto max-w-market px-4 pb-12" />

      <StatsBanner />

      <PromoCards />



      {/* ── How the order actually runs ─────────────────────────────────── */}
      <section id="how-it-works" className="mt-16 py-4">
        <div className="mx-auto max-w-market px-6 py-16 lg:py-20">
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

      {/*
        ── TICKET-006: the bulk-quotation card is gone ───────────────────

        The "Buying 100 units or more? / Request a quotation / Apply as a
        supplier" panel used to close this page. It has been removed from the
        UI only.

        OPEN QUESTION - "Apply as a supplier" has no confirmed home. The
        backend flow is deliberately untouched and still reachable:

          - /signup registers a supplier account
            (app/api/auth/register, lib/auth.ts)
          - /supplier/* is the supplier portal behind it
          - admin approval runs at /admin/suppliers

        Do NOT remove or gate any of that without the product owner's sign-off.
        The only outstanding decision is where the entry point is surfaced: the
        nav, the footer, a dedicated landing page, or the "Become a Supplier"
        promo card in HomePromoSections, which still links to /signup.

        Quotation requests are likewise unaffected: /browse?tier=CUSTOM and
        components/procurement/RfqModal.tsx still carry that flow.
      */}
    </>
  );
}
