# 0011. Buyer account and checkout extras

**Date**: 2026-11-04
**Status**: In Progress

## Summary

This gives buyers a real account: saved addresses, saved items and alert settings, plus delivery instructions, a terms checkbox, reorder and a map link on tracking. It adds percent off promo codes last, paid for out of AfriDeal's margin and never below landed cost. Everything extends the existing store, checkout and order route, with three new collections and no new service. The mini cart and the welcome step wait for a recording of Alibaba's cart and sign up, because the benchmark has neither.

## Context

The account panel shows Addresses, Payments, Saved items and Account settings dimmed, each pointing back to `/orders`. Checkout asks for the address from scratch on every order, keeps no phone number, and takes no instructions or agreement to terms. A delivered order cannot be bought again. These are on the client's Phase 1 list as package 3 of the close out plan.

The market is any to any (spec 0009). A buyer in Maseru may send to Gaborone, the country chosen at checkout sets the currency charged, and amounts on an order are in that currency while the books stay in pula. An address book therefore carries a country, not just a street, and a promo code cannot be a fixed sum in one currency without conversion rules.

AfriDeal is the seller to the buyer, so a discount is AfriDeal's own money. Every money movement goes through `confirmPayment()` (spec 0003), and the price written at checkout is a promise (spec 0003, AC-9). Addresses, phone numbers and marketing consent are personal data under Botswana's Data Protection Act 2018, and the product takes card payments, so this feature is GA tier.

Two gaps shape the work. The legal pages (feature 17) are not built, yet the review step needs terms to agree to. And the storefront is measured against Alibaba, whose cart and post sign up screens are not in the benchmark: they sit behind sign in, and the two recordings on file do not show them (checked again on 2026-11-04).

## Requirements

**User stories**:
- As a buyer, I want to save my addresses so that I do not retype them, including for family in another country.
- As a buyer, I want to give the driver instructions and know what terms I am agreeing to before I pay.
- As a buyer, I want to reorder a delivered order so that repeat purchases take one tap.
- As a buyer, I want to save items for later, on any device.
- As a buyer, I want to choose how I hear from AfriDeal, and to get no marketing unless I ask for it.
- As a buyer, I want a promo code to lower my total before I pay.
- As a finance admin, I want to create and stop promo codes myself, knowing no code can sell below cost.

**Acceptance criteria** (the contract):

Addresses
- **AC-1**: A buyer can add, edit and delete up to 10 addresses from the account. Each has a label, recipient name, phone, country, town and street. An 11th is refused with a clear message.
- **AC-2**: One address is the default. The first saved becomes the default, setting another moves it, and deleting the default promotes the most recently updated remaining address.
- **AC-3**: At checkout a buyer with saved addresses can pick one, which fills the recipient, phone, country, town and street, and the page's currency follows that country (spec 0009). The default is picked when checkout opens, unless the header's "Deliver to" country differs from it, in which case nothing is picked. Changing the country on the form afterwards unpicks the address. The order carries strings, not an address id, and the server checks the country is active either way.
- **AC-4**: A doorstep order with a typed address offers "Save this address", and placing the order saves it, labelled by the buyer or by the town if left blank. If the book is already full, or the same street, town and country are already saved, the order still goes through, nothing is saved, and the buyer sees a notice. A collection point order offers neither, and the locker's country decides the order's country and currency whatever address was picked. Phone is required for doorstep orders and optional for collection points.
- **AC-5**: An order keeps a copy of its address, so editing or deleting a saved address never changes a placed order.
- **AC-6**: An address in a country no longer active shows in the account but cannot be picked at checkout.

Review step
- **AC-7**: Checkout stays one page. Above Place order it shows a delivery instructions box (optional, up to 300 characters) and a required terms checkbox linking to `/terms`.
- **AC-8**: `POST /api/orders` refuses an order without `terms_accepted: true` (422), and the order records when terms were accepted and which version.
- **AC-9**: Delivery instructions appear on the buyer's order page, the staff order page and the runner's job. The runner's job also shows the recipient's name and phone, not the buyer's, so a parcel for family in another country reaches the right person. None of these appear to suppliers.
- **AC-10**: `/terms` shows the wording checkout already uses about returns and refunds, clearly marked as a draft until feature 17 replaces it.

