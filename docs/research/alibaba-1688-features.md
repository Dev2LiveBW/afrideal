# Research spike — Alibaba / 1688 features and how they map to AfriDeal

**Ticket:** TICKET-008 · **Status:** ready for product-owner review · **Author:** engineering
**Date:** 2026-09-10 · **Decision needed from:** Tshego (product owner)

> This is a research document, not an implementation record. Nothing described
> here is built unless the "Maps to" column says so explicitly.

---

## 1. Scope and method

The product owner identified seven features in the Alibaba and 1688 apps as
worth considering for AfriDeal. This document takes each one, describes what it
actually does in the source product, and answers a single question:

**does AfriDeal already have this, is it covered by a ticket in flight, or does
it need new scoping?**

Sources are (a) a 3-minute screen recording of the Alibaba buyer app supplied
by the product owner on 2026-09-09, walked frame by frame, and (b) the product
owner's own description of the 1688 app. Both are checked against AfriDeal's
current code. Where a claim is about AfriDeal it is checked against the
codebase and the file is cited; where it is about Alibaba or 1688 it is a
description of observed product behaviour and should be re-verified against the
live apps before any of it is committed to a sprint.

**Caveat on transplanting:** Alibaba and 1688 are introduction marketplaces —
the platform connects a buyer to a seller and the two of them transact.
AfriDeal is not. AfriDeal buys from the supplier and resells to the customer,
so it is the merchant of record on every order
(`app/(store)/page.tsx`, "How it works"). Several features below are load-bearing
for an introduction model and change meaning entirely under a reseller model.
Those are flagged individually — they are the ones most likely to be adopted by
reflex and regretted later.

---

## 2. Feature-by-feature assessment

### 2.1 Category browsing structure

**In Alibaba / 1688.** A deep, formal taxonomy: a top-level grid of industries
opens onto second- and third-level categories, and a persistent left rail keeps
the tree visible while browsing. The taxonomy is treated as infrastructure —
it drives search, RFQ routing and supplier classification, not just navigation.

**In AfriDeal today.** One flat level. Seven categories in `data/categories.json`
(`Hair, Weaves & Extensions`, `Beauty & Personal Care`, `Electronics`,
`Clothing & Uniforms`, `Food & Agriculture`, `Building Materials`,
`Office Supplies`), rendered as a single icon grid and used as a single
`?category=` filter on `/browse`. There is no sub-category level anywhere in the
data model.

**Maps to:** partially existing, needs new scoping to go deeper.

**Note — a live mismatch worth resolving now.** TICKET-001's reference design
names six trades: Beauty & Hair, Electronics, Fashion, Home & Kitchen, Auto
Accessories, Baby & Kids. Three of them (Home & Kitchen, Auto Accessories,
Baby & Kids) do not exist in the catalogue, and three catalogue categories
(Food & Agriculture, Building Materials, Office Supplies) are not on the grid.
The implementation links the tiles that have a real category and falls back to
the unfiltered catalogue for the three that do not
(`afrideal/components/storefront/PopularCategories.tsx`). **That fallback is a
placeholder, not a design.** Either the three trades get seeded or the tiles
come off the grid.

**Recommendation.** Do not build a three-level taxonomy for seven categories —
it would be scaffolding around an empty room. Do settle the category set
(above) and add a second level only for the flagship line, where the sub-types
are real and buyers already ask for them by name: bundles, frontals, closures,
wigs, braiding hair. Roughly one sprint including the data migration and the
`/browse` filter. Revisit the full tree when the catalogue passes a few hundred
SKUs.

---

### 2.2 "Source by category"

**In Alibaba / 1688.** A distinct entry point from ordinary category browsing.
Ordinary browsing shows products; "Source by category" shows *suppliers* in a
category, with the trade credentials a procurement buyer screens on — company
type, years active, response rate, verified status, minimum order quantity —
and routes into an RFQ rather than into a cart.

**Maps to: TICKET-007, mostly.**

TICKET-007 ships an Alibaba-style listing grid at `/suppliers`
(`afrideal/app/(store)/suppliers/page.tsx`,
`afrideal/components/storefront/SupplierDirectory.tsx`) carrying product image,
published price, MOQ, verified-supplier badge and company name. That is the
substance of "Source by category" minus two things:

1. **No category filter on the directory yet.** The grid lists every verified
   listing. A category facet is a small, obvious follow-up.
2. **The cards route to the product page, not into an RFQ.** Under AfriDeal's
   reseller model that is arguably correct — see §2.3.

**Recommendation.** Add a category facet and a supplier-type facet to
`/suppliers` as a fast follow to TICKET-007. Small — a day or two on top of the
existing read model in `afrideal/lib/directory.ts`. Do not build a separate
"Source by category" destination; it would be the third route to the same rows.

