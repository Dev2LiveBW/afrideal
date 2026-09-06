# AfriDeal

Africa's Marketplace. Your Way.

A procurement marketplace connecting verified suppliers in Botswana and South Africa with buyers who need the goods to actually arrive. AfriDeal buys from the supplier and resells to the customer at a published markup, so every product carries a price at one unit and a price at fifty, visible before anyone commits. Four portals over one data store: an operations console, a supplier workspace, a runner app, and a customer storefront.

This is a working MVP, not a clickable prototype. Every screen reads real data, and the actions that change something write it back to disk.

## Setup

```bash
cd afrideal
npm install
npm run dev
```

Open http://localhost:3000.

Node 18.17 or later. No database, no external services, no API keys. The whole platform runs off JSON files in `data/`.

| Command | What it does |
|---|---|
| `npm run dev` | Development server on port 3000 |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run seed` | Regenerate every file in `data/` and re-run the integrity checks |
| `npm run verify` | End-to-end checks against a running dev server |
| `npm run audit` | Loads all 41 routes as the right role and checks each renders |
| `npm run images` | Refetch product photography (needs `PEXELS_API_KEY`) |

`npm run seed` resets a demo that has been clicked through. Run it whenever you want a clean starting state.

## Logins

Eight seeded accounts. The login page has a one-click card for each of them, so nobody has to type these during a demo.

| Email | Password | Role | Lands on |
|---|---|---|---|
| admin@afrideal.co.bw | `Admin@2026` | Super Admin | `/admin/dashboard` |
| ops@afrideal.co.bw | `Ops@2026` | Operations | `/admin/dashboard` |
| finance@afrideal.co.bw | `Finance@2026` | Finance | `/admin/analytics` |
| supplier@naledi.co.bw | `Supplier@2026` | Supplier (Naledi Beauty) | `/supplier/dashboard` |
| supplier@glowup.co.za | `Supplier@2026` | Supplier (GlowUp) | `/supplier/dashboard` |
| runner@afrideal.co.bw | `Runner@2026` | Runner | `/runner/dashboard` |
| thabo@gmail.com | `Customer@2026` | Customer | `/` |
| kefilwe@gmail.com | `Customer@2026` | Customer | `/` |

Buyers can also open their own account at `/signup`. Registration is deliberately narrow: it creates a `CUSTOMER` on the `RETAIL` tier and nothing else. Supplier and runner accounts carry consequences a form should not be able to grant - a supplier can be routed real orders, a runner can mark a delivery complete - so those stay behind admin creation and verification. The duplicate-email check and the insert share one `mutate` pass, so two simultaneous signups cannot both find an address free.

Passwords sit in plain text in `data/users.json`. That is deliberate for a demo whose main feature is switching roles in one click, and it is the first thing to change before this touches a real user. Hash on write, compare with a constant-time check in `lib/auth.ts` - and in `app/api/auth/register/route.ts`, which writes them. The two changes are the same edit and belong together.

## What each role can reach

Enforced twice: in `middleware.ts` on the Edge runtime for page navigation, and again in each API route through `guard()` in `lib/api.ts`. A role that gets past one still fails the other.

| Role | Reach |
|---|---|
| Super Admin | Everything |
| Operations | All of `/admin` except settings, finance, and settlements |
| Finance | `/admin/analytics`, `/admin/payables`, `/admin/settlements` |
| Supplier | `/supplier/*`, scoped to their own supplier ID |
| Runner | `/runner/*` |
| Customer | Storefront, cart, checkout, and their own orders |
| Signed out | Landing page, browse, product pages, login |

Supplier isolation is the one worth checking. A supplier reading `/api/orders` gets only orders they have a leg on, and opening a split order returns their leg alone. `npm run verify` tests this directly.

## Tech

Next.js 14 (App Router), React 18, TypeScript in strict mode, Tailwind 3.4, NextAuth 4 with a credentials provider, Zustand for the cart, Framer Motion, Recharts, Lucide icons, React Hook Form with Zod.

Two notes on version choices. NextAuth is pinned to 4.x because 5.x is still beta and its docs describe an API that the stable release does not have. Tailwind is pinned to 3.4 rather than 4.x because 4 changes configuration to a CSS-first model, and there was nothing to gain here by taking that on.

Pages are server components that read `lib/db` directly. Only mutations go through HTTP. That avoids a fetch waterfall on every screen and means a write is visible on the next render without cache juggling.

## How the data store works

`lib/db.ts` wraps 17 JSON files with typed read and write helpers. Reads are uncached so a write from one request is visible to the next.

Writes go through `mutate()`, which serialises them per collection. Node is single threaded, but an `await` inside a read-modify-write is a yield point, so two concurrent POSTs to the same file can interleave and lose an update. Every write in the app takes that lock, and writes land on a temp file that is then renamed, so a crash mid-write cannot leave a half-written JSON file.

Regenerating the seed runs integrity checks and exits non-zero if any fail: every product priced above its highest supplier cost, every order subtotal equal to the sum of its own line items, exactly one supplier invoice per supplier order, and the status and supplier mixes the brief specifies.

## The three engines

### Supplier selection (`lib/supplier-selection.ts`)

The platform does not route to the cheapest offer. It routes to the offer most likely to arrive.

```
score = reliability × 0.35
      + 20 if in stock, else 0
      + (100 − fulfilment_days × 5) × 0.25
      + rating × 4 × 0.20
      + (1000 ÷ supplier_cost) × 0.20
```

Suspended and unverified suppliers are excluded outright. Out-of-stock offers stay in the ranking on purpose, because operations needs to see who could supply if stock returns, and the missing 20-point bonus already pushes them below anyone who can ship today.

Product 1 shows the point of this. GlowUp quotes BWP 76 against Naledi's BWP 82, and still loses, because Naledi holds more stock, ships in two days instead of four, and scores 92 on reliability against 86. The admin product page shows the score broken into its five parts next to a sentence explaining the choice, because an operator eventually has to defend that decision to the supplier who was skipped.

### Pricing (`lib/pricing-engine.ts`, `lib/pricing-tiers.ts`)

```
price   = ceil(supplier_cost × (1 + markup))
margin  = price − supplier_cost − logistics − gateway fee
```

The markup applies to the supplier cost and to nothing else. Delivery is quoted separately at checkout against the real address rather than smeared across every unit, and the payment provider's fee is a cost AfriDeal carries out of its own margin rather than a surcharge bolted onto the shelf price. Folding both into the unit price is what the earlier model did, and it punished the cheapest lines hardest: a flat BWP 15 logistics contribution is nothing on a BWP 700 wig and is a quarter of the margin on a BWP 90 pack of braiding hair.

The ladder lives in `lib/pricing-model.ts` and is one rule for the whole catalogue:

| Quantity | Tier | Price |
|---|---|---|
| 1–4 | Retail | supplier cost + 60% |
| 5–99 | Bulk | supplier cost + 44% |
| 100+ | Wholesale | by quotation |

On a supplier cost of BWP 200 that is BWP 320 at retail, BWP 288 in bulk, and a written quotation above ninety-nine units. Per-category overrides still live in `data/pricing-rules.json` and are editable from `/admin/pricing`, so a category that cannot carry 60% can be tuned without a redeploy; the seeded default is the platform figure across the board.

**Markup and margin are not the same number** and the code keeps them apart. Markup is measured against cost, margin against selling price:

```
markup 30% on a BWP 250 cost  →  BWP 325.00
margin 30% on a BWP 250 cost  →  BWP 357.14
```

`applyMargin()` supports all six methods: percentage markup, percentage margin, fixed margin, fixed fee, hybrid, and commission. `marginBreakdown()` reports `markup_pct` and `gross_margin_pct` as separate fields so a report cannot quietly print one under the other's label.

## Pricing is tiered, not universal

A product does not have one price. It has a ladder of bands in `data/customer-prices.json`, resolved by how many units are being taken, and one resolution path runs on every surface - landing, browse, product, cart and checkout - so no two can disagree about the same quantity.

This is also the storefront's argument, not just an implementation detail. The landing page opens on one real product at its real rungs, and `/browse?tier=BULK` reprices the whole catalogue at that rung.

HD Lace Frontal 13×4, against a supplier cost of BWP 715:

| Quantity | Tier | Unit price |
|---|---|---|
| 1–4 | Retail | BWP 1,144.00 |
| 5–99 | Bulk | BWP 1,030.00 |
| 100+ | By quotation | RFQ |

**The ladder is not gated by account type.** Everyone - a first-time visitor with no account, a salon owner, a school procurement officer - is shown and charged the same published figure for the same quantity. An earlier version fanned the ladder out into eleven bands across five customer types, with wholesale rungs a shopper could see but not buy at, and that made the catalogue read as a price list you had to qualify for. A price a buyer has to apply for is not a price advantage they can act on, which is the one thing the storefront is there to claim.

Customer type is still a property of the account (`RETAIL`, `BUSINESS`, `RESELLER`, `INSTITUTIONAL`, `GUEST`) and is still resolved from the session on the server, never from client state. What it governs now is the quotation path above the ladder, where a business or institutional buyer is answered by a person rather than by a price list.

Bands are generated from the pricing model rather than typed in, so every rung is a real calculation. Reseeding checks that no band falls below its tier's margin floor and that prices never rise as quantity increases.

### Supplier costs are confidential

What a supplier privately quotes AfriDeal never reaches the storefront. `toPublicOffers()` in `lib/queries.ts` projects ranked offers down to a `PublicOffer` that has no cost field at all, and that projection is what storefront pages pass to the browser.

That is enforced by the type rather than by remembering not to render it. A React server component serialises whatever it hands a client component into the page payload, so passing a raw offer down would publish the cost in the HTML even if nothing displayed it. `npm run verify` asserts the string `supplier_cost` never appears in a storefront response.

Transparent procurement mode stays a commercial decision AfriDeal makes per supplier agreement. It is not a control a shopper can toggle.

### Quotations

Quantities past the top band go to an RFQ instead of a guessed price. A request invites every verified supplier carrying that product, each quotes privately, and operations compares and selects. The buyer sees that quotes exist and the best lead time, never each supplier's number; a supplier sees only their own.

### Runner sourcing (`lib/runner-requests.ts`)

The second way onto the platform. A buyer describes something the catalogue does not carry; a verified runner takes it from a pool, finds it, reports the price and the condition, and buys it once the buyer approves.

```
REQUESTED  ──▶ ACCEPTED    a runner takes the job
ACCEPTED   ──▶ SOURCING    the runner is out looking
SOURCING   ──▶ QUOTED      found it; price and condition sent back
QUOTED     ──▶ APPROVED    the buyer agrees to the price
APPROVED   ──▶ DELIVERING  bought, and on its way
DELIVERING ──▶ CONFIRMED   the buyer has it
```

Every state before CONFIRMED can be cancelled, which is what makes it reasonable to ask in the first place: the buyer has committed to nothing until they approve a figure.

The move split is enforced per role and is the point of the whole flow. A runner can say what something costs but cannot agree to it on the buyer's behalf; a buyer can approve a price but cannot declare the goods were found. `npm run verify` asserts both directions, including that a request with no quote cannot be approved and that a confirmed request cannot be reopened. The runner's fee is 12% of the goods, applied on top and shown to both sides before either commits.

This is deliberately not an `Rfq`. An RFQ prices a catalogue product at a volume above the published ladder; a sourcing request has no `product_id` at all, because the whole point is that the thing is not in the catalogue.

### Supplier payables (`lib/payables.ts`)

AfriDeal is the merchant of record. The customer buys from AfriDeal and pays AfriDeal through a licensed payment provider; AfriDeal buys the goods from the supplier and owes that supplier an invoice. This ledger tracks those invoices - it is accounts payable, not money held on anyone else's behalf, which is the distinction that keeps the platform out of scope for a Bank of Botswana escrow licence.

```
PENDING ──▶ SETTLED     supplier invoice paid
        ──▶ CANCELLED   the leg did not ship, so nothing is owed
        ──▶ ON_HOLD     customer raised a claim, settlement pauses

ON_HOLD ──▶ SETTLED     resolved for the supplier
        ──▶ CANCELLED   resolved for the customer
```

SETTLED and CANCELLED are terminal. An illegal transition throws rather than silently doing nothing, and the API turns that into a 409 with a message naming what was allowed. An invoice that has been paid is not unpaid by a later event; that would be a credit note, which is a new document rather than a transition on this one.

## Order splitting

Checkout is the one place several of these meet. `POST /api/orders` does five things:

1. Resolves each cart line against the catalogue, reading the price server side. A tampered cart cannot set its own price.
2. Routes each line to a supplier using the composite score.
3. Writes one customer-facing `Order`.
4. Writes one `SupplierOrder` per distinct supplier.
5. Raises one `SupplierPayable` per supplier order, all `PENDING`.

A cart with a hair bundle and a bag of cement produces one order for the customer, two supplier orders, and two supplier invoices. The customer sees one delivery and one total. Each supplier sees only their own leg.

## Analytics and the APR report

Two GMV figures are reported and they mean different things, so both are labelled rather than merged into one larger-looking number. `period_gmv` is orders placed on the platform inside the window. `lifetime_gmv` is cumulative trading across all verified suppliers.

The revenue share is 5% of qualifying revenue. Exclusions are itemised with a stated reason for each, because the figure has to survive being read line by line: cancelled supplier invoices never became revenue, claims under review have an unknown outcome, cancelled orders moved no goods, and delivery fees pass through to logistics at cost.

## Verification

```bash
npm run dev      # one terminal
npm run verify   # another
```

`scripts/verify.mjs` signs in over the real NextAuth flow and drives the HTTP API, so it exercises the actual engines rather than a copy of their rules. 104 checks across 16 sections:

- all eight logins land on the right role, and bad credentials are rejected
- pricing arithmetic, and no product sells below its highest supplier cost
- composite ranking, including that the cheapest offer does not win
- an illegal supplier-payable transition is refused with a 409
- supplier isolation in both directions, plus role guards on four endpoints
- a full checkout with its supplier split and its invoices balancing to the subtotal
- the price ladder: the bulk rung sits 10% under retail, every account type is quoted the same published figure, and 100+ is routed to a quotation
- `supplier_cost` never appears in a storefront response, while the admin API still returns it
- the RFQ round trip, including that one supplier cannot read a competitor's quote
- the sourcing flow end to end, including that a buyer cannot quote their own request, a runner cannot be paid for a price nobody approved, and another account cannot work a job that is already taken
- runner availability, supplier approval, and the APR revenue-share arithmetic

It exits non-zero on any failure and prints what broke.

Run `npm run seed` afterwards. The suite places real orders and RFQs, which is the point, but it leaves the demo data further along than a fresh clone.

Do not run `npm run build` while `npm run dev` is running. Both write to `.next`, and the dev server ends up serving a half-overwritten bundle that fails with `Cannot find module './1682.js'`. If that happens, stop both, delete `.next`, and start again.

## Layout

```
afrideal/
├── app/
│   ├── (auth)/login/         login and the quick-login cards
│   ├── (admin)/admin/        operations console
│   ├── (supplier)/supplier/  supplier workspace
│   ├── (runner)/runner/      runner app, mobile first
│   ├── (store)/              storefront, at / and below
│   └── api/                  route handlers, mutations only
├── components/
│   ├── brand/                logo, badges, buttons, money, panels
│   ├── procurement/          tier ladder, supplier comparison, RFQ, margin alerts
│   ├── products/  orders/  charts/  layout/  supplier/
├── data/                     24 JSON collections
├── lib/                      db, auth, api, queries, the engines, format
├── scripts/                  seed.mjs, verify.mjs
├── store/                    Zustand cart
└── types/                    the domain model
```

Route groups in parentheses do not appear in URLs. They exist to give each portal its own layout and guard.

## Design

`DESIGN.md` at the repo root governs typography, money formatting, and the split between the two modes, and `PRODUCT.md` records the product truth beneath it - who buys here, what may be claimed, and what the pricing model actually guarantees. Both sit at the root; earlier drafts referenced them one directory up.

The storefront was rebuilt around the price ladder. The client's direction was that buyers should understand their comparison advantage; the mockups expressed that as comparing suppliers on price, which this platform cannot honestly show - supplier quotes are confidential under §5/§23, enforced by the `PublicOffer` type and by three checks in `npm run verify`. The ladder was the comparison that was real and unused, so the landing page now opens on one product at three published prices and the rungs are the way into the catalogue.

What survives from the Stitch mockups in `../stitch_africart_customer_portal_mvp/` is the catalogue furniture: category tiles, a live-deals rail, a new-arrivals carousel, and on the product page a breadcrumb, thumbnail rail, delivery-estimate card, seller card, Description/Specifications/Reviews tabs and frequently-bought-together. Order tracking takes its account sidebar, icon stepper and runner contact card from the same set. The supplier-discovery rail and the standalone tier explainer were dropped: the ladder says what the explainer said, with real figures.

The structure was adopted; the AfriCart visual identity was not. Those mockups run terracotta and teal on warm off-white in DM Sans and Inter, which would reverse the palette decision above and reinstate a font `DESIGN.md` bans. The layouts carry over onto AfriDeal's own tokens instead.

The discounts on the deals rail are real `PROMOTIONAL` price bands with real expiry dates, not percentages invented at render time.

## Photography

55 photographs live in `public/products`, fetched from Pexels and vendored locally so nothing is requested from a third party at runtime. `npm run images` refetches them; it needs `PEXELS_API_KEY` in `.env.local`.

`npm run seed` and `npm run images` are safe to run in either order, any number of times. They were not always: the seed rewrote `product-images.json` with gradient swatches unconditionally, so every reseed silently reverted the catalogue to placeholders while the downloaded files sat on disk unreferenced. The seed now reads `public/products` and points each row at the real file when one exists.

Every one was looked at before it shipped, which is the part that matters. The failure mode is not a broken image, it is a plausible wrong one, and the first pass produced several:

- queries written from product names returned nothing useful, so they are written for what the picture must **show** instead: "shea butter jar cosmetic", not "Shea Butter Deep Treatment 500ml"
- unanchored people shots came back culturally wrong for a Botswana marketplace. The uniform query returned East Asian schoolchildren; the braiding-hair query returned a white model with pink cornrows; the first pass at the lace-frontal listing returned a platinum wig on an East Asian model and the bob wig returned a white model on a red curtain. Adding "african" or "black woman" to those queries fixed all of them, and is why the agriculture category shows a real West African grain market
- `npm run images -- --only p014,p016` takes a list, and merges into `CREDITS.json` rather than overwriting it. An earlier partial run truncated the provenance of every file it did not touch, which is the kind of bug you only find when someone asks where a picture came from
- **the hair photography is stock, and should not ship.** These are the flagship SKUs and the pictures are of somebody else's hair. They are placeholders for the client's own product shots, not a substitute for them
- the earbud query returned Apple AirPods twice, once with the logo reflected in the surface. Selling a generic earbud on a competitor's branded product is a trademark problem, not a taste one, so that query now excludes it

Provenance for every file is in `public/unsplash/assets/CREDITS.json`. `npm run images -- --only p004` refetches a single product when one turns out wrong.

Images render through `components/storefront/Swatch.tsx`, which falls back to the gradient stand-in for any product without a photo. A partial fetch degrades instead of leaving holes.

For a real deployment this is still placeholder work: on a live marketplace, product photography is supplier-supplied at listing time.

## Motion

Motion follows the same two-mode split as the layout.

Marketplace pages get a 340ms fade and rise on navigation, scroll reveals, a slow push-in on photography under hover, a travelling underline between product tabs, and a single element that drifts continuously: the hero price ladder, 6px over nine seconds. One object moves, not several, because a page where everything breathes reads as unstable.

Console pages get opacity only, at 160ms, and no entrances at all. An operator moving between payables and disputes twenty times an hour wants confirmation that the page changed, not travel.

Everything animates on `transform` and `opacity` so it stays on the compositor. `prefers-reduced-motion` collapses the durations in `globals.css`, and the continuous drift checks it directly and stops.

What it must not do is change the markup. `Float` used to return a bare `<div>` under reduced motion where the animated branch rendered two nested ones, and because the server cannot know the preference it always sent the pair - so every visitor with reduced motion turned on hydrated against the wrong shape and React threw the page away and re-rendered it on the client. The element tree is now identical in both branches and only the durations differ.

The palette follows the build brief: black metallic ground, Amber Gold as the primary action colour, Forest Green demoted to verified and released states. Amber means one thing, money in motion but not yet settled, and it is never used for decoration.

Marketplace mode covers the storefront, where the design is allowed to be expressive, image led, and generous with space. Console mode covers `/admin`, `/supplier`, and `/runner`, where it is deliberately tighter and quieter. A dispute officer with an SLA clock running should find the resolve button in the same place on every dispute they open. Asymmetry there is a defect, not a flourish.

Satoshi carries display and headline, Geist carries body and UI, and Geist Mono carries every number that means something, with tabular figures on so columns of Pula align on the decimal. Currency always renders as `BWP 12,450.00`, two decimals even on round numbers. Inter is not used anywhere, including as a fallback.

Satoshi loads from Fontshare over the network. Geist is bundled through its npm package and takes over if Fontshare is unreachable, so the page never falls back to a system sans.

## Known limits

Worth saying out loud before a demo.

Passwords are plain text, as described above. Payment gateways are represented but not integrated, so no money moves.

Product photography is stock, not the actual goods. It is accurate to the product type and legally clear for commercial use, but a live marketplace takes its images from suppliers at listing time. Treat `public/products` as scaffolding.

Supplier self-service listing management is out of scope by design: Phase 1 is AfriDeal-managed listings, so suppliers can quote, confirm and fulfil, but products and offers are created by admins. The supplier "add product" flow submits for approval and says so.

Product matching on barcode or GTIN is modelled but not implemented, because nothing in this build ingests a supplier catalogue yet. The `brands` table and the one-product-many-offers shape are the parts that had to exist now so that adding it later is not a migration.

The JSON store is single writer and fine for a demo or a pilot. A real deployment moves `lib/db.ts` behind Firestore or Postgres, which is why every read and write already goes through it rather than touching `fs` directly.

One consequence of the flat ladder is worth flagging rather than burying. A single 60% markup across the catalogue is right for hair, which is what the platform sells, and is optimistic for consumer electronics, where thin margins are the normal condition of the trade rather than a fault. The ladder is deliberately the default and not the ceiling: `data/pricing-rules.json` still holds a rule per category, editable from `/admin/pricing`, so Electronics can be tuned down without touching code. Nothing enforces the platform figure once someone decides otherwise.

The margin floors that used to need a per-category carve-out no longer do. With delivery billed separately, realised margin stopped depending on how cheap the product is: 60% over cost clears about 35% of the selling price at any cost, and 44% clears about 28%. Both sit clear of their floors, so `FLOOR_OVERRIDES` in the seed is now empty rather than carrying an Electronics exception.
