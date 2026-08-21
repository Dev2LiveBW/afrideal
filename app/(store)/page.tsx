import Link from "next/link";
import { BadgeCheck, ClipboardCheck, PackageSearch, Truck } from "lucide-react";

import { GoldButton } from "@/components/brand/GoldButton";
import { CategoryTiles } from "@/components/storefront/DiscoveryRails";
import { FlashDealsRail } from "@/components/storefront/FlashDealsRail";
import {
  LadderProof,
  type LadderProofRow,
} from "@/components/storefront/LadderProof";
import { PriceLadder } from "@/components/storefront/PriceLadder";
import { PathChooser } from "@/components/storefront/PathChooser";
import { ProductRail } from "@/components/storefront/ProductRail";
import { TierCards } from "@/components/storefront/TierCards";
import { TrustStrip } from "@/components/storefront/TrustStrip";
import { Swatch } from "@/components/storefront/Swatch";
import { auth } from "@/lib/auth";
import { readAll } from "@/lib/db";
import { MARKUP_PCT, QUOTATION_THRESHOLD } from "@/lib/pricing-model";
import { getCatalogue } from "@/lib/queries";
import { rankOffers } from "@/lib/supplier-selection";
import { ladderSpread, tierDoors } from "@/lib/tier-doors";

import { Reveal } from "./_components/Reveal";

export const dynamic = "force-dynamic";

/** The category the platform actually sells. It leads the page. */
const FLAGSHIP_CATEGORY = "c1";