---

### 2.3 "Request for Quotation" (RFQ)

**In Alibaba / 1688.** The buyer posts a specification once — product, quantity,
target price, delivery terms — and multiple suppliers bid against it. It is the
core of the platform for anything above catalogue quantities, and it is
explicitly a *many-suppliers-answer-one-buyer* mechanism.

**Maps to: existing, and already deeper than the storefront admits.**

AfriDeal has a working RFQ chain today:

| Piece | Where |
| --- | --- |
| Buyer-facing request modal | `afrideal/components/procurement/RfqModal.tsx` |
| Quotation entry point | `/browse?tier=CUSTOM`, and the product buy panel |
| API | `afrideal/app/api/rfqs` |
| Data | `data/rfqs.json`, `data/rfq-responses.json` |
| Supplier response workspace | `/supplier/quotes` |
| Threshold | 100 units — `QUOTATION_THRESHOLD` in `afrideal/lib/pricing-model.ts` |

**Important interaction with TICKET-006.** TICKET-006 removes the
"Buying 100 units or more? / Request a quotation / Apply as a supplier" card
from the homepage. That removes a *UI entry point* to a flow that still exists
and still works. After TICKET-006 the storefront's remaining routes into RFQ are
`/browse?tier=CUSTOM` and the product buy panel — both of which require the
buyer to already be deep in the catalogue.

**Recommendation.** Do not rebuild RFQ; it exists. Do decide, before the next
release, where the top-level entry point lives now that the homepage card is
gone. The `/suppliers` directory from TICKET-007 is the natural host — it is
where a buyer looking at MOQs and company names already is. **This is a
product-owner decision and is called out as an open question in §4.**

---

### 2.4 "Verified Pro Supplier" badge

**In Alibaba / 1688.** A paid, tiered trust product. Base verification confirms
the company is real; "Verified Pro" (and equivalents like Gold Supplier) adds
third-party inspection, on-site audit and, crucially, a commercial guarantee.
The tiers are a revenue line as much as a trust signal.

**In AfriDeal today.** Binary, not tiered. `SupplierStatus` is
`VERIFIED | PENDING | SUSPENDED | REJECTED` (`afrideal/types/index.ts`) with
`verification_docs` behind it, approved in the admin console at
`/admin/suppliers`. The verified badge renders on the directory cards shipped in
TICKET-007. There is separately a `supplier_type`
(`MANUFACTURER | WHOLESALER | DISTRIBUTOR | RETAILER | IMPORTER | BRAND | AGENT`)
and a `reliability_score` (0–100) that the selection engine already computes and
ranks on (`afrideal/lib/supplier-selection.ts`) but that the storefront does not
surface as a badge.

**Maps to:** base tier existing; the *Pro* tier requires new scoping, and is
partly a business-model question rather than an engineering one.

**Recommendation — and a caution.** Two separate things are bundled in the
Alibaba badge, and AfriDeal should not adopt them together:

- **Surfacing the signal it already computes** — cheap, honest, do it. The
  `reliability_score` and `fulfilment_rate` are real numbers derived from real
  orders. Showing "96% fulfilment · 214 orders" on a directory card is more
  informative than any badge and costs almost nothing.
- **A paid premium tier** — this is a revenue decision, not a UI one, and it
  cuts against AfriDeal's own model. AfriDeal is the merchant of record: it
  carries the fulfilment risk itself. Selling suppliers a badge that signals
  *the supplier* is trustworthy, on a platform where the *platform* is the
  counterparty, muddles who the buyer's recourse is against. Recommend
  **not now**; revisit only if AfriDeal ever runs a supplier-led commercial
  model at scale (`CommercialModel = 'SUPPLIER_LED'` already exists in the type
  system but is not the default).

---

### 2.5 "Factory matches for recent views"

**In Alibaba / 1688.** A recommendation rail: having viewed a product, the buyer
is shown manufacturers producing comparable items — pitched as "go direct to the
factory", i.e. cut out the intermediary.

**Maps to: needs new scoping — and the framing does not transfer.**

Two problems, one technical and one strategic.

*Technical.* AfriDeal has no view-history tracking. There is no recently-viewed
store, client-side or server-side, and no recommendation infrastructure. The
raw material for matching does exist — `supplier_type: 'MANUFACTURER'`,
`brand_id`, `product_type`, `category_id`, and a working supplier-ranking engine
in `afrideal/lib/supplier-selection.ts`. A simple version ("other verified
suppliers who carry this product", which the product page arguably should have
anyway) is a small piece of work. Genuine behavioural recommendation is not.