Reorder and tracking
- **AC-11**: A `DELIVERED` order offers Reorder. Its lines go into the cart at today's prices, and any line no longer sold, with no active offer holding enough stock for its quantity, or now priced by quotation is left out and named in a notice.
- **AC-12**: Reorder never carries an old price, and only the order's own buyer can reorder it.
- **AC-13**: Order tracking shows a map link. A collection point order opens the locker's name and address. A doorstep order opens the delivery town and country only, so a buyer's street address never goes into a link.

Saved items
- **AC-14**: A heart on the product card and the product page saves or removes an item for a signed in buyer, and the state shows on any device.
- **AC-15**: A guest who taps the heart goes to sign in and returns to the same page. Nothing is saved until they tap again.
- **AC-16**: The account lists saved items with today's price in the buyer's currency. A product no longer sold shows as unavailable and can be removed. The list holds up to 200 items.

Alert settings
- **AC-17**: The account has three switches: order updates by email (on), order updates by SMS (on), offers and news (off). In app notices cannot be turned off.
- **AC-18**: Turning on offers and news records the date of consent, and turning it off clears it. Both changes are audited.
- **AC-19**: The account panel's Addresses, Saved items and Account settings are live links. Payments stays dimmed, because stored cards are not in this feature.

Promo codes
- **AC-20**: A finance or super admin can create a code with a percent (1 to 90), maximum discount, minimum order, start and end dates and an optional total use limit, and can switch it off, change its end date or change its limit. The code is trimmed and upper cased, and the code and percent cannot change once created. A limit cannot be set below the code's paid uses. Operations, suppliers, runners and buyers receive 403.
- **AC-21**: A buyer can apply one code at checkout. The discount is the percent of the goods subtotal, never of delivery, and the summary shows it as its own line in the charge currency.
- **AC-22**: The discount is capped by the code's maximum and by the order's margin after customs, so no order sells below landed cost including customs. The floor applies to the whole order. If the margin leaves nothing to give, the code is refused with a message.
- **AC-23**: A code is refused when it is unknown, switched off, outside its dates, under its minimum, already used by this buyer, or at its total limit, each with its own plain message. An unknown code and a switched off code give the same message.
- **AC-24**: The server works out the discount again when the order is placed and ignores any figure from the browser. If the code stopped being valid, or the discount changed, since the buyer applied it, the order is refused (409 with `{ reason, promo_discount, total }`) and checkout shows the new total to confirm. Checkout quotes again whenever the cart, country or locker changes.
- **AC-25**: A code counts as used only by a paid order. An order that expires or is cancelled unpaid gives its use back without any extra write. While a buyer has an unpaid order on a code, that buyer cannot use the code again, and the once per buyer check runs again inside the order write so two parallel submits cannot both pass. A refunded order keeps its use. A late payment that reopens an expired order keeps its discount even if the buyer has since used the code again: the use is accepted and audited, because the money has already been taken.
- **AC-26**: The supplier's payable is unchanged by a discount, and the discount comes out of AfriDeal's recorded margin in pula. Across a multi supplier order the discount is shared in proportion to each leg's gross, over all suppliers in order of supplier id, so a resumed confirmation gets the same shares, and the shares add up exactly. A thin leg may show a negative margin, because the floor applies to the order.
- **AC-27**: Analytics margin falls by the discount, GMV counts what the buyer actually paid, and the order page, staff order page and refund default all use the discounted total.
- **AC-28**: Creating or changing a code is audited, and the admin list shows each code's paid uses.
- **AC-29**: `npm run verify` covers AC-8, AC-12, AC-20, AC-22, AC-24 and AC-25, and new e2e journeys cover addresses, reorder, saved items and a promo code.

**Held for a recording** (not in the ACs above, and not built by this spec until it is extended): the mini cart and the welcome step after sign up. See `## Follow-up`.

## Options considered

