# AfriDeal

Africa's Marketplace. Your Way.

An escrow-backed marketplace connecting verified suppliers in Botswana and South Africa with buyers who need the goods to actually arrive. Four portals over one data store: an operations console, a supplier workspace, a runner app, and a customer storefront.

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
| `npm run audit` | Loads all 37 routes as the right role and checks each renders |
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

Passwords sit in plain text in `data/users.json`. That is deliberate for a demo whose main feature is switching roles in one click, and it is the first thing to change before this touches a real user. Hash on write, compare with a constant-time check in `lib/auth.ts`.

## What each role can reach

Enforced twice: in `middleware.ts` on the Edge runtime for page navigation, and again in each API route through `guard()` in `lib/api.ts`. A role that gets past one still fails the other.

| Role | Reach |
|---|---|
| Super Admin | Everything |
| Operations | All of `/admin` except settings, finance, and settlements |
| Finance | `/admin/analytics`, `/admin/escrow`, `/admin/settlements` |
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

Regenerating the seed runs integrity checks and exits non-zero if any fail: every product priced above its highest supplier cost, every order subtotal equal to the sum of its own line items, exactly one escrow record per supplier order, and the status and supplier mixes the brief specifies.

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
markup    = supplier_cost × (markup_value ÷ 100)   or a flat amount
gateway   = supplier_cost × 2.5%
price     = ceil(supplier_cost + markup + logistics + gateway)
```

Rules are data, not code. They live in `data/pricing-rules.json` and `data/margin-rules.json` and are editable from `/admin/pricing`, so changing the Hair and Beauty markup changes every recommended price on the next read with no redeploy. Seeded markups: Hair and Beauty 80%, Electronics 12%, Building Materials 35%, Food and Agriculture 42%, Office Supplies 40%, Clothing 58%.

**Markup and margin are not the same number** and the code keeps them apart. Markup is measured against cost, margin against selling price:

```
markup 30% on a BWP 250 cost  →  BWP 325.00
margin 30% on a BWP 250 cost  →  BWP 357.14
```

`applyMargin()` supports all six methods: percentage markup, percentage margin, fixed margin, fixed fee, hybrid, and commission. `marginBreakdown()` reports `markup_pct` and `gross_margin_pct` as separate fields so a report cannot quietly print one under the other's label.

## Pricing is tiered, not universal

A product does not have one price. It has a ladder of bands in `data/customer-prices.json`, resolved by who is buying and how many, and the same resolution runs on the product page and at checkout so the two cannot disagree.

Shea Butter Deep Treatment, as a verified business account:

| Quantity | Tier | Unit price |
|---|---|---|
| 1–4 | Retail | BWP 182.00 |
| 5–19 | Bulk | BWP 161.00 |
| 20–49 | Wholesale | BWP 149.00 |
| 50–99 | Wholesale | BWP 142.00 |
| 100+ | By quotation | RFQ |

The same product as a retail consumer tops out at the bulk band: they can still buy 20 units, they simply do not reach the wholesale rate a registered business gets at the same quantity.

Customer type is a property of the account (`RETAIL`, `BUSINESS`, `RESELLER`, `INSTITUTIONAL`, `GUEST`) and is resolved from the session on the server. It is deliberately not held in client state, because a tier a visitor can set in localStorage is a wholesale price anyone can award themselves. Sign in as Thabo for retail and Kefilwe for business to see the same product priced two ways.

Bands are generated from the margin rules rather than typed in, so every rung is a real margin calculation. Reseeding checks that no band falls below its tier's floor and that prices never rise as quantity increases.

### Supplier costs are confidential

What a supplier privately quotes AfriDeal never reaches the storefront. `toPublicOffers()` in `lib/queries.ts` projects ranked offers down to a `PublicOffer` that has no cost field at all, and that projection is what storefront pages pass to the browser.

That is enforced by the type rather than by remembering not to render it. A React server component serialises whatever it hands a client component into the page payload, so passing a raw offer down would publish the cost in the HTML even if nothing displayed it. `npm run verify` asserts the string `supplier_cost` never appears in a storefront response.

Transparent procurement mode stays a commercial decision AfriDeal makes per supplier agreement. It is not a control a shopper can toggle.

### Quotations

Quantities past the top band go to an RFQ instead of a guessed price. A request invites every verified supplier carrying that product, each quotes privately, and operations compares and selects. The buyer sees that quotes exist and the best lead time, never each supplier's number; a supplier sees only their own.

### Escrow (`lib/escrow.ts`)

```
HELD ──▶ RELEASED     supplier paid out
     ──▶ REFUNDED     customer made whole
     ──▶ DISPUTED     claim raised, funds frozen

DISPUTED ──▶ RELEASED   resolved for the supplier
         ──▶ REFUNDED   resolved for the customer
