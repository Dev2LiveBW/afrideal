# Review, feat/order-payment-states (feature 32, any-to-any marketplace, spec 0009), 2026-11-03

**Reviewed by**: fresh-model reviewer (author on a different model)
**Scope**: 116 files, `30828ea..c02473e` (range, 14 commits; data/*.json regenerated seed output skimmed, docs-only commits skimmed)
**Verdict**: Changes requested

## Summary

The change turns the Botswana-buys-from-South-Africa model into lanes: countries and couriers become data, `laneFor` replaces every "not Botswana" check, "Deliver to" carries a country and town, runners and jobs are matched by place, and buyers are charged in their country's currency. The lane logic is clean, small and well unit-tested, and the order route validates country and payment method on the server. The headline problems are all about the new per-order currency: the checkout summary can show a different currency from the one the server charges, several customer-facing messages and the money ledgers still assume pula, and the runner sourcing pool has no fallback, so a request can be stranded. Two deployment-time data gaps (empty `countries` table, runners with no country) would break checkout and sourcing on any database not reloaded from the seed. No blockers. The Lesotho courier gap and the Maseru locker placeholder were treated as known and are not reported.

## Major

### 🟠 Checkout summary can show one currency while the order is charged in another, `app/(store)/checkout/CheckoutClient.tsx:640`
**Problem**: The order summary, mobile total bar and every `MoneyText amount={...}` in checkout (lines 640, 686, 719, and the line items) convert pula using the storefront provider, which follows the header "Deliver to" country (`BuyerCurrencyProvider`). The Country select added in this change only calls `setValue('delivery_country')`; it never updates the header choice. The server (`app/api/orders/route.ts:128`) charges in the currency of the country that is posted. A buyer whose header says Gaborone who picks Lesotho (or a Maseru locker) in the form sees "BWP 420.00" and is charged ZAR. The same applies in reverse. The line "Total to pay" is the amount the card will be asked for, so it must match.
**Why it matters**: At today's 1:1 rate only the label differs, but it is the label on the figure the buyer approves before paying by card. The moment spec 0007's rate moves, the numbers differ too, and nothing in the order flow shows the buyer the currency they were actually charged until after the order exists.
**Suggested fix**: Make checkout compute and show amounts in the currency of the country selected in the form (or lane country for a locker), by passing that currency to `MoneyText`/`PriceText` explicitly, or by pushing the form's country into the persisted "Deliver to" when it changes. Add an e2e or component check that the displayed currency equals the posted order's currency when the form country differs from the header.

### 🟠 Money already stored in the buyer's currency is treated as pula by the ledgers, `lib/payments/confirm.ts:496`
**Problem**: Order items and totals are now in `order.currency` (ZAR for Lesotho, South Africa, Eswatini), but the code that turns them into supplier money still treats them as pula and mixes them with supplier-currency costs. `raiseSupplierLegs` sets `platform_margin = sum(line_total) - sum(supplier_cost * qty)` and the payable amount `supplier_subtotal + platform_margin`, so the payable equals the buyer-currency gross, while `supplier_cost` is in the supplier's own currency (LSL for Maluti Workwear, ZAR for South African suppliers). `app/api/analytics/route.ts:62` and `:46` sum `order.total` and `unit_price - supplier_cost` across orders in different currencies, and the console shows all of it as BWP.
**Why it matters**: Invisible while every `FX_RATES` entry is 1, but spec 0009 and spec 0007 both plan to move the rate. From then on, payables owed to suppliers, platform margin and GMV are wrong for every non-pula order, and finance would be paying suppliers from mis-denominated invoices. Mixed-currency order rows are also now in the data with no per-row conversion back to the base currency.
**Suggested fix**: Decide the booking currency (spec says pula) and convert at the point legs and payables are raised, using the same rate that priced the order (store it on the order, for example `fx_to_base`). Compute margin from the base-currency landed cost, not raw `supplier_cost`. Sum GMV and margin in the base currency. If this is intentionally left to the "multi-currency settlement" out-of-scope item, record that on the spec as a blocking prerequisite for changing any rate, and add a guard so `FX_RATES` cannot move off 1 without it.

### 🟠 A runner request in a town nobody serves is invisible to every runner, `app/api/runner-requests/route.ts:115`
**Problem**: Sourcing requests are notified only to online runners whose `servesPlace` matches, and the runner sourcing pool (`app/(runner)/runner/sourcing/page.tsx:36`) hides every request the runner does not serve. Unlike delivery jobs (`runnersForJob`) there is no widening fallback. `delivery_city` on the request form is free text, and `servesPlace` is an exact (case and trim insensitive) town match, so "Mogoditshane" works only if a runner listed it, and a Maseru buyer who types "Gaborone" while the header says Lesotho is also unmatched. Nothing in the UI tells the buyer that no runner serves their town.
**Why it matters**: The buyer submits a request, gets a confirmation, and it is never offered to anyone. The comment in the route says the pool "shows it to the same runners, so nobody else can take it", which makes that a deliberate dead end rather than a delay. Spec 0009 only agreed to a fallback for delivery jobs, but the request flow has the same failure and no spec 0005 widening yet.
**Suggested fix**: Apply the same `runnersForJob`-style fallback to requests (all online runners when nobody local is online, and let the pool show it to them), or tell the buyer at submit time that no runner serves that town and offer the towns that are served. Validate the town against `country.towns` or a runner's towns list rather than free text.

### 🟠 Live data has no `countries` rows and no runner `country`/`towns`; there is no migration or backfill, `drizzle/0003_aspiring_human_robot.sql:1`
**Problem**: Migrations 0003 and 0004 only create empty `countries` and `couriers` tables. The orders route reads `activeCountries()` and returns 422 "We do not deliver to that country yet" when none match, and the checkout page and the "Deliver to" picker render from the same table. `Runner.country` and `Runner.towns` are now required, and `servesPlace` returns false for a runner with no `country`, so any existing runner row in the database hides the whole sourcing pool from that runner and removes them from every notification, with no error. Rows are only populated by `npm run seed`/`db:load`, which resets the whole database.
**Why it matters**: On any database not reloaded from the seed (staging, production once it holds real orders), every checkout fails, the header picker is empty, and runners lose work. The AGENTS notes say the production Neon branch is still seed data today, so this is a deploy-order trap rather than a live outage, but nothing documents or automates it.
**Suggested fix**: Ship a data migration (or an idempotent script) that upserts the four `countries`, the courier rows and backfills `country`/`towns` on runners from `city`, run as part of `db:migrate`; and make `servesPlace` treat a missing `country` as the delivery default or fail loudly. Note the deploy step in spec 0009.

## Minor

### 🟡 Customer-facing money messages still hard-code BWP, `lib/refunds.ts:155`
**Problem**: The refund notification (`lib/refunds.ts:155`, also :117, :135, :148), the refused-payment finance notification (`lib/payments/confirm.ts:217`) and the "settles ... with the supplier" confirm dialog on the buyer's order page (`app/(store)/orders/[id]/OrderActions.tsx:110-111`, built from payable amounts through `bwp()`) all print BWP. The refund message tells a Lesotho buyer "A refund of BWP 420.00" for a ZAR payment.
**Why it matters**: Wrong currency on a refund notice or a payment-needs-a-decision message to finance. Same latent number problem as the ledger finding once the rate moves.
**Suggested fix**: Format with the order's currency (`moneyLong(amount, order.currency)`) in these places.

### 🟡 `fromPula` is only ever tested at 1:1, and per-line rounding will diverge from the checkout total, `lib/currency.mjs:62`
**Problem**: `app/api/orders/route.ts:219-220` converts each line's `unit_price` and `line_total` separately (each rounded up), then adds them; the checkout client sums pula then converts once. At any rate other than 1, `line_total` is not `unit_price * qty`, and the subtotal the server charges can differ from the one shown. `currency.test.ts` only exercises rate 1.
**Why it matters**: The collection-point fee history in `lib/collection-points.ts` is exactly this class of "buyer approved one total, charged another". Latent only because the rate is 1.
**Suggested fix**: Convert once, on the order subtotal (or compute checkout and server the same way), and add tests at a non-1 rate such as 0.75 and 1.37.

### 🟡 A country with a new buyer currency silently charges 1:1, `lib/currency.mjs:62`
**Problem**: `FX_RATES[currency] ?? 1`. Adding a country whose `buyer_currency` is not in `FX_RATES` (NAD, ZMW) is "a data change" per AC-1, but the order is charged at 1:1 and labelled with the new code.
**Why it matters**: A silent under- or over-charge instead of a refusal.
**Suggested fix**: Throw (and have the orders route return 422) when no rate exists for the buyer currency.

### 🟡 Runner job claim does not enforce the service area, `app/api/shipments/[id]/route.ts:27`
**Problem**: AC-6 says jobs are "offered only to runners serving the job's town". The filter is in `getRunnerWorkspace` (display) and notification routing only; the PATCH that accepts a job takes any RUNNER for an unassigned shipment. The `available` filter also treats the viewing runner as online, so an offline local runner counts as "local" and can hide a job from an online non-local runner who would have received the widened fallback.
**Why it matters**: UI-only gating, and an inconsistency in who sees a widened job.
**Suggested fix**: Check `runnersForJob` membership on accept for runners, or document the display filter as advisory.

### 🟡 Checkout and cart quote the courier by `qty=1` routing, `lib/supplier-selection.ts:184`
**Problem**: `goodsCountries()` routes each product with qty 1, but the server routes with the real quantity (`routeLine(..., line.qty)`), which prefers an offer with enough stock. A product with a Johannesburg offer in stock for 1 unit but a Maseru offer for 50 shows a different lane (customs and courier row) at checkout from the lane the order takes.
**Why it matters**: Customs and courier text and the courier fee quote can disagree with the order.
**Suggested fix**: Pass the cart quantity per line to the server-side lane helper, or compute the lane in an API the client calls with quantities.

### 🟡 Courier quote ignores routes that start from a specific town, `app/(store)/checkout/CheckoutClient.tsx:236`
**Problem**: The checkout calls `couriersForLane` without `fromCity`, so any route with `from.city` set (the type allows it) never matches, and the quote falls back to "Arranged after you order". The seed has none yet.
**Why it matters**: A listed route would be silently treated as absent.
**Suggested fix**: Pass the supplier's city in `goodsCountries`/`goodsByOrigin`.

### 🟡 Margin alerts still assume a Botswana delivery lane, `lib/pricing-tiers.ts:441`
**Problem**: `findMarginAlerts` calls `isCrossBorder(supplierCountry, DEFAULT_DELIVERY_COUNTRY)`, and the seed prices bands on the same assumption. AGENTS.md says not to add to the Botswana assumptions. It is commented, and customs is 0 today, so there is no numeric effect.
**Why it matters**: One more hard-coded Botswana lane in new code, and wrong the day `CUSTOMS_RATE` is non-zero.
**Suggested fix**: Evaluate the worst case over the lanes the product is sold on, or add the item to spec 0009's inventory as known debt.

### 🟡 `POST /api/suppliers` now requires `country`, `app/api/suppliers/route.ts:16`
**Problem**: The old schema defaulted to `BW`; the new one rejects a missing country with 422. Any caller that omitted it breaks.
**Why it matters**: Contract change, though `verify` and the onboarding form both send it.
**Suggested fix**: Confirm there are no other callers; note it in the spec.

### 🟡 Order-route currency and country logic is covered only by `verify.mjs`, `app/api/orders/route.ts:117`
**Problem**: The new currency/payment-method/country branches live in a route handler and are exercised by `scripts/verify.mjs` (needs a running server) and e2e; no unit test covers `fromPula` at a non-1 rate, a locker overriding `delivery_country`, or a locker/country mismatch.
**Why it matters**: The riskiest new money logic has no fast test.
**Suggested fix**: Extract the order's currency/lane resolution into a lib function and unit-test it.

## Nits

- ⚪ `components/brand/MoneyText.tsx:11`, `useShown` is declared between imports (`import { cn }` follows it); move the helper below the imports.
- ⚪ `store/useAfriDealStore.ts:15`, the "Deliver to" cookie has no `Secure` flag and is set with no consent step; fine as a functional cookie, but the compliance notes in `docs/compliance/` should list it.
- ⚪ `studio/schemaTypes/shared.ts:59`, Studio `COUNTRIES` gets Lesotho but not Eswatini, which is a launch country.
- ⚪ `lib/countries.ts:30`, `countryNames` reads all rows including inactive countries; fine for display, just undocumented.
- ⚪ `scripts/seed.mjs` couriers, the Gorosa depot address and phone are a real third party's details committed to the repo; confirm that is acceptable.

## Strengths

- `lib/lanes.mjs` is small, plain JS shared by the seed and the app, and treats an unknown goods country as domestic rather than inventing customs; the lane tests cover it.
- The orders route validates the country against data, the payment method against that country's list, and takes the locker's fee and country from the server list, never the request.
- Every `'BW' | 'ZA'` union is gone and replaced by data; runner matching has a deliberate, tested fallback so a job is never unseen.
- `decodeDeliverTo` validates the cookie against active countries and towns before trusting it; the server's first paint now matches the persisted choice.
- All writes still go through `insert`/`update`/`mutate`, route handlers use `guard()`, and nothing opens a new connection without `network.mjs`.

## Test coverage

Targeted vitest run (lanes, runner-match, deliver-to, couriers, supplier-selection, pricing-tiers, queries, currency): 8 files, 51 tests, all pass. New pure logic is well covered, including edge cases (missing country, case, town matching, fee threshold, launch price). Gaps: `fromPula` only at rate 1; the order route's currency, locker-country and payment-method gating are covered by `verify.mjs` and e2e only; no test that checkout's displayed currency equals the charged currency; no test for a runner with no `country`; nothing exercises mixed-currency payables or analytics. I did not run typecheck, verify, or e2e (they need servers or a database).
