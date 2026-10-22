# 0007. Landed pricing: rand supplier costs, customs at 14%, the owner's tier ladder

**Date**: 2026-10-20
**Market (2026-10-22)**: buyers are not only in Botswana. Read "buyers in
Botswana see pula" and "imported" through [spec 0009](0009-any-to-any-marketplace.md):
the ladders hold for every lane; conversion is from the supplier's currency to
the buyer's, and cross-border means goods' country ≠ delivery country.
**Amended**: 2026-10-21. **Customs is out of the product price**; see
[Amendment](#amendment-2026-10-21-customs-leaves-the-product-price). Where the
text below says 1.14, read 1.00.
**Status**: Partly built (2026-10-20). The formula and ladder are the product
owner's own developer table (2026-10-20 11:45). Still with her: which wigs are
premium and how premium treats wholesale (open question 1), and the temporary
1:1 rate (open question 2).

**Built so far** (uncommitted on `feat/order-payment-states`): the formula in
`lib/pricing-formula.mjs` shared by app and seed, with unit tests against every
cell of her table (AC-3, AC-4); rand costs and a cost per length on offers
(AC-1); per-length ladders; counting per seller within a category in the cart,
checkout and order route through one `priceLine()` (AC-5, AC-6); the order
snapshot (AC-7); customs in the margin breakdown and alerts (AC-8); the five
AfriDeal wigs (p018 to p022); a hair floor first on the home page. **Not yet
built:** the settings rows and admin editing of the ladder, rate and buffer;
the daily market-rate fetch (AC-2, the rate is the 1:1 constant `FX_RATES`);
customs in the admin pricing calculator; `price_position` for premium wigs;
the sales-VAT setting (AC-9); spec 0004's quote price on the new formula.

## Summary

Supplier prices arrive in **rand**, and imported goods carry the **14% customs
VAT** that AfriDeal pays at the border. The product owner's developer table
puts customs into the cost first, then marks up the landed cost:

```
landed = supplier cost × rate × 1.14          (imported; × 1.00 for Botswana goods)
price  = landed × (1 + markup) × (1 − multi-buy discount)
margin = price − landed − logistics − card fee
```

The ladder is retail +50% (with a 2 / 3 / 5% multi-buy discount for 2, 3 and
4+ pieces), then +33% for 5–10, +25% for 11–20 and +18% for 21–99, with 100+
by quotation. Units are counted per seller within one category. Courier stays
a separate checkout line. AfriDeal is not VAT registered, so no VAT is charged
on the sale; a setting holds that switch for later. Buyers in Botswana see
pula. The rand-to-pula rate is a setting: a daily market rate plus a buffer,
or a rate the admin fixes by hand (her table uses 1:1 for now).

This spec covers five changes: (1) rand costs and a converter, (2) customs in
the landed cost of imported goods, (3) margin reporting that shows customs,
(4) the ladder, (5) a sale-VAT setting that stays off.

## Amendment 2026-10-21: customs leaves the product price

**Decision (product owner, WhatsApp 2026-10-20 20:20):** "Let's keep the
product sales and the courier separate. We will remove VAT from product
prices." Her voice note of 17:18 explains why: the courier she has signed up,
Gorosa Express Logistics, clears goods at the border under its own annual
licence and prices clearance into its delivery fee (a flat fee on small
orders, a percentage on large ones). Customs therefore travels with delivery,
not with the product. Courier choice at checkout is spec 0008.

What changes in this spec:

- **Formula.** `landed = supplier cost × rate` for every product, imported or
  not. `CUSTOMS_RATE` in `lib/pricing-formula.mjs` is `0`; the mechanism stays
  so a rate can come back without new code.
- **AC-3 worked example**, 8" at R280, rate 1.00: landed 280; retail 420;
  2 pieces 412; 3 pieces 408; 4 pieces 399; 5–10 373; 11–20 350; 21+ 331.
  Her table's 14% figures are still unit-tested, with the rate passed
  explicitly, to prove the arithmetic.
- **AC-7.** `customs_amount` is still written on each order item; it is 0.
- **AC-8.** The customs margin line stays and reads 0. Margins rise by the
  14% that left: retail keeps about 31% of the price either way, because the
  markup is on landed cost; the pula figures are lower.
- **AC-10.** Checkout no longer says "Included, covered by AfriDeal". The
  customs row reads "Cleared by your courier", and the product page badge
  reads "Customs cleared by courier".
- **Open question 3** (sales VAT) is unaffected: no VAT on the sale until
  AfriDeal registers.

Built 2026-10-21: the formula constant, the unit tests, `verify.mjs`
expectations (8" bulk 373, 10" bulk 599, 3 × 8" 408, customs 0), storefront
copy, e2e B11, and a reseed. The same day Product 8 (sent 2026-10-20 23:55)
joined as `p023`, Kinky Straight Lace Wig, 20" R1,050 to 32" R2,000. The chat
has no Product 6; Product 7 (Straight Pixie, R200) is not loaded yet.

## Amendment 2026-10-21 (2): hair runs on its own, leaner ladder

**Decision (product owner, WhatsApp 2026-10-21 13:55–13:56):** "I have been
sampling these numbers as though I am a customer. Comparing with competitors.
They didn't make sense. Sorry but we have to make these changes for this to
make sense." … "We want volumes, so our margins have to make sense." With it,
`AfriDeal_Retail_Wholesale_Pricing_No_14pct.xlsx`: supplier cost "(P)" at
1:1, no VAT or courier in the price, and new markups on cost. Applied to the
**hair category only** (developer's decision with the owner's sign-off the
same day); every other category keeps the ladder above.

| Rung | Quantity | Default | Hair | Hair floor | Hair keeps* |
|---|---|---|---|---|---|
| `RETAIL` | 1–4 | +50% | +25% | 13% | 17.5% (13.3% at 4 pcs) |
| `BULK` | 5–10 | +33% | +12% | 8% | 8.2% |
| `WHOLESALE` | 11–20 | +25% | +10% | 6% | 6.6% |
| `WHOLESALE_PLUS` | 21–99 | +18% | +8% | 4% | 4.9% |

\* Share of the selling price left after cost and the 2.5% card fee.

The retail multi-buy (2 / 3 / 5% off for 2 / 3 / 4+ pieces), the quantity
breaks, the per-seller-per-category counting and 100+ by quotation are
unchanged. Worked, 8" at R280: retail 350; 2 pieces 343; 3 pieces 340;
4 pieces 333; 5–10 314; 11–20 308; 21+ 303 (her sheet: 350 / 343 / 339.50 /
332.50 / 313.60 / 308 / 302.40; ours round up to the Pula, and the multi-buy
comes off the published retail price, so it can sit up to P2 above hers).

Built: `HAIR_LADDER_RUNGS` and `ladderFor(categoryId)` in
`lib/pricing-formula.mjs`; the seed writes hair's bands, retail markup
(`pricing-rules`), margin floors and promotional floor from it; the
how-it-works copy quotes both ladders; unit tests against every cell of her
sheet and every hair floor; `verify.mjs` (8" bulk 314, 10" bulk 504,
3 × 8" 340).

The thin wholesale floors leave little room: a hair promotion, a card fee
above 2.5% or a rate move against the pula would put the 21+ rung under cost.
Hair carries no promotions today.

## Context

How the rule was settled, 2026-10-19 to 2026-10-20:

- 2026-10-19 23:49, `AfriDeal_Hair_Pricelist_Designer.docx` / `.csv`: the
  first ladder (retail +60%, wholesale +38 / +28 / +20%), the multi-buy
  rules, "count eligible units per seller", and "allow an administrator to
  configure markup rates, thresholds and discounts". Courier and tax
  excluded.
- 08:01: upload prices in rand; convert at a market rate so the conversion
  cushions profit. 07:56: Botswana sees pula, Zambia later sees kwacha.
- 08:15: not VAT registered, so no VAT to the buyer. Once past the P1 million
  threshold, prices will embed VAT.
- 09:05 to 09:08: charging both VATs (`× 1.28`) makes us look expensive; leave
  sales VAT out at launch.
- 09:11: `(Supplier price × 1.14) + Markup`. 09:29: courier paid separately;
  the 1.14 is customs.
- The developer then proposed absorbing customs inside higher wholesale
  markups (60 / 43 / 35 / 30). Not adopted.
- Her answers to the numbered questions: the ladder applies to every
  category; units count per seller within one category; 100+ goes to
  quotation; customs is charged on the wig price only; every product is sold
  as AfriDeal for now.
- **11:45, `AfriDeal_Developer_Pricing_Table.csv`: the rule this spec
  builds.** Columns: supplier cost "(P, temporary 1:1)", landed cost incl.
  14%, competitive retail 50%, retail 2 / 3 / 4+ at 2 / 3 / 5% off, premium
  retail 75% and 90%, wholesale 5–10 33%, 11–20 25%, 21+ 18% (provisional).
  Every cell was checked against `landed × (1 + markup)` and matches.
  (`AfriDeal_Hair_Pricelist_Designer.csv` was sent again at 11:45; it is
  byte-identical to the 23:49 file.)

**Decision (product owner, 2026-10-20 11:45; adopted by the developer the same
day): customs goes into the landed cost, and the markup applies to the landed
cost.**

Share of the selling price kept after customs and the 2.5% card fee, against
the floors already in `data/margin-rules.json`:

| Rung | Markup on landed | Price ÷ supplier cost | Kept | Floor |
|---|---|---|---|---|
| Retail, 1 unit | 50% | 1.710 | 30.8% | 20% |
| Retail, 4+ (−5%) | 50% | 1.625 | 27.3% | 20% |
| 5–10 | 33% | 1.516 | 22.3% | 15% |
| 11–20 | 25% | 1.425 | 17.5% | 12% |
| 21–99 | 18% | 1.345 | 12.8% | 8% |

Every rung clears its floor, and each wholesale rung is cheaper than the
retail rung above it. On an 8" wig at R280 (rate 1.00): landed R319.20;
retail R478.80, 4+ R454.86, 5–10 R424.54, 11–20 R399.00, 21+ R376.66.
For comparison, her 09:11 formula gave R487.20 at retail and the absorb
proposal R448.

What the code does today:

- **Prices are computed ahead of time.** `scripts/seed.mjs` (`TIER_PLAN`,
  ~line 1181) writes `customer-prices` bands as
  `ceil(worst supplier cost × (1 + markup))`, one set per product, with
  `variant_id: null`. Every surface (product page, cart, checkout,
  `POST /api/orders`) reads those bands through `resolvePrice()` in
  `lib/pricing-tiers.ts`. Nothing recomputes them at run time.
- **The ladder is written in three places**: `LADDER` in
  `lib/pricing-model.ts`, `TIER_PLAN` in `scripts/seed.mjs`, and the floors in
  `data/margin-rules.json`. `scripts/verify.mjs` (~lines 986 to 1060) asserts
  the current rungs (1–4, 5–19, 20–49, 50–99; +60/46/32/22).
- **Everything is pula.** `SupplierOffer.supplier_cost` is "in Pula",
  `CustomerPrice.currency` is the literal type `'BWP'`, and there is no
  exchange rate anywhere.
- **One cost per product, not per length.** `SupplierOffer` has a single
  `supplier_cost`. Variants are priced by a ratio, `variant.price /
  product.price`, applied in the order route (line ~172). The wigs have a
  different cost for every length, so a ratio cannot hold them.
- **Quantity is per cart line.** `resolvePrice(…, line.qty, …)` in the cart,
  checkout and order route. Her rule counts all of one seller's units.
- **Customs is promised but not priced.** `country_of_origin !== 'BW'` shows
  "Customs & duty included" (product page, cart, checkout, order), but no
  price includes it, so today it would come out of margin.
- **Margin ignores customs.** `marginBreakdown()` and `calculatePrice()`
  subtract supplier cost, logistics and the gateway fee only.
- **A settings collection exists** (`data/settings.json`, `checkout_paused`),
  which is the natural home for the rate, buffer, customs rate, ladder and VAT
  switch.
- **Supplier offers live in Sanity** (`supplierOffer`, mapped in
  `lib/sanity/catalogue.ts` lines ~185 and ~321). The working Studio schema is
  in `Tshego/studio/schemaTypes/`.

## Requirements

**User stories**:
- As the product owner, I want to enter supplier prices in rand exactly as the
  supplier quotes them, so that I never convert by hand.
- As a buyer in Botswana, I want to see one pula price that already includes
  customs, with only courier added at checkout.
- As a salon buying several lengths of the same wig, I want my units counted
  together, so that six mixed wigs earn the wholesale price.
- As finance, I want margins that show the 14% customs, so that reports show
  what we actually keep.
- As an admin, I want to set the rate, the buffer, the customs rate and the
  ladder without a redeploy, and to turn on sales VAT the day we register.

**Acceptance criteria**:
- **AC-1 Rand costs.** A supplier offer stores its cost and its currency
  (`ZAR` or `BWP`), one cost per variant. Existing offers read as `BWP` and
  price exactly as before.
- **AC-2 Rate.** The rate is a setting with two modes: **manual** (a rate the
  admin types, e.g. 1.00) and **market** (`market mid × (1 + buffer)`,
  fetched once a day). The admin sees the rate, its mode, source and age, and
  can switch modes. In market mode a failed fetch keeps the last rate, and the
  console warns once it is older than 3 days. Launch mode waits on open
  question 2.
- **AC-3 Formula.** For one unit at markup `m` and multi-buy discount `d`,
  with `c = cost × rate` in pula and customs rate `k` (0.14 when
  `country_of_origin` is not `BW`, else 0):
  `landed = c × (1 + k)` and `unit = ceil(landed × (1 + m) × (1 − d))`.
  Worked, 8" at R280, rate 1.00: landed 319.20; retail 479; 2 pieces 470
  each; 3 pieces 465; 4 pieces 456; 5–10 425; 11–20 399; 21+ 377. Prices round
  **up** to the whole pula, as today (her table works to the thebe). The
  multi-buy discount applies to the published retail price, as her rules say
  ("on the combined eligible retail product subtotal"), so a multi-buy price
  can sit up to P2 above her unrounded figure (456 against 454.86), never below. Round
  each step to the whole thebe before the final ceiling: in floating point
  `319.2 × 1.25` can come out a hair above 399 and ceil to 400 (her own CSV
  shows the same drift, e.g. `718.1999999999999`).
- **AC-4 Ladder.** Rungs, mapped onto the existing tier names:
  `RETAIL` 1–4 at +50%, less 2% for 2 units, 3% for 3, 5% for 4;
  `BULK` 5–10 at +33%; `WHOLESALE` 11–20 at +25%; `WHOLESALE_PLUS` 21–99 at
  +18%; 100+ by quotation. Markups, thresholds and discounts are settings,
  not constants. A product marked premium (`price_position`) takes +75% or
  +90% on its `RETAIL` rung instead of +50%; its multi-buy discount and
  wholesale rungs follow open question 1.
- **AC-5 Counting.** The rung is chosen by the total units in the cart from
  the same seller **within one category**, and every one of those lines is
  priced at that rung. Wigs and weaves count together (`c1`); a hair serum
  (`c7`) or a phone charger does not. Wholesale rungs get no multi-buy
  discount on top.
- **AC-6 Same price everywhere.** Product page, cart, checkout and
  `POST /api/orders` agree to the thebe for the same cart. The server
  recomputes the price; a price sent by the browser is ignored.
- **AC-7 Locked at order.** An order item records the unit price, the
  supplier cost in its own currency, the rate used and the customs amount, so
  a rate change tomorrow never alters a placed order or its payable.
- **AC-8 Margin.** Margin = price − cost in pula − customs − logistics −
  gateway fee, with customs shown as its own line in the margin alerts, the
  admin pricing calculator and the console product page. The floors stay at
  retail 20%, bulk 15%, wholesale 12%, wholesale+ 8%, and every rung of AC-4
  clears its floor on an imported product (see the Decision table).
- **AC-9 Sales VAT.** A setting `sales_vat.registered` defaults to `false`;
  while false, no VAT is added or shown. The switch itself is open
  question 3.
- **AC-10 Courier.** Checkout still shows courier as its own line and customs
  as "Included". Nothing about delivery changes.
- **AC-11 Checks.** `npm run verify` asserts the new rungs, the landed cost
  on an imported product and its absence on a Botswana one, mixed-length
  counting within a category (and none across categories), the rate snapshot
  on an order, and that a browser-sent price is ignored. Unit tests cover the
  formula against every cell of her developer table, rounding, rung choice,
  and every rung clearing its floor.

## Options considered

### Option 1: Keep stored bands, regenerate them whenever an input changes (recommended)

The bands in `customer-prices` become a derived table. One function computes
them from cost, currency, rate, customs and the ladder; it runs in the seed,
after the daily rate fetch, and when an admin edits a cost, the rate, the
buffer or the ladder. Product page, cart, checkout and order route keep
reading bands through `resolvePrice()`.

- Smallest blast radius: the half-dozen components that render ladders
  (`PriceLadder`, `PackagesBoard`, `TierSwitch`, `tier-doors`, browse) do not
  change shape.
- Bands can now be per variant (`variant_id` is already on the type and
  already filtered by `priceLadder()`), which retires the price ratio.
- Promotional and negotiated bands keep working beside the generated ones.
- Cost: a regeneration step that must run after every input change, or
  prices drift. Mitigated by one entry point and a timestamp on each band set.

### Option 2: Compute the price at read time, drop stored bands for managed products

Every surface calls the formula with the live rate. Always current, no
regeneration, but every ladder component and the order route change, and
promotional bands need a second path. More code moved for no buyer-visible
gain while the rate changes at most once a day.

**Recommendation: Option 1.**

## Design

### Data

- `SupplierOffer` gains `cost_currency: 'ZAR' | 'BWP'` (default `BWP`) and
  `variant_costs: { variant_id, cost }[]`. `supplier_cost` stays as the
  product-level fallback for offers with no per-variant costs, so every
  existing offer is untouched. Sanity: same fields on `supplierOffer` in
  `Tshego/studio/schemaTypes/`, mapped in `lib/sanity/catalogue.ts`.
- `CustomerPrice.currency` stays `'BWP'` (buyers pay pula); each generated
  band records `source_cost`, `source_currency`, `fx_rate`, `customs_rate`
  and `generated_at`, so any price can be explained.
- `OrderItem` gains `supplier_cost_currency`, `fx_rate`, `customs_amount`.
  `supplier_cost` keeps the supplier's own currency, which is what the
  supplier is paid in.
- Settings rows (in `settings`):
  - `fx` → `{ pair: 'ZAR/BWP', mode: 'MANUAL' | 'MARKET', rate, mid, buffer_pct, source, fetched_at }`
  - `customs` → `{ rate: 0.14 }`
  - `ladder` → the rungs of AC-4, in data
  - `sales_vat` → `{ registered: false, rate: 0.14 }`

### Code

- `lib/pricing-model.ts`: `LADDER` becomes the default for the `ladder`
  setting, with the AC-4 markups. A new pure `landedCost({ cost, currency,
  rate, customsRate, imported })` returns `{ cost_bwp, customs, landed }`, and
  `unitPrice({ landed, markup, discount })` implements AC-3. These two are
  the **only** place the formula exists; `priceAtRung()`, band generation,
  margin and quotes all call them.
- `lib/pricing/bands.ts` (new): `generateBands(product, offers, settings)`
  returns the bands for every variant and rung, from the worst-case offer as
  today. `regenerateBands(productIds?)` writes them through `mutate()`.
- `scripts/seed.mjs`: `TIER_PLAN` and the inline band loop call
  `generateBands`, so the seed and the app cannot disagree.
- `lib/fx.ts` (new): in market mode, fetch the ZAR/BWP mid from a free daily
  feed (candidate: the open ExchangeRate-API endpoint, which lists BWP;
  confirm at build), apply the buffer, store the `fx` setting. Uses
  `lib/postgres/network.mjs` timeouts like every other outbound call. In
  manual mode it does nothing.
- `app/api/cron/fx/route.ts` (new): guarded by `CRON_SECRET`, runs `lib/fx.ts`
  then `regenerateBands()`. Scheduled once a day in `vercel.json` `crons`.
- `lib/pricing-tiers.ts`: `resolvePrice()` takes a `tierQuantity` (the
  seller's per-category cart total) separate from the line quantity. A new
  `sellerQuantities(lines, products)` helper computes it once per cart and is
  used by cart, checkout and the order route.
- `app/api/orders/route.ts`: pass `variant_id` and `tierQuantity`; drop the
  variant price ratio where variant bands exist; write the AC-7 snapshot.
- `marginBreakdown()` and `calculatePrice()`: take the `landedCost()` result
  and report `customs_cost` as its own line. `findMarginAlerts()` converts
  the worst cost to pula and includes customs.
- Admin: `/admin/pricing` shows the rate, mode, source, age and buffer; the
  calculator takes a currency and shows the customs line; the ladder is
  editable there. Each edit triggers `regenerateBands()` and is audited.
- Spec 0004's quote price (`ceil(supplier unit price × 1.22)`) moves to the
  same two functions at the top published rung (+18% on landed), so quotes
  include customs too.

### Build order

1. `landedCost()`, `unitPrice()` and the `ladder` / `customs` / `sales_vat`
   / `fx` settings (manual rate), with unit tests against her developer
   table (AC-3, AC-4, AC-9).
2. `generateBands()`; the seed uses it; per-variant bands. Verify the current
   catalogue reprices as expected.
3. `cost_currency` and `variant_costs` on offers (JSON, Sanity schema,
   catalogue mapping).
4. Seller-total counting in `resolvePrice()`, cart, checkout and the order
   route; order snapshot fields (AC-5 to AC-7).
5. Margin with customs, alerts and admin calculator (AC-8).
6. Market mode: the daily fetch, cron route and admin rate panel (AC-2).
7. `verify.mjs` and e2e price expectations updated; load the five AfriDeal
   wigs (Products 1 to 5) as the first rand-priced products.

## Open questions

Asked of the product owner on WhatsApp, 2026-10-20.

1. **Premium retail (75% / 90%).** Her developer table adds two retail
   markups beside the competitive 50%. **Partly answered (2026-10-20 14:20):
   "Yes, some wigs are premium"**, so the choice is made per product. The
   shape is a `price_position` field on the product (`COMPETITIVE`,
   `PREMIUM_75`, `PREMIUM_90`, default `COMPETITIVE`) that swaps the retail
   markup. Still open:
   - which of Products 1 to 5 are premium, and at 75% or 90%;
   - whether premium wigs keep the multi-buy discount and the same wholesale
     rungs (33 / 25 / 18% on landed). Until she says otherwise, the build
     assumes **yes to both**: premium changes only the retail markup.
2. **"Supplier cost (P, temporary 1:1)."** Her table treats R1 as P1. Does
   AfriDeal launch on a manual rate of 1.00 and move to the market rate
   later, and if so, when? The pula is worth more than the rand, so 1:1
   overstates every cost in pula; that is extra margin while it lasts.
   AC-2's manual mode covers it either way.
3. **Turning on sales VAT.** Once AfriDeal registers, the customs 14% becomes
   claimable, so it leaves the landed cost, and 14% sales VAT is added to the
   selling price instead. Because `cost × 1.14 × 1.5` equals
   `cost × 1.5 × 1.14`, **the buyer's price does not change**; only the tax
   invoice and the remittance do. To confirm with her before the switch is
   built.
4. **Supplier payables in rand.** Payables are recorded in pula today. With
   AC-7 the order item keeps the rand cost; the ledger and settlement screens
   need a currency column. Follow-up work, not part of this spec.
5. **Product 1 and the supplier.** Every product is sold as AfriDeal for now
   (`owner_type: AFRIDEAL`, brand AfriDeal). Still open: whether the price
   list (8" R280 to 16" R1,060) is Product 1, and the supplier's name for the
   record behind the wigs.

Settled: the customs treatment (her 11:45 table); the ladder applies to
every category; counting is per seller within one category (`c1` holds only
hair, hair care is `c7`); 100+ goes to quotation; customs is charged on the
wig price only.

## Out of scope

The checkout currency for other countries (kwacha), courier partners and
rates, the gradual price-rise plan she described, Bank of Botswana licensing,
and supplier payouts in rand.
