import Link from "next/link";
import { BadgeCheck, Lock, PackageCheck, Truck } from "lucide-react";

import { GoldButton } from "@/components/brand/GoldButton";
import { CategoryTiles } from "@/components/storefront/DiscoveryRails";
import { FlashDealsRail } from "@/components/storefront/FlashDealsRail";
import {
  LadderProof,
  type LadderProofRow,
} from "@/components/storefront/LadderProof";
import { PriceLadder } from "@/components/storefront/PriceLadder";
import { ProductRail } from "@/components/storefront/ProductRail";
import { Swatch } from "@/components/storefront/Swatch";
import { auth } from "@/lib/auth";
import { readAll } from "@/lib/db";
import { getCatalogue } from "@/lib/queries";
import { rankOffers } from "@/lib/supplier-selection";
import { ladderSpread, tierDoors } from "@/lib/tier-doors";

import { Reveal } from "./_components/Reveal";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const [
    { categories, products },
    suppliers,
    orders,
    images,
    offers,
    bands,
    session,
  ] = await Promise.all([
    getCatalogue(),
    readAll("suppliers"),
    readAll("orders"),
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

  const onPromotion = products
    .filter((product) => product.promotion)
    .map(decorate);
  const newArrivals = [...products]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 8)
    .map(decorate);

  /*
   * Every product's published spread, deepest first. This drives two things:
   * the hero prices its ladder against the product with the most to show, and
   * the proof strip below lists the next few. Chosen from data rather than
   * pinned to an id, so re-seeding cannot leave the hero quoting a flat ladder.
   */
  const spreads = products
    .map((product) => ({ product, spread: ladderSpread(bands, product) }))
    .filter(
      (
        row,
      ): row is {
        product: (typeof products)[number];
        spread: NonNullable<ReturnType<typeof ladderSpread>>;
      } => row.spread !== null,
    )
    .sort((a, b) => b.spread.pct - a.spread.pct);

  const featured = spreads[0]?.product ?? products[0];
  const doors = featured ? tierDoors(bands, featured, customerType) : [];

  const proofRows: LadderProofRow[] = spreads
    .slice(1, 5)
    .map(({ product, spread }) => ({
      product,
      image: primaryImage.get(product.id),
      ...spread,
    }));

  return (
    <>
      {/* ── The mechanism, priced ──────────────────────────────────────── */}
      <section className="mx-auto max-w-market px-6 pb-16 pt-28 sm:pt-32 lg:pb-24 lg:pt-40">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center lg:gap-20">
          {/*
            `min-w-0` on both columns: a grid item defaults to `min-width:auto`,
            so the column could not shrink below the headline's min-content
            width and pushed the page to 420px on a 375px screen.
          */}
          <div className="min-w-0">
            <h1 className="font-display text-[32px] font-bold leading-[1.06] tracking-[-0.035em] text-ink sm:text-[52px] lg:text-[58px]">
              Every product here
              <br />
              has <span className="text-gold-dark">three prices</span>.
            </h1>

            <p className="measure mt-6 text-[16px] leading-8 text-body">
              Retail, bulk and wholesale, all published before you commit.
              Nobody has to ask what a hundred would cost — the rung is on the
              page, and you pick the one that matches how you buy.
            </p>

            {/*
                Both secondary. The contract puts the primary action on the
                three rungs, and a filled gold button here was outranking the
                object the page is about.
              */}
            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link
                href="/browse"
                className="text-[14.5px] font-medium text-ink underline decoration-gold decoration-2 underline-offset-[6px] transition-colors duration-300 hover:text-gold-dark"
              >
                Browse the whole catalogue
              </Link>
              <Link
                href="#how-it-works"
                className="text-[14.5px] text-body underline-offset-4 transition-colors duration-300 hover:text-ink hover:underline"
              >
                How escrow works
              </Link>
            </div>

            {/*
                Deliberately a sentence, not a stat block. The real figures are
                small — this is a young marketplace — and three big numerals
                would make 12 products look like a boast rather than a fact.
              */}
            <p className="mt-10 border-t border-hairline pt-6 text-[13px] leading-6 text-muted">
              <span className="font-mono tabular-nums text-ink">
                {products.length}
              </span>{" "}
              products from{" "}
              <span className="font-mono tabular-nums text-ink">
                {verified.length}
              </span>{" "}
              verified suppliers in Botswana and South Africa. Escrow on every
              order.
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
                        {categoryName.get(featured.category_id)} · same product,
                        three rungs
                      </p>
                    </div>
                  </div>

                  <div className="mt-6">
                    <PriceLadder doors={doors} productName={featured.name} />
                  </div>

                  <p className="mt-5 text-[11.5px] leading-5 text-white/55">
                    Prices are per unit in Pula and applied automatically at
                    checkout.
                    {customerType === "GUEST" &&
                      " Bulk and wholesale rungs open with an account."}
                  </p>
                </div>
              </div>
            </Reveal>
          )}
        </div>
      </section>

      {/* ── The ladder is not one product's promotion ──────────────────── */}
      {proofRows.length > 0 && (
        <section className="border-y border-hairline bg-surface-raised">
          <div className="mx-auto max-w-market px-6 py-20 lg:py-24">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] lg:gap-20">
              <div className="min-w-0 lg:sticky lg:top-28 lg:self-start">
                <h2 className="font-display text-headline-lg font-semibold leading-tight text-ink">
                  It is how the catalogue is priced, not a sale
                </h2>
                <p className="measure mt-4 text-[14.5px] leading-7 text-body">
                  Each product carries its own ladder, set against what the
                  supplier charges and the margin floor beneath it. Some fall
                  further than others, and the ones that barely move say so.
                </p>
                <Link
                  href="/browse"
                  className="mt-6 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-gold-dark underline-offset-4 hover:underline"
                >
                  See every ladder
                </Link>
              </div>

              <LadderProof rows={proofRows} />
            </div>
          </div>
        </section>
      )}

      {/* ── Categories ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-market px-6 pt-20 lg:pt-24">
        <CategoryTiles categories={categories} products={products} />
      </section>

      {/* ── Live deals ─────────────────────────────────────────────────── */}
      {onPromotion.length > 0 && (
        <section className="mx-auto max-w-market px-6 pt-20">
          <FlashDealsRail products={onPromotion} images={images} />
        </section>
      )}

      {/* ── New arrivals ───────────────────────────────────────────────── */}
      <section className="mx-auto max-w-market px-6 pt-20">
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
      </section>

      {/* ── Why the price is worth trusting ────────────────────────────── */}
      <section
        id="how-it-works"
        className="mt-24 border-y border-hairline bg-surface-raised"
      >
        <div className="mx-auto grid max-w-market gap-14 px-6 py-24 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
          <div className="min-w-0 lg:sticky lg:top-28 lg:self-start">
            <h2 className="font-display text-headline-lg font-semibold leading-tight text-ink">
              A good price is worth nothing if the goods never arrive
            </h2>
            <p className="measure mt-4 text-[14.5px] leading-7 text-body">
              So the money moves last. Every order runs through the same four
              states, and a supplier is paid at the fourth.
            </p>
          </div>

          <ol className="relative">
            {[
              {
                state: "Paid",
                tone: "amber",
                title: "You pay AfriDeal, not the supplier",
                body: "The payment settles into a platform-held account through DPO Pay, Orange Money or PayGate. The supplier can see that it landed. They cannot touch it.",
                icon: <Lock size={15} strokeWidth={1.5} />,
              },
              {
                state: "Held",
                tone: "amber",
                title: "The order is routed and prepared",
                body: "Your order splits to whichever verified suppliers are carrying the stock. Each of them sees only their own part of it, and each has their own escrow leg.",
                icon: <PackageCheck size={15} strokeWidth={1.5} />,
              },
              {
                state: "In transit",
                tone: "ink",
                title: "A runner collects and delivers",
                body: "Pickup and delivery are tracked against the order. If a leg fails, that leg refunds without unwinding the rest of the order.",
                icon: <Truck size={15} strokeWidth={1.5} />,
              },
              {
                state: "Released",
                tone: "green",
                title: "You confirm, and only then is the supplier paid",
                body: "Nothing releases automatically on a timer. If what arrived is wrong, you raise a dispute instead and the funds freeze until it is resolved.",
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

                <span
                  className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-1 ring-inset ${
                    step.tone === "amber"
                      ? "bg-gold-50 text-gold-700 ring-gold/25"
                      : step.tone === "green"
                        ? "bg-forest-wash text-forest ring-forest/20"
                        : "bg-ink/[0.06] text-ink ring-hairline-strong"
                  }`}
                >
                  {step.icon}
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

      {/* ── Supplier CTA ───────────────────────────────────────────────── */}
      <section className="mx-auto max-w-market px-6 py-24">
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
              You see the money land in escrow before you pick and pack, and it
              settles to you once the buyer confirms. Verification takes a few
              days.
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
      </section>
    </>
  );
}
