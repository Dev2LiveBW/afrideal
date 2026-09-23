import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, MessageCircleQuestion, ShieldCheck } from 'lucide-react';

import { ActionButton } from '@/components/brand/ActionButton';
import { HowItWorks } from '@/components/storefront/HowItWorks';
import { OrderFlows } from '@/components/storefront/OrderFlows';
import { PackagesBoard } from '@/components/storefront/PackagesBoard';
import { PathChooser } from '@/components/storefront/PathChooser';
import { TrustStrip } from '@/components/storefront/TrustStrip';
import { auth } from '@/lib/auth';
import { readAll } from '@/lib/db';
import { MARKUP_PCT, QUOTATION_THRESHOLD } from '@/lib/pricing-model';
import { getCatalogue } from '@/lib/queries';
import { doorForQuantity, tierDoors } from '@/lib/tier-doors';

export const metadata: Metadata = {
  title: 'How AfriDeal works',
  description:
    'How to use AfriDeal: buying from the marketplace, sending a runner to source something, and the five published packages every product is priced on.',
};

export const dynamic = 'force-dynamic';

/**
 * The instruction manual.
 *
 * Everything on this page exists somewhere else on the site in a shorter form -
 * the landing page states the five steps, the product page shows the ladder,
 * the request page runs the runner flow. This is the surface for the reader who
 * wants the whole thing in order before they commit to any of it, so it is
 * written to be read top to bottom rather than scanned.
 *
 * Three questions, in the order a first-time buyer asks them: what happens to
 * my money, how does each of the two paths actually run, and how is the price
 * decided. Nothing here is illustrative - the flows come from the state
 * machines the API enforces, and the packages are priced against a real
 * catalogue product through the same resolution the checkout uses.
 */