*Strategic — this is the important one.* "Go direct to the factory" is a
disintermediation pitch. On Alibaba, where the platform is an introduction
service and gets paid either way, that is a feature. On AfriDeal, where the
platform buys from the supplier and resells at a published markup
(`afrideal/lib/pricing-model.ts`), a UI inviting the buyer to go direct is an
invitation to route around AfriDeal's own margin. The mechanic is transplantable;
the pitch is not.

**Recommendation.** Build the modest, honest version: a "recently viewed" rail
and an "also available from" block on the product page, both framed as *choice
within AfriDeal* rather than as going direct. Scope: recently-viewed is small
(client-side, one sprint at most); "also available from" is nearly free given
`toPublicOffers()` in `afrideal/lib/queries.ts` already projects exactly this
data safely. Reject the disintermediation framing outright.

---

### 2.6 "Get samples" flow

**In Alibaba / 1688.** Order one or a few units before committing to an MOQ —
often at a premium unit price with the sample cost credited against a later bulk
order. It exists because MOQs on those platforms start in the hundreds and a
buyer will not commit blind.

**Maps to:** partially existing under a different name; the crediting mechanism
needs new scoping.

AfriDeal's retail rung *is* a sample purchase in all but name: 1–4 units at a
published price, no application, no minimum (`LADDER` in
`afrideal/lib/pricing-model.ts`). A buyer can already order one unit of anything
and see it before buying fifty. This is genuinely a structural advantage over
Alibaba, where sampling is a separate negotiated transaction — and the pricing
explainer shipped in TICKET-003 now says so on the homepage.

What does **not** exist is the credit: ordering one unit, then fifty, does not
discount the fifty. And supplier-level MOQs are real
(`SupplierOffer.moq`, now visible on the TICKET-007 directory cards) even though
the customer-facing ladder starts at one — the platform absorbs that gap today.

**Recommendation.** Do not build a separate "sample" product type; it would
duplicate the retail rung and confuse the ladder that TICKET-003 just spent a
section explaining. **Do** consider a sample-credit mechanic — "your first order
counts toward your bulk price" — as a distinct, scoped piece of work. It is a
pricing-engine change, not a UI change, and it touches
`afrideal/lib/pricing-tiers.ts` and checkout. Medium scope. Worth a separate
ticket and its own decision.

---

### 2.7 Purchasing-agent services

**In Alibaba / 1688.** Especially on 1688, which is domestic-Chinese and assumes
a local buyer: third-party agents source, inspect, negotiate, consolidate and
ship on behalf of a buyer who cannot do it themselves. It is a whole service
layer beside the marketplace.

**Maps to: existing — this is the AfriDeal Runner service, and it is arguably
ahead of the reference.**

AfriDeal already ships this end to end:

| Piece | Where |
| --- | --- |
| Buyer request form | `/request-a-runner` |
| Request tracking | `/requests` |
| Runner portal | `app/(runner)/runner/*` — jobs, sourcing, earnings |
| Admin oversight | `/admin/sourcing`, `/admin/runners` |
| Data model | `RunnerRequest` in `afrideal/types/procurement.ts` — item, quantity, budget per unit, delivery city, needed-by, status timeline |
| API | `afrideal/app/api/runner-requests`, `afrideal/app/api/runners` |

It is also given equal billing with the marketplace in the homepage hero
(`afrideal/components/storefront/MockupHero.tsx`), which is the right weight —
"can't find it listed? our verified runners will source it for you" is a
differentiator no Alibaba clone has.

**Recommendation.** Nothing to build. The gap is *positioning*, not capability:
1688's agent services are wrapped in explicit trust scaffolding — agent ratings,
service fees stated up front, inspection reports as a deliverable. AfriDeal has
runner ratings in the data but does not show a runner's track record to the
buyer before they commit. Small, high-value follow-up. Worth its own ticket.

---

## 2.8 What the screen recording actually shows

Frames pulled from the product owner's recording, for anyone specifying this
without the video to hand.

**The Categories tab is a two-pane browser, not a grid.** A fixed left rail
carries the top-level trades (Vehicle Parts & Accessories, Tools & Hardware,
Renewable Energy, Electrical Equipment & Supplies, Safety & Security, Material
Handling, Testing Instrument & Equipment, Power Transmission, Electronic
Components, Vehicles & Transportation, Agriculture Food & Beverage, Raw
Materials, Fabrication Services, Service). Tapping one swaps the right pane,
which is a 3-across grid of circular image tiles with a caption under each, and
a "View all" tile closing the set. The rail scrolls independently of the pane.
This is the pattern §2.1 refers to, and it only earns its keep at a catalogue
depth AfriDeal does not have yet.

