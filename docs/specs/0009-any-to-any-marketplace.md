# 0009. Any-to-any marketplace: buyers, suppliers, runners and couriers anywhere

**Date**: 2026-10-22
**Status**: Building. The principle is decided (product owner, 2026-10-22).
Build steps 1 and 2 are done (2026-10-22): the `countries` collection
(Botswana, South Africa, Lesotho; migration `0003`), country and currency as
codes from data with every `'BW' | 'ZA'` union and enum gone, a Lesotho
supplier (Maluti Workwear, Maseru, quoting in maloti) in the seed, and
`lib/lanes.mjs` (`laneFor`, `isCrossBorder`, `DEFAULT_DELIVERY_COUNTRY`)
replacing every "not Botswana" check; orders record `delivery_country`, and
the order route refuses a country AfriDeal does not trade in.
Step 3 is done (2026-10-22): each country carries the `towns` "Deliver to"
offers; the header picker lists them grouped by country and persists
`{ country, city }` (store version 1 migrates a saved town as Botswana); the
cart and product page work out customs from that lane; checkout opens a
Country field from it, offers only that country's lockers (none outside
Botswana yet), suggests its towns, and sends `delivery_country` with the
order. Checked in the browser: Maseru shows customs on South African wigs,
Johannesburg does not, and an order to Maseru records `LS`.
`DEFAULT_DELIVERY_COUNTRY` is now only the first-visit default.
Steps 4 and 5 are done (2026-10-22). Runners carry a `country` and the
`towns` they serve; runner jobs record pickup and drop-off country and town,
and a new job alerts the online runners serving its pickup town
(`lib/runner-match.ts`), falling back to every online runner so no job goes
unseen until spec 0005's 30-minute widening replaces that. A Maseru runner is
seeded. Couriers are data (`couriers`, migration `0004`): each lists routes
from a country (optionally a town) to a destination town with its own fee
rule, launch price and payable; `lib/couriers.mjs` finds the couriers for a
lane and computes the fee (Gorosa's two routes seeded and unit-tested). The
checkout courier choice itself is spec 0008's build and waits on its open
question 2 (when the buyer pays). The copy sweep removed "Botswana and South
Africa" from the tagline, site description and trust strip, names the order's
country from the data, and starts the delivery estimate and RFQ location
from "Deliver to". Step 6 and the open questions remain.

## Summary

AfriDeal is **not** "buyers in Botswana buying from South Africa". It is a
marketplace where a buyer in any country can order goods held in any country:
a buyer in Maseru can order South African goods or Gaborone goods; a buyer in
Gaborone can order from Johannesburg or from Gaborone. Suppliers are onboarded
from anywhere, runners work wherever they are, and couriers are listed for the
routes they serve. After a purchase the buyer either requests a runner or
picks a delivery or courier service available for that route.

Every order is therefore a **lane**: from where the goods are (the supplier's
country and town) to where the buyer wants them (the delivery country and
town). A lane inside one country is ordinary; a lane across a border is one
case among many, not the definition of the business.

## Context

Product owner, relayed by the developer 2026-10-22: "ensure that the primary
market is not people in Botswana buying from South Africa. But everywhere,
anywhere and everywhere. So Lesotho can put orders here, for South African
goods, for Botswana goods, same as Botswana, they can order from South Africa
as well as Gaborone … So that dynamic should be understood and instilled nice
and early. So we can onboard suppliers from anywhere, and then we can have
runners from whatever location they may be. So upon maybe making a purchase,
you request a runner or you find a delivery or courier service available."

What the code assumes today (inventory, 2026-10-22):

| Assumption | Where |
|---|---|
| Suppliers are in `BW` or `ZA` only | `types/index.ts` (`country: 'BW' \| 'ZA'`), `lib/directory.ts`, `lib/queries.ts`, `app/api/suppliers/route.ts` (zod enum), `OnboardSupplierButton.tsx`, supplier pages (`COUNTRY_NAME` maps) |
| "Imported" means "not from Botswana" | `lib/pricing-tiers.ts` (`offerLandedCost`), cart, checkout, order page, product buy panel (`country_of_origin !== 'BW'`), `scripts/seed.mjs` (`originFor`) |
| Buyers pay in pula | `CustomerPrice.currency: 'BWP'`, order route, RFQ route, mock gateway |
| Buyers are in Botswana | header "Deliver to … Botswana" (`StorefrontNav.tsx`), checkout defaults (Gaborone, Orange Money "Botswana numbers"), collection points (Gaborone, Francistown), runner request form placeholder |
| Couriers run South Africa → Botswana | spec 0008 (Gorosa: Johannesburg → Gaborone / Francistown) |
| Runners have one town, no country | spec 0005, `Runner.city` |
| Copy says "Botswana and South Africa" | footer, scope index, specs 0007 and 0008, legal and language plans (Setswana only) |

None of this is wrong for the first lanes; it is wrong as the shape of the
model. It is cheapest to change now, while the data is seed data.

## Requirements

**User stories**:
- As a buyer in Lesotho, I want to order goods held in Botswana or South
  Africa and see what delivery to Maseru costs and who can carry it.
- As a buyer in Gaborone, I want to buy from a Gaborone supplier without being
  shown customs or a border courier.
- As the product owner, I want to onboard a supplier, runner or courier in any
  country without a code change.
- As a runner, I want to say which towns in which country I serve.

**Acceptance criteria** (first build; the money questions below come later):
- **AC-1 Countries are data.** A `countries` collection (`code`, `name`,
  `currency`, `active`, `sort_order`), seeded with Botswana, South Africa and
  Lesotho. Adding a country is a data change.
- **AC-2 Anyone, anywhere.** Supplier, runner, courier depot, collection point
  and delivery address each carry a `country` code from that collection; no
  type, enum or zod schema in the app hard-codes `'BW' | 'ZA'`.
- **AC-3 Lanes, not "imported".** A line is cross-border when the goods'
  country differs from the **delivery** country, not when it differs from
  Botswana. Customs rows, courier clearance and any customs maths key off
  that. A Gaborone buyer ordering from a Gaborone supplier sees no customs row.
- **AC-4 Deliver to.** The header's "Deliver to" holds a country and a town
  (default Botswana, Gaborone until a buyer chooses); checkout starts from it.
- **AC-5 Delivery choices per lane.** At checkout, and after purchase, the
  buyer sees the options that serve the lane: listed couriers whose routes
  cover origin → destination (spec 0008, generalised from "Gorosa,
  Johannesburg → Gaborone"), runners who serve the destination town (or the
  origin town, for a sourcing errand), and collection points in the
  destination country. If none serve the lane, the order can still be placed
  and the team arranges delivery by hand.
- **AC-6 Runners by place.** A runner's service area is a country plus towns
  (spec 0005's towns, with a country added). Runner jobs are offered only to
  runners serving the job's town.
- **AC-7 Copy.** No storefront, footer or email copy describes AfriDeal as a
  Botswana-only or SA-to-Botswana service.

## Design (first build)

- **Data.** `countries` as a document collection in Postgres (routed by
  `lib/db.ts`, like `settings`). `country` becomes a string code validated
  against active countries; existing rows keep `BW` / `ZA`. Courier routes
  (spec 0008) become `routes: [{ from: { country, city? }, to: { country,
  city }, fee_rule }]`; Gorosa is `ZA/Johannesburg → BW/Gaborone` and
  `→ BW/Francistown`.
- **Lane helper.** `lib/lanes.ts`: `laneFor(line, deliveryCountry)` returns
  `{ from, to, crossBorder }`; every `country_of_origin !== 'BW'` check is
  replaced by `laneFor(...).crossBorder`. `offerLandedCost()` takes the
  delivery country.
- **Pricing.** The ladders (spec 0007, including hair's) do not depend on
  country: the markup is on landed cost. Only conversion does: landed cost is
  converted from the supplier's currency to the **buyer's** currency at the
  rate for that pair (spec 0007's `FX_RATES`, which become pairs). Until open
  question 1 is answered, every buyer still pays in pula.
- **Seed.** A Lesotho supplier and a Lesotho collection point join the demo
  data, so the any-to-any paths are exercised by `verify` and e2e from day one.

## Build order

1. `countries`, string country codes, enums removed; seed adds Lesotho.
2. `laneFor()`; replace every "not Botswana" check; customs row per lane.
3. "Deliver to" country + town in the header and checkout.
4. Courier routes (spec 0008 build) and runner service areas with countries.
5. Copy sweep (footer, scope, emails).
6. After open questions 1 to 3: buyer currency, gateways per country, tax.

## Open questions

1. **Currency the buyer pays in.** Does a buyer in Lesotho pay in maloti (or
   rand, which circulates there), or does everyone pay in pula? This decides
   checkout, the gateway and reconciliation.
2. **Payment gateways per country.** Orange Money and the card gateway are
   Botswana arrangements. What does a Lesotho or South African buyer pay with
   (M-Pesa, EcoCash, SA cards)?
3. **Merchant of record and tax per country.** AfriDeal is the merchant of
   record in Botswana (not yet VAT registered). Who is the seller of record
   for a Lesotho buyer, and whose VAT and import rules apply on each lane?
4. **Launch countries.** Botswana, South Africa and Lesotho first? Namibia,
   Eswatini, Zimbabwe, Zambia later?
5. **Runners across borders.** May a runner carry goods across a border, or
   only within their country, with couriers for the border?
6. **Language.** Setswana is planned (scope feature 19); does Lesotho need
   Sesotho at launch?
7. **Data protection.** Botswana's Data Protection Act 2018 governs today;
   Lesotho and South Africa (POPIA) have their own. Hosting and consent
   wording may need to cover each.

## Out of scope

Customs maths for lanes other than ZA → BW (the courier prices clearance, spec
0008), multi-currency settlement and payouts, and per-country storefronts.
