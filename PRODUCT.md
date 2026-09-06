# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary - the buyer on the storefront.** One person buying across a wide range
of need and quantity, in Botswana and increasingly South Africa:

- a household shopper taking one or four units of a consumable;
- a small trader or salon owner restocking five to fifty units;
- a business, reseller, school or clinic buying fifty units or more.

The important fact is that these are not three separate audiences with three
separate products. They are the same catalogue, and the same buyer moves
between them - a salon owner buys one blender for the shop and forty bottles of
treatment for the shelf. What changes is the quantity, and the price per unit
changes with it.

**Secondary, each with their own portal:** verified suppliers managing offers
and fulfilment; runners carrying the last mile; and platform staff split across
operations, finance and super-admin.

## Product Purpose

A procurement marketplace connecting verified suppliers in Botswana and South
Africa with buyers who need the goods to actually arrive.

**AfriDeal is the merchant of record.** The customer buys from AfriDeal and pays
AfriDeal through a licensed payment provider; AfriDeal buys the goods from a
verified supplier and settles that invoice on its own terms. Nothing is held on
another party's behalf. This is a deliberate commercial choice as much as a
regulatory one - it keeps the platform out of scope for a Bank of Botswana
escrow licence, and it means one invoice, one point of contact, and one party
answerable when an order goes wrong.

Suppliers are verified before they can list, and an order routes to whichever
verified supplier is most likely to deliver it, not to whichever is cheapest.

**There are two ways onto the platform, and the design has to carry both.** The
marketplace answers "I know what I want and you list it". A runner sourcing
request answers "I know what I want and nobody lists it": the buyer describes
it, a verified runner goes and finds it, sends back the price and the condition,
and buys it only once the buyer approves. The second path is what makes the
catalogue's own limits survivable, so it is drawn as the marketplace's equal
rather than as a footnote to it.

Success is a buyer who understands, before they commit, exactly what they will
pay at the quantity they need - and gets the goods.

## Positioning

**The price ladder is the mechanism, and the comparison is the message.** A
product on AfriDeal does not have "a price"; it has a ladder of published bands,
and which rung a buyer stands on is decided by one thing they control - how many
units they take.

AfriDeal buys from the supplier and resells at a published markup:

| Quantity | Tier | Price |
|---|---|---|
| 1–4 | Retail | supplier cost + 60% |
| 5–99 | Bulk | supplier cost + 44% |
| 100+ | Wholesale | by quotation |

The ladder does not vary by account type. Everyone is shown and charged the same
published figure for the same quantity, with no account required to see it. A
price a buyer has to apply for is not a price advantage they can act on.

This is what a neighbouring marketplace cannot truthfully copy: most show one
retail price and hide wholesale behind a sales conversation. Confirmed, live in
`data/customer-prices.json`, generated from `lib/pricing-model.ts` and resolved
by `lib/pricing-tiers.ts`.

Worked example, HD Lace Frontal 13×4 (p014), supplier cost BWP 715:

| Quantity | Tier | Unit price |
|---|---|---|
| 1–4 | Retail | BWP 1,144.00 |
| 5–99 | Bulk | BWP 1,030.00 |
| 100+ | By quotation | RFQ |

## Operating Context

- Currency is BWP throughout, formatted to two decimals always.
- Suppliers sit in Botswana (Gaborone and elsewhere) and South Africa, so
  cross-border fulfilment and its lead times are ordinary, not exceptional.
- Buyers arrive on a wide spread of devices and connection quality; mobile is
  the common case, not the adaptation.
- **Hair extensions and weaves are the business.** Bundles, frontals, closures,
  wigs and braiding hair are what the platform actually sells, and the
  catalogue, the navigation and the landing page are ordered accordingly.
  Categories in the live catalogue, in that order: Hair Weaves & Extensions,
  Beauty & Personal Care, Electronics, Clothing & Uniforms, Food & Agriculture,
  Building Materials, Office Supplies.
- The demo is driven live in front of a room, so every screen reads real data
  and every state-changing action writes back to disk.

## Capabilities and Constraints

**Confirmed and live:**

- Published tier ladder per product, resolved on quantity alone.
- Supplier payables: AfriDeal's own trade-creditors ledger, settled after
  delivery is confirmed, with claim handling that pauses settlement.
- Buyer protection stated as a returns-and-refunds commitment by AfriDeal as
  merchant, open for seven days after delivery.