export default async function LandingPage() {
  const [
    { categories, products },
    suppliers,
    images,
    offers,
    bands,
    session,
  ] = await Promise.all([
    getCatalogue(),
    readAll("suppliers"),
    readAll("product-images"),
    readAll("supplier-offers"),
    readAll("customer-prices"),
    auth(),
  ]);

  const verified = suppliers.filter(
    (supplier) => supplier.status === "VERIFIED",
  );
  const customerType = session?.user?.customer_type ?? "GUEST";

  const categoryName = new Map(
    categories.map((category) => [category.id, category.name]),
  );
  const primaryImage = new Map(
    images
      .filter((image) => image.sort_order === 0)
      .map((image) => [image.product_id, image]),
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
      ).primary?.supplier.id ?? "",
  });

  const hair = products.filter(
    (product) => product.category_id === FLAGSHIP_CATEGORY,
  );
  const onPromotion = products
    .filter((product) => product.promotion)
    .map(decorate);

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
   * The hero prices its ladder against a hair line, because that is what the
   * business sells. Within the category it takes the most expensive product
   * that is not currently discounted: the highest figures make the gap between
   * the rungs legible at a glance, and a promotional price would have the hero
   * arguing about a sale when the point is the standing price list.
   */
  const featured =
    hair
      .filter((product) => !product.promotion)
      .sort((a, b) => b.price - a.price)[0] ??
    hair[0] ??
    products[0];

  const doors = featured ? tierDoors(bands, featured, customerType) : [];

  const proofRows: LadderProofRow[] = spreads
    .filter(({ product }) => product.id !== featured?.id)
    .sort((a, b) => {
      // Hair first, then by value, so the strip reads as the same catalogue
      // the hero came from rather than a random sample of it.
      const aHair = a.product.category_id === FLAGSHIP_CATEGORY ? 0 : 1;
      const bHair = b.product.category_id === FLAGSHIP_CATEGORY ? 0 : 1;
      return aHair - bHair || b.spread.from - a.spread.from;
    })
    .slice(0, 4)
    .map(({ product, spread }) => ({
      product,
      image: primaryImage.get(product.id),
      ...spread,
    }));

  const hairCategory = categories.find(
    (category) => category.id === FLAGSHIP_CATEGORY,
  );

  return (
    <>
      {/* ── The offer, priced ──────────────────────────────────────────── */}
      <section className="mx-auto max-w-market px-6 pb-16 pt-28 sm:pt-32 lg:pb-24 lg:pt-40">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center lg:gap-20">
          {/*
            `min-w-0` on both columns: a grid item defaults to `min-width:auto`,
            so the column could not shrink below the headline's min-content
            width and pushed the page to 420px on a 375px screen.
          */}
          <div className="min-w-0">
            <h1 className="font-display text-[32px] font-bold leading-[1.06] tracking-[-0.035em] text-ink sm:text-[52px] lg:text-[58px]">
              Compare the price
              <br />
              <span className="text-gold-dark">before</span> you commit.
            </h1>

            <p className="measure mt-6 text-[16px] leading-8 text-body">
              Every product on AfriDeal publishes what it costs at one unit and
              what it costs at fifty. You can see both before you open an
              account, and neither figure is behind an enquiry form.
            </p>

            {/*
                Both secondary. The primary action belongs to the ladder beside
                this column, and a filled gold button here was outranking the
                object the page is about.
              */}
            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link
                href="/browse?category=hair-weaves-extensions"
                className="text-[14.5px] font-medium text-ink underline decoration-gold decoration-2 underline-offset-[6px] transition-colors duration-300 hover:text-gold-dark"
              >
                Shop hair, weaves and extensions
              </Link>
              <Link
                href="#how-it-works"
                className="text-[14.5px] text-body underline-offset-4 transition-colors duration-300 hover:text-ink hover:underline"
              >
                How AfriDeal works
              </Link>
            </div>

            {/*
                Deliberately a sentence, not a stat block. The real figures are
                small — this is a young marketplace — and three big numerals
                would make a modest catalogue look like a boast rather than a
                fact.
              */}
            <p className="mt-10 border-t border-hairline pt-6 text-[13px] leading-6 text-muted">
              <span className="font-mono tabular-nums text-ink">
                {products.length}
              </span>{" "}
              products from{" "}
              <span className="font-mono tabular-nums text-ink">
                {verified.length}
              </span>{" "}
              verified suppliers in Botswana and South Africa, delivered to your
              door.
            </p>
          </div>

          {/*
            The ladder. Ink and gold against the light page, so the one object
            carrying the argument is also the one object that reads as an
            instrument rather than as page furniture.

            It is also the page's only staged entrance. Every section used to
            arrive on the same fade-up, which is not choreography — it is the
            same effect fifteen times, and it made the thesis object arrive with
            no more ceremony than a footer. One moment, on the thing the page is
            about.
          */}
          {featured && doors.length > 0 && (
            <Reveal delay={0.1} className="min-w-0">
              <div className="grain relative overflow-hidden rounded-xl bg-ink p-2 shadow-lift">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-[radial-gradient(100%_70%_at_85%_0%,rgba(212,146,10,0.18),transparent_62%)]"
                />

                <div className="relative rounded-[calc(2rem-0.5rem)] p-5 sm:p-7">
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
                        {categoryName.get(featured.category_id)} · one product,
                        three quantities
                      </p>
                    </div>
                  </div>

                  <div className="mt-6">
                    <PriceLadder doors={doors} productName={featured.name} />
                  </div>

                  <p className="mt-5 text-[11.5px] leading-5 text-white/55">
                    Prices are per unit in Pula and applied automatically at
                    checkout. The same rungs are published on every product in
                    the catalogue.
                  </p>
                </div>
              </div>
            </Reveal>
          )}
        </div>

        {/*
          The two ways in, closing the hero block rather than opening a section
          of their own. A visitor who already knows which one they want should
          not have to scroll past the argument to find the door.
        */}
        <PathChooser
          marketplaceImage={featured ? primaryImage.get(featured.id) : undefined}
          productCount={products.length}
          className="mt-14 lg:mt-20"
        />
      </section>

      {/* ── What you pay at each quantity ──────────────────────────────── */}
      {proofRows.length > 0 && (
        <section className="border-y border-hairline bg-surface-raised">
          <div className="mx-auto max-w-market px-6 py-20 lg:py-24">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] lg:gap-20">
              <div className="min-w-0 lg:sticky lg:top-28 lg:self-start">
                <h2 className="font-display text-headline-lg font-semibold leading-tight text-ink">
                  What you pay, at every quantity
                </h2>
                <p className="measure mt-4 text-[14.5px] leading-7 text-body">
                  AfriDeal buys from the supplier and resells to you at a
                  published markup:{" "}
                  <span className="font-mono tabular-nums text-ink">
                    {MARKUP_PCT.RETAIL}%
                  </span>{" "}
                  on retail quantities and{" "}
                  <span className="font-mono tabular-nums text-ink">
                    {MARKUP_PCT.BULK}%
                  </span>{" "}
                  from five units up. The same arithmetic runs on every product,
                  so the saving holds whatever you are buying.
                </p>
                <Link
                  href="/browse"
                  className="mt-6 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-gold-dark underline-offset-4 hover:underline"
                >
                  See the whole catalogue
                </Link>
              </div>

              <div className="min-w-0">
                {featured && doors.length > 0 && (
                  <TierCards doors={doors} productName={featured.name} />
                )}

                {/*
                  The same claim, checked against four more products. The tier
                  cards above could be one generous product; this is the part
                  that says it is the catalogue.
                */}
                <div className="mt-10 border-t border-hairline pt-8">
                  <h3 className="text-[14px] font-semibold text-ink">
                    And on everything else
                  </h3>
                  <p className="mt-1.5 text-[13px] leading-5 text-muted">
                    Retail price, bulk price, and what the drop is worth per unit.
                  </p>
                  <LadderProof rows={proofRows} className="mt-5" />
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── The flagship category ──────────────────────────────────────── */}
      {hair.length > 0 && (
        <section className="mx-auto max-w-market px-6 pt-20 lg:pt-24">
          <ProductRail
            products={hair.map(decorate)}
            images={images}
            title={hairCategory?.name ?? "Hair, Weaves & Extensions"}
            description="Bundles, frontals, closures, wigs and braiding hair, in the range salons reorder"
            action={
              <Link href="/browse?category=hair-weaves-extensions">
                <GoldButton variant="ghost" size="sm">
                  See all {hair.length}
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
      <section
        id="how-it-works"
        className="mt-24 border-y border-hairline bg-surface-raised"
      >
        <div className="mx-auto grid max-w-market gap-14 px-6 py-24 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
          <div className="min-w-0 lg:sticky lg:top-28 lg:self-start">
            <h2 className="font-display text-headline-lg font-semibold leading-tight text-ink">
              You are buying from AfriDeal, not from the supplier.
            </h2>
            <p className="measure mt-4 text-[14.5px] leading-7 text-body">
              We are the merchant on your order rather than an introduction
              service. You get one invoice and one number to call, and if the
              order goes wrong it is ours to fix rather than something to take
              up with a supplier you have never dealt with.
            </p>
            <p className="measure mt-4 text-[14.5px] leading-7 text-body">
              A runner request runs the same way, with one step added: nothing
              is bought until you have seen the price the runner found and said
              yes to it.
            </p>
          </div>

          <ol className="relative">
            {[
              {
                state: "Order",
                tone: "amber",
                title: "You order at the published price",
                body: "The rung your quantity falls on is applied automatically at checkout. Payment is processed by a licensed provider (DPO Pay, Orange Money or PayGate), so your card details never reach us.",
                icon: <ClipboardCheck size={15} strokeWidth={1.5} />,
              },
              {
                state: "Source",
                tone: "amber",
                title: "We buy the goods from a verified supplier",
                body: "Orders route to whichever verified supplier is carrying the stock and most likely to deliver on time. A mixed basket splits across several, and each supplier sees only their own part of it.",
                icon: <PackageSearch size={15} strokeWidth={1.5} />,
              },
              {
                state: "Deliver",
                tone: "ink",
                title: "A vetted courier brings it to you",
                body: "Pickup and delivery are tracked against the order, so you can see where it is. If one leg of a split order fails, that leg is refunded without unwinding the rest.",
                icon: <Truck size={15} strokeWidth={1.5} />,
              },
              {
                state: "Confirm",
                tone: "green",
                title: "You confirm, and you are covered either way",
                body: "Tell us it arrived and the order closes. If it is late, short or not as described, report it and we will replace it or refund you. Returns stay open for seven days after delivery.",
                icon: <BadgeCheck size={15} strokeWidth={1.5} />,
              },
            ].map((step, index, all) => (
              <li
                key={step.state}
                className="relative flex gap-5 pb-9 last:pb-0"
              >
                {index < all.length - 1 && (
                  <span className="absolute left-[19px] top-11 h-[calc(100%-1rem)] w-px bg-hairline-strong" />
                )}

                {/*
                  The medallion carries the step number and the glyph together.
                  Four states that must happen in order is a sequence the reader
                  is actually tracking, which is what earns an ordinal here; a
                  number pinned to an unordered list of features would not.
                */}
                <span
                  className={`relative z-10 flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-full ring-1 ring-inset ${
                    step.tone === "amber"
                      ? "bg-gold-50 text-gold-700 ring-gold/25"
                      : step.tone === "green"
                        ? "bg-forest-wash text-forest ring-forest/20"
                        : "bg-ink/[0.06] text-ink ring-hairline-strong"
                  }`}
                >
                  {step.icon}
                  <span className="mt-0.5 font-mono text-[9px] font-semibold tabular-nums opacity-70">
                    {index + 1}
                  </span>
                </span>

                <div className="min-w-0 flex-1 pt-1">
                  {/*
                      The state word used to sit above the heading as a mono
                      tracked kicker. The four-step spine already sequences
                      itself, so it reads as the heading's own subject instead.
                    */}
                  <h3 className="text-[16px] font-semibold leading-6 text-ink">
                    <span className="text-muted">{step.state}.</span>{" "}
                    {step.title}
                  </h3>
                  <p className="measure mt-2 text-[13.5px] leading-6 text-body">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/*
        No heading. These four are the conditions under which everything above
        is true, so they read as a specification plate under the sequence rather
        than as a section making its own case.
      */}
      <section className="mx-auto max-w-market px-6 pt-14">
        <TrustStrip />
      </section>

      {/* ── Trade enquiries ────────────────────────────────────────────── */}
      <section className="mx-auto max-w-market px-6 pb-24 pt-16">
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
              Above the published ladder we quote rather than list, because at
              that volume the price depends on your delivery point and how much
              notice you can give us. Send the specification and we will come
              back with a written quotation.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/browse?tier=WHOLESALE">
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