### Option 1: Extend the store, checkout and order route in place

Add three document collections and some fields, keep checkout on one page, and put the promo arithmetic in one pure function that both the quote endpoint and the order route call.

**Pros**:
- Reuses `mutate()`, `guard()`, the document tables and `confirmPayment()`, so there is nothing new to operate.
- One money path stays one money path.
- Each piece can ship and be reviewed on its own.

**Cons**:
- `POST /api/orders` and `CheckoutClient` both grow, and they are already the busiest files.
- Counting promo use from orders means a scan of orders per quote, which is fine at this volume only.

### Option 2: Use the payment provider's coupons

Stripe has its own coupon objects, and Checkout could apply them.

**Pros**:
- Limits and dates come ready made.

**Cons**:
- Works only for cards through Stripe. Bank transfer, mobile money and the later DPO path would each need their own version.
- The total on the order would be decided outside AfriDeal, which breaks the rule that the server's total is what is charged and leaves no margin floor.

### Option 3: A promotions service with a redemptions ledger

A separate module with a redemption row per use and a hold taken at checkout.

**Pros**:
- An exact count, even at the very end of a limit, and easy reporting.

**Cons**:
- A hold has to be released on every path out of an unpaid order, which is the kind of write that drifts.
- The engineer chose counting from paid orders when shown this option.

## Decision

**Chosen option**: Option 1: Extend the store, checkout and order route in place.

Saved addresses, saved items and promo codes become new collections, alert choices and promo and review details become fields on users and orders, and a single pure function works out every discount.

Calls settled while writing, with the runner up:
- **Promo arithmetic in `lib/promo.mjs`**, pure and shared by the quote and order routes, so the two cannot disagree. Runner up: a client side copy, which is how totals drift.
- **One `buildOrderLines()` extracted from `POST /api/orders`**, doing product, variant and minimum checks, routing, tier pooling and customs, called by both the quote and the order. The discount depends on all of it, so sharing only the arithmetic would still let them disagree. Runner up: a lighter quote, which disagrees on the first locker in another country.
- **The cap is worked out in pula from the same rounded figures the ledger books, and the order currency discount is authoritative.** It is rounded down, and the pula figure is derived from it, so there is one true number and the buyer never gets more than the cap. Maximum discount and minimum order are stored in pula. Runner up: per currency amounts, which needs a price list per code.
- **Reorder as a read endpoint** that returns current cart lines, and the client adds them. The cart lives in the browser store, so the server has nothing to write. Runner up: a server cart, which does not exist.
- **The heart reads saved state from one list fetched once per session** for signed in buyers. Runner up: a check per card, which floods the API on a grid.
- **Hard delete for addresses and saved items**: orders hold their own copy, and a buyer deleting their data should mean it. Runner up: soft delete, which keeps personal data for no use.
- **Terms version as a constant in `lib/terms.ts`**, so feature 17 changes one line. Runner up: a settings row, which is unused flexibility.
- **Map link through Google Maps' public search URL**, built by a pure function, with no API key. Runner up: an embedded map, which needs a key and sends data on page load.

## Rationale

The forces here are one builder, a live money path and client deadlines, so the design adds as little machinery as it can. A discount is a change to the most sensitive sum in the product, which is why it comes last, lands on tested ground, and has exactly one implementation. Promo codes through a provider would have split that sum across gateways and lost the margin floor that protects AfriDeal from a mistyped percent.

Counting uses from paid orders follows the project's habit of deriving state on read (`effectiveOrderStatus`): expiry and cancellation give a use back with no write that can be forgotten. The cost is that two buyers paying at the last moment can pass a total limit by one. The price written at checkout is a promise (spec 0003, AC-9), so honouring it is correct, and the overrun is bounded by the maximum discount.

Keeping checkout on one page respects the phone checkout just built (feature 5): the summary already acts as the review, and a second screen would cost every buyer a tap to protect against a rare mistake. Addresses carry a country because the market does, and picking one moves the currency through the `ChargeCurrency` wrapper already in place. The map link stops at the town for doorstep orders so a home address never leaves AfriDeal in a URL.