- Supplier verification, reliability scoring, and reliability-based routing.
- RFQ / quotation flow for quantities above the published ladder.
- Runner sourcing requests: a seven-state flow from REQUESTED through to
  CONFIRMED, with the price set by the runner and approved by the buyer before
  anything is bought. Live in `data/runner-requests.json`, governed by
  `lib/runner-requests.ts`, and surfaced on the storefront, the runner portal
  and the operations console.
- Fulfilment comparison across the verified suppliers carrying a product: who
  has stock, how fast, how reliably.
- Four portals over one JSON store: storefront, supplier, runner, admin.

**Hard constraints that design must not violate:**

- **Supplier acquisition costs are confidential (§5).** The storefront payload
  carries no `supplier_cost` field. Enforced by the `PublicOffer` type and by
  the `npm run verify` suite.
- **A buyer never sees individual supplier quotes (§5).** Under Model A the
  customer pays one AfriDeal price whichever supplier is routed. Supplier
  comparison on the storefront is therefore about *fulfilment*, never price.
- **Transparent procurement is not a shopper toggle (§23).** It is a commercial
  decision made per supplier agreement; if it ships it arrives as server-
  resolved props on a separate B2B surface.
- Customer type comes from the account, resolved server-side - never chosen in
  the browser, or any visitor could quote themselves wholesale via localStorage.
- Margin floors (§19) must hold; a tier band can never price below them.
- Self-registration creates buyers only. Supplier and runner accounts are
  verified by staff before they can trade.
- **A sourcing quote is the runner's figure, not the platform's.** Nothing may
  display an estimated price on a request a runner has not yet priced, and a
  buyer may not move their own request to QUOTED. The whole reason the flow is
  worth trusting is that the number came from someone who looked at the goods.
- **AfriDeal is not a payment provider, and the footer says so on every page.**
  Payments are processed by licensed partners and the platform holds no funds on
  anyone's behalf. That sentence is a legal position; it may be relocated but not
  softened or removed.

**Stack:** Next.js 14 App Router, TypeScript, Tailwind, framer-motion,
next-auth, Zustand. JSON files under `data/` as the store. No database.

## Brand Commitments

- Name **AfriDeal**; wordmark and map-pin mark in `components/brand/` and
  `public/afrideal-mark.svg`.
- Established palette: ink near-black, AfriDeal gold, forest green.
- Money is always mono, tabular, two decimals, `BWP` prefixed.
- Voice: plain, concrete, unhyped. States what happens and why. No exclamation
  marks, no growth-marketing register.

## Evidence on Hand

- 17 real products, 6 of them hair lines, with photography fetched from Pexels
  into `public/unsplash/assets/`, provenance per file in `CREDITS.json`. The hair
  photography is stock standing in for the client's own product shots and should
  not ship as-is.
- 5 verified suppliers, 8 seeded accounts, 15 orders across every status,
  supplier payables, disputes, settlements, runners and shipments.
- Live tier bands for every product in `data/customer-prices.json`.
- `npm run verify` (104 checks) and `npm run audit` (41 routes) both pass.

**Must not be fabricated:** supplier counts, product counts, GMV, delivery
times, testimonials, press, or ratings beyond what `data/` actually holds. The
reference mockups carry figures - "Millions of Products", "10,000+ Products",
"100+ Verified Suppliers", "1,250+ products" - that the live catalogue does not
support. Real numbers today are 12 products and 5 verified suppliers.

## Product Principles

1. **Show the ladder, not just the price.** A buyer should be able to see what
   the next rung costs before deciding how much to take. Hiding it turns a
   published advantage back into a sales conversation.
2. **Quantity is the lever the buyer controls.** It is the only thing that moves
   the price, and moving up a rung must feel available rather than like a
   separate wholesale channel to apply to.
3. **Confidentiality is structural, not editorial.** Never imply per-supplier
   price comparison the platform does not offer.
4. **Claims must be answerable from `data/`.** If a number cannot be computed
   from the store, it does not go on the page.
5. **The platform is answerable, and says so as a merchant would.** The saving
   means nothing if the goods never arrive, so buyer protection travels with the
   price - but stated as what AfriDeal will do about a bad order, never as money
   held on someone's behalf. Nothing on any surface may describe the platform as
   holding, escrowing or releasing a customer's funds.

## Accessibility & Inclusion

No formal standard was set for this build. Established expectations: full
keyboard reachability, visible focus, honest labels on icon-only controls, and
motion that respects `prefers-reduced-motion` - the storefront already regressed
once on that last point and it is treated as a defect, not a nicety.