**The home screen leads with three service entry points**, side by side under
the search bar: *Browse by category*, *Request for Quotation*, *Verified Pro
Supplier*. Below them, two rails: "Factory matches for recent views" (§2.5) and
"Get samples" (§2.6), then "Top-ranking manufacturers". Worth noting that RFQ is
given equal billing with browsing at the very top of the app — which is the
opposite of where AfriDeal is about to leave it after TICKET-006. See open
question 2.

**Search results carry the trade fields on every row**: price band
(`US$0.75-0.99`), `Min. order: 50 sets`, `Verified` with years and country, and
`Reorder rate 49%`. Tabs across the top split Products / Suppliers / Worldwide,
with filter chips for Verified Supplier and delivery window. The MOQ-on-card
pattern is what TICKET-007 reproduces; the reorder rate is the one field
AfriDeal could add cheaply and does not currently show — it holds the order
history to compute it.

**Purchasing agents are listed as products.** The recording opens
"All-in-One China Sourcing Agent From Guangzhou Expert 1688/Taobao/Yiwu
Purchasing Services" — priced at US$0.01, `Min. order: 1 unit`, sold by a
verified trading company. The detail page is a normal product page with a
**Key attributes** table doing the work: Service Type → Purchasing Agent;
Procurement agent area → 1688 China Wholesale market; After-Sales Guarantee →
20 years. It ends with `Store | Chat now | Send inquiry` rather than an
add-to-cart.

Two things follow from that, and they matter for §2.7:

- Alibaba models an agent as a **listing**, not as a separate service layer.
  AfriDeal models it as a first-class flow (the Runner service) with its own
  request form, portal and admin oversight. AfriDeal's version is the better
  one; there is nothing to copy here.
- The recording shows `Deliver to 0000, BW` and a negotiated lead time — the
  product owner was browsing as a Botswana buyer. Agents on Alibaba will quote
  into Botswana, which makes them a live competitor to the Runner service
  rather than a feature to import.

---

## 3. Summary table

| # | Feature | Status in AfriDeal | Maps to | Recommendation |
| --- | --- | --- | --- | --- |
| 2.1 | Category browsing structure | Flat, 7 categories | Partial; new scoping for depth | Settle the category set first (blocks TICKET-001 cleanly); sub-categories for the flagship line only |
| 2.2 | Source by category | Directory grid shipping | **TICKET-007** | Add category + supplier-type facets as a fast follow. No separate destination |
| 2.3 | Request for Quotation | Working end to end | Existing; **TICKET-006** removes an entry point | Do not rebuild. Decide where the top-level entry point now lives |
| 2.4 | Verified Pro Supplier badge | Binary verification only | Base existing; Pro tier needs scoping | Surface `reliability_score` / fulfilment rate. Defer the paid tier — it conflicts with merchant-of-record |
| 2.5 | Factory matches for recent views | No view tracking, no recommender | New scoping | Build "recently viewed" + "also available from". Reject the go-direct framing |
| 2.6 | Get samples | Retail rung is functionally this | Partial; credit mechanic needs scoping | No separate sample type. Scope a sample-credit pricing change separately |
| 2.7 | Purchasing-agent services | Runner service, complete | Existing | Nothing to build. Surface runner track record to buyers |

**Cheapest wins, in order:** 2.2 facets → 2.5 "also available from" → 2.4 surface
the existing reliability numbers → 2.7 runner track record. All four are small
and all four use data the platform already holds.

**Do not build without a further decision:** 2.4 paid tier, 2.6 sample credit,
2.1 full taxonomy.

---

## 4. Open questions for the product owner

1. **Category set (blocks a clean TICKET-001 close).** Home & Kitchen, Auto
   Accessories and Baby & Kids appear on the reference design but not in the
   catalogue. Seed them, or replace those tiles with real categories?
2. **RFQ entry point (raised by TICKET-006).** The homepage bulk-quotation card
   is gone. Where does "Request a quotation" surface at top level now — the
   `/suppliers` directory, the nav, or nowhere until a buyer is in the catalogue?
3. **"Apply as a supplier" (raised by TICKET-006).** Same card, same question.
   The backend flow is untouched and still live at `/signup` → `/supplier/*` →
   `/admin/suppliers`. Only the homepage entry point was removed. Where does it
   go — nav, footer, dedicated landing page, or the existing "Become a Supplier"
   promo card?
4. **Directory placement (TICKET-007).** Homepage section, dedicated page, or
   nav tab? Currently all three, behind flags in
   `afrideal/lib/directory-placement.ts`.
5. **Verified tiers.** Is a paid supplier-verification tier a revenue line
   AfriDeal wants, given it is the merchant of record and carries the risk
   itself?
6. **Reference assets.** No client reference designs are present in the repo
   (`afrideal/public/images`, `docs/mockups` — the latter holds only a README).
   Pixel-accurate implementation of anything described as an "attached graphic"
   is blocked until those are supplied.