## Feature design

**Data model sketch**:

New collections, each a document table in `lib/postgres/schema.ts` and `lib/db.ts`:

| Collection | Field | Type | Notes |
|---|---|---|---|
| `addresses` | `id` | text, `adr` prefix | primary key |
| | `user_id` | text, required | owner, references `users` |
| | `label` | text, required, up to 40 | "Home", "Mum's house" |
| | `recipient_name` | text, required, up to 120 | |
| | `phone` | text, required, up to 30 | |
| | `country` | CountryCode, required | an active country when saved |
| | `town` | text, required, up to 120 | |
| | `street` | text, required, up to 200 | |
| | `is_default` | boolean, required | exactly one per buyer with any address |
| | `created_at`, `updated_at` | ISO text, required | |
| `saved-items` | `id` | text, `sav` prefix | primary key |
| | `user_id` | text, required | owner |
| | `product_id` | text, required | unique with `user_id` |
| | `created_at` | ISO text, required | |
| `promo-codes` | `id` | text, `prm` prefix | primary key |
| | `code` | text, required | upper case letters and digits, 4 to 20, unique |
| | `percent` | integer 1 to 90, required | fixed once created |
| | `max_discount` | number, required | pula, above 0 |
| | `min_order` | number, required | pula, 0 or more, on the goods subtotal |
| | `starts_at`, `ends_at` | ISO text, required | `ends_at` after `starts_at` |
| | `usage_limit` | integer, nullable | null means no total limit |
| | `active` | boolean, required | |
| | `created_by`, `created_at`, `updated_at` | text, required | |

Added fields (all optional, so existing rows stay valid):

| On | Field | Type | Notes |
|---|---|---|---|
| `User` | `alert_prefs` | `{ order_email, order_sms, marketing: boolean; marketing_consent_at: string or null }` | missing means on, on, off, null |
| `Order` | `delivery_phone` | text | copied from the address or typed |
| | `recipient_name` | text | copied the same way |
| | `delivery_instructions` | text, up to 300 | |
| | `terms_accepted_at`, `terms_version` | text | |
| | `promo_code` | text | the code as applied |
| | `promo_discount` | number | in `order.currency` |
| | `promo_discount_pula` | number | booked figure |
| `SupplierOrder` | `promo_discount` | number | this leg's share, in pula |
| `Shipment` | `delivery_instructions`, `dropoff_phone` | text | copied in `lib/shipments.ts`; `dropoff_name` uses `recipient_name` when set |

Relationships: a user has many addresses and saved items (1:N). A product has many saved items (1:N). An order refers to a promo by its code text, not an id, so it reads correctly if a code is later edited.

**State transitions**: none new. A promo code's state is derived: scheduled, live, ended or used up, from its dates, `active` and its paid uses.