```

RELEASED and REFUNDED are terminal. An illegal transition throws rather than silently doing nothing, and the API turns that into a 409 with a message naming what was allowed. Money that has left the account does not come back through this machine; that would be a new payment.

## Order splitting

Checkout is the one place several of these meet. `POST /api/orders` does five things:

1. Resolves each cart line against the catalogue, reading the price server side. A tampered cart cannot set its own price.
2. Routes each line to a supplier using the composite score.
3. Writes one customer-facing `Order`.
4. Writes one `SupplierOrder` per distinct supplier.
5. Writes one `Escrow` record per supplier order, all `HELD`.

A cart with shea butter and cement produces one order for the customer, two supplier orders, and two escrow records. The customer sees one delivery and one total. Each supplier sees only their own leg.

## Analytics and the APR report

Two GMV figures are reported and they mean different things, so both are labelled rather than merged into one larger-looking number. `period_gmv` is orders placed on the platform inside the window. `lifetime_gmv` is cumulative trading across all verified suppliers.

The revenue share is 5% of qualifying revenue. Exclusions are itemised with a stated reason for each, because the figure has to survive being read line by line: refunded escrow never became revenue, disputed and unsettled amounts have an unknown outcome, cancelled orders moved no goods, and delivery fees pass through to logistics at cost.

## Verification

```bash
npm run dev      # one terminal
npm run verify   # another
```

`scripts/verify.mjs` signs in over the real NextAuth flow and drives the HTTP API, so it exercises the actual engines rather than a copy of their rules. 86 checks across 15 sections:

- all eight logins land on the right role, and bad credentials are rejected
- pricing arithmetic, and no product sells below its highest supplier cost
- composite ranking, including that the cheapest offer does not win
- an illegal escrow transition is refused with a 409
- supplier isolation in both directions, plus role guards on four endpoints
- a full checkout with its supplier split and escrow legs balancing to the subtotal
- the tier ladder: prices fall as quantity rises, a retail account cannot reach wholesale, and 100+ is routed to a quotation
- `supplier_cost` never appears in a storefront response, while the admin API still returns it
- the RFQ round trip, including that one supplier cannot read a competitor's quote
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

`../DESIGN.md` governs typography, money formatting, and the split between the two modes.

The storefront's page structure comes from the Stitch mockups in `../stitch_africart_customer_portal_mvp/`: category tiles, a live-deals rail, supplier discovery, new-arrivals carousel, and on the product page a breadcrumb, thumbnail rail, delivery-estimate card, seller card, Description/Specifications/Reviews tabs and frequently-bought-together. Order tracking takes its account sidebar, icon stepper and runner contact card from the same set.

The structure was adopted; the AfriCart visual identity was not. Those mockups run terracotta and teal on warm off-white in DM Sans and Inter, which would reverse the palette decision above and reinstate a font `DESIGN.md` bans. The layouts carry over onto AfriDeal's own tokens instead.

The discounts on the deals rail are real `PROMOTIONAL` price bands with real expiry dates, not percentages invented at render time.

## Photography

55 photographs live in `public/products`, fetched from Pexels and vendored locally so nothing is requested from a third party at runtime. `npm run images` refetches them; it needs `PEXELS_API_KEY` in `.env.local`.

Every one was looked at before it shipped, which is the part that matters. The failure mode is not a broken image, it is a plausible wrong one, and the first pass produced several:

- queries written from product names returned nothing useful, so they are written for what the picture must **show** instead: "shea butter jar cosmetic", not "Shea Butter Deep Treatment 500ml"
- unanchored people shots came back culturally wrong for a Botswana marketplace. The uniform query returned East Asian schoolchildren; the braiding-hair query returned a white model with pink cornrows. Adding "african" to those queries fixed both, and is why the agriculture category shows a real West African grain market
- the earbud query returned Apple AirPods twice, once with the logo reflected in the surface. Selling a generic earbud on a competitor's branded product is a trademark problem, not a taste one, so that query now excludes it

Provenance for every file is in `public/products/CREDITS.json`. `npm run images -- --only p004` refetches a single product when one turns out wrong.

Images render through `components/storefront/Swatch.tsx`, which falls back to the gradient stand-in for any product without a photo. A partial fetch degrades instead of leaving holes.

For a real deployment this is still placeholder work: on a live marketplace, product photography is supplier-supplied at listing time.

## Motion

Motion follows the same two-mode split as the layout.

Marketplace pages get a 340ms fade and rise on navigation, scroll reveals, a slow push-in on photography under hover, a travelling underline between product tabs, and a single element that drifts continuously: the hero escrow receipt, 6px over nine seconds. One object moves, not several, because a page where everything breathes reads as unstable.

Console pages get opacity only, at 160ms, and no entrances at all. An operator moving between escrow and disputes twenty times an hour wants confirmation that the page changed, not travel.

Everything animates on `transform` and `opacity` so it stays on the compositor. `prefers-reduced-motion` collapses the durations in `globals.css`, and the continuous drift checks it directly and stops rather than shortening.

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

One conflict in the brief is worth flagging rather than burying. Electronics carries a 12% markup and the default retail margin floor is 20%. Those cannot both hold: 12% over cost cannot yield a 20% margin on the selling price once logistics and gateway costs come out. Margin floors are therefore per category, and Electronics runs at 10/8/6/4. Left unresolved, every Electronics band would sit permanently under its floor and the §19 alert queue would be noise an operator learns to ignore.
#   a f r i d e a l  
 