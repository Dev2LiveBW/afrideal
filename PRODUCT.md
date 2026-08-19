# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary — the buyer on the storefront.** One person buying across a wide range
of need and quantity, in Botswana and increasingly South Africa:

- a household shopper taking one or four units of a consumable;
- a small trader or salon owner restocking five to fifty units;
- a business, reseller, school or clinic buying fifty units or more.

The important fact is that these are not three separate audiences with three
separate products. They are the same catalogue, and the same buyer moves
between them — a salon owner buys one blender for the shop and forty bottles of
treatment for the shelf. What changes is the quantity, and the price per unit
changes with it.

**Secondary, each with their own portal:** verified suppliers managing offers
and fulfilment; runners carrying the last mile; and platform staff split across
operations, finance and super-admin.

## Product Purpose

An escrow-backed marketplace connecting verified suppliers in Botswana and South
Africa with buyers who need the goods to actually arrive. Payment is held by
AfriDeal until the buyer confirms delivery. Suppliers are verified before they
can list, and an order routes to whichever verified supplier is most likely to
deliver it, not to whichever is cheapest.

Success is a buyer who understands, before they commit, exactly what they will
pay at the quantity they need — and gets the goods.

## Positioning

**The price ladder is the mechanism.** A product on AfriDeal does not have "a
price"; it has a ladder of published bands, and which rung a buyer stands on is
decided by how many units they take and what kind of account they hold. The
ladder is published rather than negotiated, so a buyer can see the whole thing
before committing and can decide to move up a rung.

This is what a neighbouring marketplace cannot truthfully copy: most show one
retail price and hide wholesale behind a sales conversation. Confirmed, live in
`data/customer-prices.json`, and computed by `lib/pricing-tiers.ts`.

Worked example, Shea Butter Deep Treatment (p001), RETAIL account:

| Quantity | Tier | Unit price |
|---|---|---|
| 1–4 | Retail | BWP 182 |
| 5–19 | Bulk | BWP 161 |
| 20–99 | Bulk | BWP 157 |

Business, Reseller and Institutional accounts stand on lower rungs of the same
ladder (down to BWP 139 at reseller wholesale). Above the published ladder, a
buyer asks for a quotation (RFQ) instead of being quoted automatically.

## Operating Context

- Currency is BWP throughout, formatted to two decimals always.
- Suppliers sit in Botswana (Gaborone and elsewhere) and South Africa, so
  cross-border fulfilment and its lead times are ordinary, not exceptional.
- Buyers arrive on a wide spread of devices and connection quality; mobile is
  the common case, not the adaptation.
- Categories in the live catalogue: Hair & Beauty, Electronics, Building
  Materials, Food & Agriculture, Office Supplies, Clothing.
- The demo is driven live in front of a room, so every screen reads real data
  and every state-changing action writes back to disk.

## Capabilities and Constraints

**Confirmed and live:**

- Published tier ladder per product, resolved on (customer_type, quantity).
- Escrow: funds held from checkout until the buyer confirms delivery, with
  dispute handling.
- Supplier verification, reliability scoring, and reliability-based routing.
- RFQ / quotation flow for quantities above the published ladder.
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
- Customer type comes from the account, resolved server-side — never chosen in
  the browser, or any visitor could quote themselves wholesale via localStorage.
- Margin floors (§19) must hold; a tier band can never price below them.
- Self-registration creates buyers only. Supplier and runner accounts are
  verified by staff before they can trade.

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

- 12 real products with photography fetched from Pexels into `public/products/`,
  provenance per file in `CREDITS.json`.
- 5 verified suppliers, 8 seeded accounts, 15 orders across every status,
  escrow records, disputes, settlements, runners and shipments.
- Live tier bands for every product in `data/customer-prices.json`.
- `npm run verify` (86 checks) and `npm run audit` (37 routes) both pass.

**Must not be fabricated:** supplier counts, product counts, GMV, delivery
times, testimonials, press, or ratings beyond what `data/` actually holds. The
reference mockups carry figures — "Millions of Products", "10,000+ Products",
"100+ Verified Suppliers", "1,250+ products" — that the live catalogue does not
support. Real numbers today are 12 products and 5 verified suppliers.

## Product Principles

1. **Show the ladder, not just the price.** A buyer should be able to see what
   the next rung costs before deciding how much to take. Hiding it turns a
   published advantage back into a sales conversation.
2. **Quantity is the lever the buyer controls.** Design should make moving up a
   rung feel available, not like a separate wholesale channel they must apply to.
3. **Confidentiality is structural, not editorial.** Never imply per-supplier
   price comparison the platform does not offer.
4. **Claims must be answerable from `data/`.** If a number cannot be computed
   from the store, it does not go on the page.
5. **Escrow is the reason to trust the price.** The saving means nothing if the
   goods never arrive; the two arguments belong together.

## Accessibility & Inclusion

No formal standard was set for this build. Established expectations: full
keyboard reachability, visible focus, honest labels on icon-only controls, and
motion that respects `prefers-reduced-motion` — the storefront already regressed
once on that last point and it is treated as a defect, not a nicety.