**API surface**:

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/api/addresses` | GET | none | the buyer's addresses | CUSTOMER | 401 |
| `/api/addresses` | POST | all address fields, `is_default?` | address | CUSTOMER | 409 at 10, 422 |
| `/api/addresses/[id]` | PATCH | any address field | address | owner | 403, 404, 422 |
| `/api/addresses/[id]` | DELETE | none | `{ ok }` | owner | 403, 404 |
| `/api/saved-items` | GET | none | product ids and products | CUSTOMER | 401 |
| `/api/saved-items` | POST | `product_id` | item (idempotent) | CUSTOMER | 404, 409 at 200 |
| `/api/saved-items/[productId]` | DELETE | none | `{ ok }` (idempotent) | CUSTOMER | 401 |
| `/api/account/alerts` | PATCH | any of the three switches | `alert_prefs` | CUSTOMER | 422 |
| `/api/orders/[id]/reorder` | GET | none | `{ lines, skipped }` | owner | 403, 404, 409 unless `DELIVERED` |
| `/api/promo-codes/quote` | POST | `code`, `lines`, `delivery_country`, `delivery_method`, `collection_point?` | `{ code, discount, discount_pula, capped, total }` | CUSTOMER | 422 with `{ error }` for a refused code, and the order route's own errors for a line that cannot be priced |
| `/api/promo-codes` | GET | none | codes with `paid_uses` | FINANCE_ADMIN, SUPER_ADMIN | 403 |
| `/api/promo-codes` | POST | all promo fields | code | FINANCE_ADMIN, SUPER_ADMIN | 403, 409 duplicate, 422 |
| `/api/promo-codes/[id]` | PATCH | `active?`, `ends_at?`, `usage_limit?` | code | FINANCE_ADMIN, SUPER_ADMIN | 403, 404, 422 |
| `/api/orders` (changed) | POST | adds `terms_accepted`, `promo_code?`, `delivery_instructions?`, `recipient_name?`, `delivery_phone?`, `save_address?`, `address_label?` | order | CUSTOMER | 409 stale promo with `{ reason, promo_discount, total }`, 422 no terms, 422 no phone on a doorstep order |

New pages: `/account/addresses`, `/account/saved`, `/account/settings`, `/terms`, `/admin/promo-codes`. Finance is an allow list and operations a deny list, each kept twice: add `/admin/promo-codes` to `FINANCE_ALLOWED_PREFIXES` and `OPS_DENIED_PREFIXES` in `lib/roles.ts`, and to `FINANCE_ALLOWED` and `OPS_DENIED` in `middleware.ts`. Add `/terms` to the public routes in `middleware.ts`.

**Value sourcing**:

| Action | Value produced or displayed | Source |
|---|---|---|
| Checkout, address picker | recipient, phone, country, town, street | `addresses` row |
| Checkout, currency | charge currency | `Country.buyer_currency` of the picked country, through `ChargeCurrency` (spec 0009) |
| Place order | `terms_accepted_at` | server clock when `terms_accepted` is true |
| Place order | `terms_version` | `TERMS_VERSION` in `lib/terms.ts` |
| Promo quote and place order | priced lines | `buildOrderLines()`, shared by both, with the delivery country taken from the locker when one is chosen |
| Promo quote and place order | booked gross in pula | sum of `toPula(fromPula(priced.line_total, currency), rate)` per line, the same figure `confirmPayment()` books; `rate` is `pulaPerUnit(currency)` |
| Promo quote and place order | margin in pula | booked gross less the sum of `offerLandedCost(...).landed * qty`, for each line's routed offer and its own `isCrossBorder` |
| Promo quote and place order | cap in pula | `min(percent% of booked gross, max_discount, margin)` |
| Promo quote and place order | `promo_discount` | the cap divided by `rate`, rounded down to the cent, never above `subtotal`, less one cent if the next line would pass the cap |
| Promo quote and place order | `promo_discount_pula` | `toPula(promo_discount, rate)`, always derived, never worked out separately |
| Place order | `total` | `subtotal - promo_discount + delivery_fee`, rounded to the cent when written, because payment checks compare it exactly |
| Promo eligibility and the admin list | paid uses | one shared function: orders with this `promo_code` whose `effectiveOrderStatus` is neither `AWAITING_PAYMENT` nor `CANCELLED`, so `REFUNDED` counts. This read is allowed in the order route because it decides nothing about those orders; it stays out of `confirmPayment()` |
| Promo eligibility | used by this buyer | the buyer's orders with this `promo_code` whose effective status is not `CANCELLED` |
| Confirm payment | a leg's `promo_discount` | `promo_discount_pula` shared by leg gross over all the order's suppliers sorted by id, the last taking the remainder, worked out before skipping legs that already exist |
| Confirm payment | `platform_margin` | `gross - cost - leg.promo_discount` |
| Confirm payment | payable `amount` | `supplier_subtotal + platform_margin + leg.promo_discount`, so it equals the undiscounted figure |
| Analytics | margin | existing sum less `promo_discount_pula` for each billable order, with `margin_pct` taken from that |
| Analytics | GMV | `toPula(order.total, order.buyer_fx_rate)`, already net of discount |
| Reorder | a line's price | `priceLine` today, never the order item |
| Reorder | whether a line is available | the product is active and `routeLine` finds an offer with `stock >= qty` |
| Runner's job | `dropoff_name`, `dropoff_phone` | `order.recipient_name` or `customer_name`, and `order.delivery_phone` |
| Saved list | price | current catalogue price through `PriceText` |
| Map link | query | locker name and address from `findCollectionPoint`, or `delivery_city` and `countryNames[...]`, through `encodeURIComponent` |
| Audit | event names | `PROMO_CREATED`, `PROMO_CHANGED`, `PROMO_STALE_REFUSED`, `PROMO_LATE_REUSE`, `MARKETING_CONSENT_ON`, `MARKETING_CONSENT_OFF`, added to `EVENTS` |

**Key invariants**:
- A buyer has at most 10 addresses and exactly one default when they have any, read and written inside one `mutate()`.
- One `(user_id, product_id)` pair in `saved-items`, checked inside `mutate()`.
- `promo-codes.code` is unique, compared in upper case.
- The server's discount is the only discount. No request can set a discount figure.
- `promo_discount_pula` never exceeds the order's margin after customs at placing, and `total` never falls below `delivery_fee`.
- `promo_discount_pula` is always `toPula(promo_discount, rate)`.
- A leg's discount shares sum exactly to `promo_discount_pula`.
- Orders from a chosen quote (spec 0004) take no promo code.

**Security model**:
- Compliance scope: Botswana's Data Protection Act 2018, and any buyer in the other launch countries under `docs/compliance/`.
- Buyers read and write only their own addresses, saved items and alert settings. Every route resolves the owner from the session, never from the request.
- Staff see an address only as the copy on an order. There is no staff view of the address book.
- Suppliers never see delivery instructions, recipient phone or promo details.
- Marketing is opt in, timestamped and audited. Promo code changes and refusals of a stale code at order time are audited.
- `/api/promo-codes/quote` requires sign in and gives the same answer for an unknown and a switched off code, so codes cannot be probed by message. Use a long enough code for anything valuable.
- A buyer deleting an address removes it, and past orders keep only what fulfilment needed.

**Configuration required**: none. The map link needs no key.

**Critical test scenarios**:
- Happy path: pick a saved Maseru address on a Gaborone header, the currency moves to rand, instructions and terms given, code applied, order total matches what the card is asked for, verifies **AC-3**, **AC-7**, **AC-21**, **AC-24**.
- Margin floor: a 90% code on a low margin item is capped at the margin, and a zero margin order is refused, verifies **AC-22**.
- Stale code: a code switched off between quote and order gives 409 and no order, verifies **AC-24**.
- Use accounting: an order that expires unpaid gives its use back, and a reopened late payment counts again, verifies **AC-25**.
- Ledger: a two supplier order's shares sum exactly, each payable is unchanged, and margin falls, verifies **AC-26**, **AC-27**.
- Limits: the 11th address and the 201st saved item are refused, and two overlapping default changes leave one default, verifies **AC-1**, **AC-2**, **AC-16**.
- Reorder: a line no longer sold is skipped and named, and today's price is used, verifies **AC-11**, **AC-12**.
- Auth: another buyer's address returns 403, operations on promo codes returns 403, an order with no terms returns 422, verifies **AC-1**, **AC-8**, **AC-20**.
- Privacy: a doorstep map link contains no street, verifies **AC-13**.

## Build plan

Ordered as tracer bullets, one thin thread through every layer at a time, with money last.

**Slice 1: addresses and the review step**
1. [x] Add the `addresses` collection, the new order fields and the migration, satisfies **AC-1**, **AC-5**.
2. [x] Build the address routes with the limit and default rules, satisfies **AC-1**, **AC-2**, **AC-6**.
3. [x] Build `/account/addresses` and make the panel link live, satisfies **AC-1**, **AC-6**, **AC-19**.
4. [x] Add the picker and "Save this address" to checkout, with the recipient and phone fields, satisfies **AC-3**, **AC-4**, **AC-5**.
5. [x] Add instructions, the terms checkbox and `lib/terms.ts` to checkout and the order route, and update `scripts/verify.mjs` and the e2e helpers that place orders, satisfies **AC-7**, **AC-8**.
6. [x] Add `/terms`, and show instructions on the order pages and the runner's job, satisfies **AC-9**, **AC-10**.

**Slice 2: account and repeat buying**
7. [x] Build the reorder endpoint and button, satisfies **AC-11**, **AC-12**.
8. [x] Build the map link as a pure function and show it on tracking, satisfies **AC-13**.
9. [x] Add `saved-items`, its routes, the heart and `/account/saved`, satisfies **AC-14**, **AC-15**, **AC-16**, **AC-19**.
10. [x] Add `alert_prefs`, its route and `/account/settings`, satisfies **AC-17**, **AC-18**, **AC-19**.

**Slice 3: promo codes**
11. Extract `buildOrderLines()` from the order route with no change in behaviour, then add `promo-codes`, `lib/promo.mjs` with unit tests at rates other than 1, and the quote endpoint, satisfies **AC-21**, **AC-22**, **AC-23**.
12. Apply the discount in the order route with the stale check, use counting and the once per buyer check inside the order write, satisfies **AC-24**, **AC-25**.
13. Share the discount across legs in `confirmPayment()` and adjust analytics and the order pages, satisfies **AC-26**, **AC-27**.
14. Add the code box to checkout's summary, quoting again when the cart, country or locker changes, and the confirm step for a 409, satisfies **AC-21**, **AC-24**.
15. Build `/admin/promo-codes`, its routes and auditing, allow finance and deny operations in both `lib/roles.ts` and `middleware.ts`, with verify checks that finance gets 200 and operations 403, satisfies **AC-20**, **AC-28**.
16. Seed codes at the cap and limit boundaries, then add verify checks and the e2e journeys, changing `docs/testing/e2e-journeys.md` first, satisfies **AC-29**.

## Consequences

**Positive**:
- The account stops being a placeholder, and repeat buying takes one tap.
- Finance can run a campaign without a developer, and no code can sell below landed cost.
- Marketing consent is on record before the first email goes out.

**Negative / tradeoffs**:
- `terms_accepted` becomes required on `POST /api/orders`, so anything that posts there must change with it, including verify and the e2e journeys.
- A total limit can be passed by the few orders already unpaid when it is reached, and a late reopen can give one buyer a second use. AfriDeal honours both, and the second is audited.
- Counting uses scans orders on each quote. That is fine now and would need an indexed field at real volume.
- `/terms` is a draft. Launching on it needs the client's sign off, which feature 17 owns.
- The payable formula carries the discount back in to stay unchanged. That line goes away with the payable fix below.

**Neutral**:
- A new migration for the three tables runs before deploy, after migration 0005. The new order and user fields need no migration.
- The seed gains a demo address and a demo code for journeys and the client demo.
- Audit logging is mandatory here, not optional: this feature touches personal data and money.

## Follow-up

- [ ] **Assumption, not yet true in code:** suppliers are paid their cost. Today `supplier-payables.amount` equals the full sale price, margin included (for example 611 against a cost of 377), and the earnings page separately shows 12% commission. The owner confirmed on 2026-11-04 that suppliers should get cost, and that this is a separate fix. It needs doing before any real payout, and the payable line in `Value sourcing` simplifies when it lands.
- [ ] **Mini cart:** waits for a recording of Alibaba's cart. The two recordings on file show only a cart icon in the top bar and a Cart tab, so check whether a mini cart exists there at all before building one. Then extend this spec.
- [ ] **Welcome step after sign up:** waits for a recording of what Alibaba shows after sign up. The sign up screens themselves are measured in the benchmark's section 3c.
- [ ] Features 11 and 12 must obey `alert_prefs` when they send anything.
- [ ] Feature 17 replaces the draft `/terms` and bumps `TERMS_VERSION`.
- [ ] Feature 14 decides how a partial refund treats a discounted order, and what a refund does to a leg's recorded margin. A full refund already uses the discounted total.
- [ ] Orders from chosen quotes (spec 0004) record no terms acceptance yet. Decide when that spec's build runs.