export default async function HowItWorksPage() {
  const [{ products }, bands, session] = await Promise.all([
    getCatalogue(),
    readAll('customer-prices'),
    auth(),
  ]);

  const customerType = session?.user?.customer_type ?? 'GUEST';

  /*
   * Priced against the dearest non-promotional product on the catalogue. The
   * gaps between five rungs are what this page is explaining, and they are
   * easiest to read where the figures are largest; a discounted line would put
   * a sale price in a section about the standing price list.
   */
  const featured =
    products.filter((product) => !product.promotion).sort((a, b) => b.price - a.price)[0] ??
    products[0];

  const doors = featured ? tierDoors(bands, featured, customerType) : [];

  return (
    <div className="pt-24">
      {/* ── What happens to your money ─────────────────────────────────── */}
      <section className="border-b border-hairline bg-gradient-to-b from-[#FBF7EF] to-surface">
        <div className="mx-auto max-w-market px-6 py-16 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-center lg:gap-16">
            <div className="min-w-0">
              <h1 className="font-display text-[34px] font-bold leading-[1.06] tracking-[-0.03em] text-ink sm:text-[46px]">
                Nothing is paid out
                <br />
                <span className="text-forest">until you confirm</span> it arrived.
              </h1>
              <p className="measure mt-6 text-[16px] leading-8 text-body">
                Whether you buy from a verified supplier or ask a runner to source something for
                you, you pay AfriDeal — not the person filling the order. We hold the order open
                until you tell us the goods are in your hands, and only then is the supplier or the
                runner settled.
              </p>

              {/*
                The exact legal position, in the same place as the promise it
                qualifies. AfriDeal is the merchant on the sale and the money
                moves through licensed providers; the platform is not itself a
                payment provider. This wording is fixed.
              */}
              <p className="mt-6 flex gap-3 rounded-lg bg-surface-raised p-4 text-[12.5px] leading-5 text-muted ring-1 ring-inset ring-hairline">
                <ShieldCheck
                  size={16}
                  strokeWidth={1.6}
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-forest"
                />
                <span>
                  AfriDeal is not a payment provider. Payments are processed by licensed partners —
                  DPO Pay, Orange Money and PayGate — and AfriDeal does not hold funds on behalf of
                  buyers or suppliers. Your card details never reach us.
                </span>
              </p>
            </div>

            <div className="min-w-0">
              <HowItWorks />
            </div>
          </div>
        </div>
      </section>

      {/* ── Choose your path ───────────────────────────────────────────── */}
      <section className="mx-auto max-w-market px-6 py-16 lg:py-20">
        <h2 className="font-display text-headline-lg font-semibold leading-tight text-ink">
          Choose how you want us to help
        </h2>
        <p className="measure mt-3 text-[14.5px] leading-7 text-body">
          Three transactions, not one with two afterthoughts. Pick the one that matches what you
          are trying to buy.
        </p>

        {/* This section writes its own heading, so the cards must not add one. */}
        <PathChooser className="mt-8" heading={false} />
      </section>

      {/* ── The two flows ──────────────────────────────────────────────── */}
      <section className="border-y border-hairline bg-surface-raised">
        <div className="mx-auto max-w-market px-6 py-20 lg:py-24">
          <div className="max-w-2xl">
            <h2 className="font-display text-headline-lg font-semibold leading-tight text-ink">
              Two ways in, the same protection
            </h2>
            <p className="mt-3 text-[14.5px] leading-7 text-body">
              The states below are the ones the platform actually runs on — the same words you will
              see on your own order or request while it is open. Both chains end the same way: you
              confirm, and only then does the money move outward.
            </p>
          </div>

          <OrderFlows className="mt-10" />

          <p className="mt-8 flex gap-3 rounded-lg bg-gold-50/60 p-4 text-[13px] leading-6 text-gold-700 ring-1 ring-inset ring-gold/25">
            <MessageCircleQuestion
              size={16}
              strokeWidth={1.6}
              aria-hidden="true"
              className="mt-0.5 shrink-0"
            />
            <span>
              You stay in control at every step. A runner request can be cancelled at no cost right
              up until you approve the price, and a marketplace order that arrives late, short or
              not as described can be disputed for seven days after delivery.
            </span>
          </p>
        </div>
      </section>

      {/* ── The packages ───────────────────────────────────────────────── */}
      {featured && doors.length > 0 && (
        <section className="mx-auto max-w-market px-6 py-20 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] lg:gap-20">
            <div className="min-w-0 lg:sticky lg:top-28 lg:self-start">
              <h2 className="font-display text-headline-lg font-semibold leading-tight text-ink">
                The price depends on who is buying, and how many
              </h2>
              <p className="measure mt-4 text-[14.5px] leading-7 text-body">
                A product does not have one universal price. Prices are set per quantity, they are
                the same for every account type, and they apply automatically at checkout — the
                markup falls from{' '}
                <span className="font-mono tabular-nums text-ink">{MARKUP_PCT.RETAIL}%</span> over
                supplier cost at a single unit to{' '}
                <span className="font-mono tabular-nums text-ink">
                  {MARKUP_PCT.WHOLESALE_PLUS}%
                </span>{' '}
                at fifty. Past{' '}
                <span className="font-mono tabular-nums text-ink">{QUOTATION_THRESHOLD}</span> units
                we quote rather than list, because the figure then depends on your delivery point
                and lead time.
              </p>
              <p className="measure mt-4 text-[14.5px] leading-7 text-body">
                These five packages are the baseline for every product on the platform. No listing
                has its own quantity breaks, and no rung is withheld pending an account.
              </p>
            </div>

            <div className="min-w-0">
              <p className="text-[12.5px] leading-5 text-muted">
                Priced on <span className="font-medium text-ink">{featured.name}</span>, per unit.
              </p>

              <PackagesBoard
                doors={doors}
                productName={featured.name}
                activeTier={doorForQuantity(1)}
                className="mt-4"
              />
            </div>
          </div>
        </section>
      )}

      {/* ── The conditions ─────────────────────────────────────────────── */}
      <section className="bg-forest-deep">
        <div className="mx-auto max-w-market px-6 py-12">
          <TrustStrip tone="dark" />
        </div>
      </section>

      <section className="mx-auto max-w-market px-6 py-20">
        <div className="flex flex-wrap items-center justify-between gap-6 rounded-lg bg-surface-raised p-8 ring-1 ring-inset ring-hairline">
          <div className="min-w-0">
            <h2 className="font-display text-[20px] font-semibold tracking-[-0.015em] text-ink">
              Ready to start?
            </h2>
            <p className="mt-1.5 text-[13.5px] leading-6 text-body">
              Browse the catalogue, or tell a runner what you are looking for.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/browse">
              <ActionButton variant="forest" size="md" withArrow>
                Browse products
              </ActionButton>
            </Link>
            <Link href="/request-a-runner">
              <ActionButton variant="gold" size="md">
                Request a runner
              </ActionButton>
            </Link>
            <Link
              href="/#packages"
              className="inline-flex items-center gap-1.5 self-center text-[13.5px] font-medium text-forest underline-offset-4 hover:underline"
            >
              See the packages
              <ArrowRight size={13} strokeWidth={1.75} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
