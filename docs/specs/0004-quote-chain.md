# 0004. Quote chain: supplier answers to a paid order

**Date**: 2026-10-08
**Status**: Proposed

## Summary

A buyer who needs 100 units or more sends a quotation request. Today that request reaches nobody: suppliers are notified but no invitation is saved, the supplier Quote inbox shows samples, the team has no screen to compare answers, and the buyer has no way to accept a price. This spec closes the chain. Invited suppliers answer in their portal. The team sends the buyer one AfriDeal price (the supplier price plus the Wholesale Plus markup, plus a delivery charge the team sets). The buyer accepts it, declines it, or asks for a new price, and accepting creates an order that is paid exactly like a checkout order (spec 0003).

## Context

Scope feature 24 ("Chosen quote becomes an order"), widened to milestone M4: suppliers answering, and a chosen quote becoming an order. Workflow tier GA: the chain ends in a card or bank payment, and it moves buyer personal data (name, delivery address) under Botswana's Data Protection Act 2018.

What exists on `main` (2026-10-08):

- `POST /api/rfqs` saves the request and **notifies** each verified supplier who lists the product, but writes no `RfqResponse` row. `GET /api/rfqs` shows a supplier only the requests they have a row on, so an invited supplier never sees one. This is the first break in the chain.
- `PATCH /api/rfqs/[id]` already accepts a supplier answer (`RESPOND`) and a team pick (`SELECT_RESPONSE`). No screen calls either.
- The supplier Quote inbox (`app/(supplier)/_lib/quotes.ts`) shows order confirmations plus two invented rows marked `kind: 'RFQ'`.
- The team console has no page for these requests. `/admin/sourcing` is the runner request queue, a different flow.
- The buyer has no page that lists their quotation requests. `/requests` is runner requests.
- `GET /api/rfqs` returns every request, with every supplier price, to any role that is neither customer nor supplier. That includes `RUNNER`. A supplier also receives the buyer's name.

Forces:

- **Payment is not ours to reinvent.** Spec 0003 makes `confirmPayment()` the only way an order becomes paid and raises supplier legs and payables. A quote order must enter that seam, not run beside it. 0003 is built on `feat/order-payment-states` and is not merged yet, so this spec builds on top of it.
- **The price ladder stops at 99 units.** `lib/pricing-model.ts` publishes four rungs, and 100+ reads "by quotation" with no markup. A quote needs a rule, or every price is a judgement call made under time pressure.
- **Flat delivery does not fit volume.** BWP 45 per delivery suits a parcel, not 800 bags of cement.
- **One writer per collection.** `mutate()` locks one collection at a time, so "accept the quote and create the order" spans `quotes`, `orders`, `order-items` and `rfqs` and cannot be one transaction. It has to be recoverable by write order, the same way 0003 handles confirmation.

## Requirements

**User stories**:
- As a supplier, I want to see the quotation requests I am invited to and answer them in my portal, so that I can win volume orders.
- As an operations admin, I want to compare supplier answers, invite more suppliers, and send the buyer one price, so that AfriDeal stays the merchant of record and supplier prices stay private.
- As a buyer, I want to see my requests and the price AfriDeal offers, then accept it, decline it, or ask for a better one, so that I can buy volume without phoning anyone.
- As a buyer who accepts, I want to pay the way I pay at checkout, so that a quoted order is no different once agreed.
- As the supplier who won, I want the paid order to arrive already confirmed at my quoted price, so that I can start preparing at once.

**Acceptance criteria**:
- **AC-1**: Sending a request writes one `PENDING` invitation per verified supplier with an active offer for the product. Each invited supplier sees it in their Quote inbox. The inbox shows no sample rows.
- **AC-2**: A supplier sees only requests they are invited to. They see the product, quantity, delivery town, required date and notes, but never the buyer's name or another supplier's answer. They can answer (unit price, quantity, lead time, minimum order, days valid) or pass. They can change an answer until a quote built on it is sent, and again after the buyer asks for a new price.
- **AC-3**: Operations and super admins see every request with every answer and supplier name. They can invite any other verified supplier, who then sees it as in AC-1.
- **AC-4**: The team sends a quote from one answer that is submitted and has at least 24 hours of validity left, adding a delivery charge. The server computes `unit_price = ceil(supplier unit price × 1.22)` in whole thebe arithmetic, `subtotal = unit_price × quantity` and `total = subtotal + delivery charge`, from the supplier price it reads inside the send lock. `valid_until` is the answer's own `valid_until`. A price sent by the browser is ignored. Sending is refused when the answer's minimum order is above its quantity.
- **AC-5**: The buyer sees each of their requests with its status, how many suppliers have answered, and for the current quote: quantity (flagged when it differs from what they asked for), unit price, delivery charge, total, lead time, and valid until. They never see the supplier's price or name.
- **AC-6**: Accepting a quote takes a delivery address in the request's town and a payment method. It creates exactly one order in `AWAITING_PAYMENT`, priced at the quote and linked to it, then shows the same payment step as checkout. A second accept (double click or retry) returns the same order and the same started payment, and sends no second notification. Accept is refused, before anything is written, when the quote is past `valid_until` or not `SENT`, when the town differs, or while checkout is paused.
- **AC-7**: When that order's payment confirms, the supplier who quoted gets one supplier order already `CONFIRMED` at their quoted price (no supplier reselection), one payable worked out as for checkout orders, and a "Quote accepted and paid, start preparing" notification. The request reads "Ordered".
- **AC-8**: The buyer can decline with a reason (price, lead time, quantity, other) and an optional note. The request closes as `DECLINED`, and the team sees the reason. A team decline on a request with a sent quote also declines that quote.
- **AC-9**: The buyer can ask for a new price with a reason. The quote is marked `REQUOTE_REQUESTED`, the request returns to `SOURCING`, every answer that is not `DECLINED` becomes editable again, and those suppliers are told they may update it. A request allows two new prices at most. A third ask is refused with 409, and the button is hidden.
- **AC-10**: A `SENT` quote past `valid_until` reads as expired on every surface and cannot be accepted, and its request reads `EXPIRED`. `valid_until` gates accepting only: it never cancels an order that was already placed from the quote.
- **AC-11**: If an order placed from a quote is cancelled for any reason (expired unpaid under 0003 AC-5, or cancelled by the buyer or the team), the request reads `QUOTED` again while the quote is still valid, and the buyer can accept again, which creates a new order. Once the quote's validity has passed, it reads `EXPIRED`. Accepting again cancels any earlier order from that quote (reason `STAFF`), so a late payment on it is refused and flagged by 0003 rather than paying for the goods twice.
- **AC-12**: Role rules hold on every endpoint, as listed in the Security model: super admin and operations have full access, finance can read, runners get 403, suppliers not invited and buyers of other requests get 404. A runner can no longer list requests.
- **AC-13**: Every invitation, answer, pass, sent quote, accept, decline and requote is written to the audit log with its actor. The notifications in *Notifications* are sent.
- **AC-14**: `npm run verify` covers invite, answer, pass, send, accept, double accept, decline, the requote limit, expiry, the town check and the role denials. A new e2e journey records supplier answer, team quote, buyer accept and pay, and the supplier seeing the confirmed order.

## Options considered

### Option 1: Extend the RFQ flow in place, with a `quotes` table, and enter checkout's payment seam

Keep `rfqs` and `rfq-responses`, write invitations at intake, add a `quotes` collection for prices sent to the buyer, and on accept build an ordinary order that 0003's `confirmPayment()` settles.

**Pros**: reuses the RFQ API that already exists and 0003's single payment seam. A quote's history and the requote limit come straight from rows. No new infrastructure.

**Cons**: `confirmPayment()` learns one special case (quote orders keep their supplier and start confirmed). Accepting spans four collections, so it needs a recoverable write order.

### Option 2: Turn an accepted quote into a cart and send the buyer through checkout

On accept, put the product into the buyer's cart at a locked quote price and let checkout do the rest.

**Pros**: no new order creation code; the buyer sees a familiar screen.

**Cons**: the cart and checkout price from the ladder and choose the supplier themselves. Teaching them a "locked price, fixed supplier, custom delivery" line touches the busiest path in the app for a rare case. The buyer could also edit the quantity or add other items, which breaks the quote.

### Option 3: Merge quotation requests into runner requests

Treat a volume request like a runner request, which already has a quote and accept step for the buyer.

**Pros**: one request flow for the buyer and the team.

**Cons**: runner requests price an item a runner finds outside the catalogue, with no supplier invitations, supplier answers or supplier payables. Folding supplier sourcing into them blurs two money models, and spec §21 keeps them apart on purpose.

## Decision

**Chosen option**: Option 1: extend the RFQ flow in place, with a `quotes` table, and enter checkout's payment seam.

Invitations are written at intake. Suppliers answer in the portal, the team sends a server priced quote, and accepting creates a normal `AWAITING_PAYMENT` order that `confirmPayment()` settles, with the quoting supplier's leg raised already confirmed.

## Rationale

The forces that decide it are the payment seam and the size of the team. Spec 0003 exists so that "when is this order paid" has one answer. Option 2 keeps that seam but bends checkout pricing and supplier selection around a rare order type, and leaves the quote editable after agreement. Option 3 mixes supplier sourcing into a flow built for runners. Option 1 adds one table and one narrow branch in `confirmPayment()`, and the quote stays a fixed agreement from send to payment.

Pricing by rule rather than by hand follows the product owner's answer that quotes follow the tier ladder. A quote is past the last rung, so it takes the deepest published markup (Wholesale Plus, 22%). A 100 unit buyer then never pays more per unit than a 99 unit buyer would, and there is no new margin to agree with finance. The delivery charge is the one figure the team types, because no rule fits both a parcel and a truck.

Accepting is written claim first, like 0003's confirmation: every check runs, then the quote flips under its own lock and reserves the order id together with the address and method it was accepted with, then the order is written. A crash leaves an accepted quote with no order, and the next accept finishes it from the stored inputs rather than creating a second.

Stored statuses only move forward, and anything time based is worked out when read (as 0003 does for payment expiry). Expiry and the return to `QUOTED` after a cancelled order are never written. That keeps a three table revert out of the write path, which is where a document store with per collection locks is weakest.

## Feature design

**Data model sketch** (confirmed with the product owner 2026-10-08). Every table is the usual `{ id, seq, data jsonb }` document table in the `afrideal` schema.

| Entity | Key | Fields | Relationships |
|---|---|---|---|
| `Rfq` (exists, `rfqs`) | `id` `rfq001` | Stored status: `SUBMITTED`, `SOURCING`, `QUOTED`, `ACCEPTED` (shown to the buyer as "Ordered"), `DECLINED`. `EXPIRED` stays in the type but is only ever derived on read. New: `current_quote_id` (nullable) | 1 to many `RfqResponse`; 1 to many `Quote` (3 at most); orders reached through the current quote |
| `RfqResponse` (exists, `rfq-responses`) | `id` `rr001` | Now written as `PENDING` at invitation. New: `invited_by` (`AUTO` or a staff user id), `invited_at`. Status gains `DECLINED` (supplier passes). `unit_price` stays confidential | many to 1 `Rfq`; many to 1 `Supplier` |
| `Quote` (new, `quotes`) | `id` `qt001` | `rfq_id`, `response_id`, `supplier_id`, `product_id`, `variant_id`, `quantity`, `supplier_unit_price` (staff only), `unit_price`, `delivery_fee`, `subtotal`, `total`, `lead_time_days`, `valid_until`, `status` stored as `SENT`, `ACCEPTED`, `DECLINED` or `REQUOTE_REQUESTED` (expired is derived, never stored), `sent_at`, `sent_by`, `responded_at` (nullable), `reason` (`PRICE`, `LEAD_TIME`, `QUANTITY`, `OTHER`, nullable), `note` (nullable), `order_id` (nullable: the current order, replaced when the buyer accepts again), `accepted_with` (nullable: `{ payment_method, delivery_address, delivery_city }`, written at claim) | many to 1 `Rfq`; many to 1 `RfqResponse`; 0..1 `Order` |
| `Order` (exists, as 0003 shapes it) | `id` `o001` | New: `rfq_id`, `quote_id` (both nullable; null for checkout orders) | 0..1 `Quote` |
| `SupplierOrder`, `SupplierPayable` (exist) | | unchanged; raised by `confirmPayment()` | |

The id prefix `qt` is free: `nextIds()` scans by prefix and no other series starts with `q`.

A `PENDING` invitation row carries placeholders until answered: `quantity` = the requested quantity, `unit_price` 0, `lead_time_days` 0, `minimum_order_quantity` 1, `shipping_terms` empty, `valid_until` = `invited_at` + 48 hours (the inbox's existing response window). Nothing reads a `PENDING` row's price.

**State transitions**:

```
Rfq (stored, forward only)
SUBMITTED --first supplier answer--> SOURCING --team sends quote--> QUOTED
QUOTED --buyer accepts--> ACCEPTED
QUOTED --buyer or team declines--> DECLINED
QUOTED --buyer asks for a new price (fewer than 2 used)--> SOURCING
SUBMITTED | SOURCING --team declines (SET_STATUS)--> DECLINED

Quote (stored, forward only)
SENT --> ACCEPTED | DECLINED | REQUOTE_REQUESTED
ACCEPTED --buyer accepts again after a cancelled order--> ACCEPTED (new order_id)

RfqResponse
PENDING --answer--> SUBMITTED --answer again--> SUBMITTED
PENDING | SUBMITTED --pass--> DECLINED
SUBMITTED --team sends a quote on it--> SELECTED
on buyer accept: every other SUBMITTED answer --> REJECTED
on requote: every SELECTED or REJECTED answer --> SUBMITTED (editable again)
```

**Displayed status, derived on read** (`quoteAsDisplayed()`, `rfqAsDisplayed()` in `lib/quotes.ts`; every surface and report uses these, never the stored value alone). Let *order* be the current quote's order, read through 0003's displayed status.

| Stored quote | Order | Valid until passed | Quote shows | Request shows |
|---|---|---|---|---|
| `SENT` | none | no | Sent | `QUOTED` |
| `SENT` | none | yes | Expired | `EXPIRED` |
| `ACCEPTED` | live (awaiting payment or later, not cancelled) | either | Accepted | `ACCEPTED` ("Ordered") |
| `ACCEPTED` | missing (crash after claim) or cancelled | no | Sent (can accept again) | `QUOTED` |
| `ACCEPTED` | missing or cancelled | yes | Expired | `EXPIRED` |
| `DECLINED` | | | Declined | `DECLINED` |
| `REQUOTE_REQUESTED` | | | New price asked | `SOURCING` until the next quote |

The request's stored status is used only when it has no current quote. An `ACCEPTED` quote whose order row is missing (a crash between claim and insert) reads as acceptable, so the buyer's next accept finishes the order from `accepted_with`. Nothing is written by a read and there is no background job.

**API surface** (all JSON through `guard()`; errors as `{ error }`):

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/api/rfqs` | POST | unchanged | `{ rfq, invited }`; now also writes `PENDING` invitations | signed in | 404 product gone, 422 |
| `/api/rfqs` | GET | `status?` | list, scoped by role (see Security model) | customer, invited supplier, ops, super admin, finance (read) | 403 runner |
| `/api/rfqs/[id]` | GET | | the request, scoped by role; the buyer gets `quote` (buyer fields only) and `requotes_left` | as above | 404 not visible to caller |
| `/api/rfqs/[id]` | PATCH `RESPOND` | `unit_price`, `quantity`, `lead_time_days`, `minimum_order_quantity`, `shipping_terms?`, `notes?`, `valid_days?` (1 to 120, default 14) | the answer | invited supplier | 404 not invited, 409 answer locked under a sent or accepted quote, 409 request closed |
| `/api/rfqs/[id]` | PATCH `PASS` | `note?` | the answer, `DECLINED` | invited supplier | 404, 409 closed |
| `/api/rfqs/[id]` | PATCH `INVITE` | `supplier_id` | the new `PENDING` answer | ops, super admin | 404 supplier, 409 already invited, 422 not verified |
| `/api/rfqs/[id]` | PATCH `SEND_QUOTE` (replaces `SELECT_RESPONSE`) | `response_id`, `delivery_fee` (BWP, 0 or more, 2 decimals at most) | the quote | ops, super admin | 409 a quote is already `SENT`, 409 three quotes used, 409 answer not `SUBMITTED` or under 24 hours of validity left, 422 minimum order above quantity, 409 request closed |
| `/api/rfqs/[id]` | PATCH `SET_STATUS` | unchanged, but only `DECLINED` is allowed now (other statuses are driven by the actions above); a `SENT` quote is declined with it | the request | ops, super admin | 409 from `ACCEPTED` |
| `/api/rfqs/[id]` | PATCH `ACCEPT_QUOTE` | `quote_id`, `payment_method`, `delivery_address`, `delivery_city` | `{ order, payment }`, the same shape `POST /api/orders` returns | the request's buyer | 409 not `SENT`, 410 expired, 422 town differs, 503 checkout paused |
| `/api/rfqs/[id]` | PATCH `DECLINE_QUOTE` | `quote_id`, `reason`, `note?` | the request | the request's buyer | 409 not `SENT` |
| `/api/rfqs/[id]` | PATCH `REQUEST_REQUOTE` | `quote_id`, `reason`, `note?` | the request | the request's buyer | 409 not `SENT`, 409 limit reached |

The accept write order (recoverable, like 0003's confirmation):

```
0. check   Before any write: the caller owns the request; the quote is the current one;
           checkout is not paused; the product and variant still exist; the address
           passes checkout's validation; delivery_city matches the request's town.
           Any failure returns its error with nothing written.
1. claim   mutate('quotes'), re-reading the quote inside the lock:
           a. SENT and valid: set ACCEPTED, reserve an order id with nextId('orders'),
              write order_id and accepted_with. This call won.
           b. ACCEPTED and its order is live: return that order (double click, retry).
           c. ACCEPTED and its order row is missing: keep order_id and accepted_with;
              go on to step 2 with the stored inputs (finishing a crashed accept).
           d. ACCEPTED and its order is cancelled, quote still valid: remember the old
              order id, reserve a new one, write order_id and the new accepted_with.
           e. Anything else (expired, declined, requote asked): refuse, 409 or 410.
2. order   insert the Order and its one OrderItem under that id, from accepted_with.
           insert() refuses an existing id: if the order is already there, skip.
3. old     Case d only: inside mutate('orders'), set the old order's cancel_reason to
           STAFF (it is already CANCELLED, or is written CANCELLED now if its expiry was
           only derived), with a timeline entry "Replaced by <new reference>". 0003 then
           refuses a late payment on it and flags it for finance.
4. request mutate('rfqs'): status ACCEPTED, current_quote_id. Other SUBMITTED
           answers -> REJECTED; "Not selected this time" to their suppliers.
5. payment Reuse the order's STARTED payment if one exists (as
           /api/orders/[id]/payments does); otherwise startPayment() as checkout does.
6. after   audit() and notify() only when this call won the claim (case a or d),
           so a retry or double click sends nothing twice.
```

Sending a quote has the same shape: inside `mutate('quotes')` the server checks there is no `SENT` quote and fewer than three quotes, re-reads the answer, requires it `SUBMITTED` with at least 24 hours of validity left and `minimum_order_quantity <= quantity`, and copies its price into `supplier_unit_price`. Only then is the answer marked `SELECTED` and the request `QUOTED`. The answer lock (a supplier cannot edit a `SELECTED` answer) is a courtesy: the quote's own `supplier_unit_price` is what every later step reads, so a supplier edit after sending can never change a price.

`confirmPayment()` change (in `lib/payments/confirm.ts`): when `order.quote_id` is set, `raiseSupplierLegs()` uses each item's `supplier_id` as written, never `resolveSupplier()` (the supplier keeps the order even if their verification has lapsed since; the team can still cancel), writes the leg as `CONFIRMED` instead of `AWAITING_CONFIRMATION`, sets `auto_selected: false` and `selection_reason: "Quoted by supplier, accepted by buyer"`, and works out `supplier_subtotal`, `platform_margin` and the payable exactly as for a checkout leg (so the open question on what a supplier invoice should show applies to both alike). `announce()` sends the quoting supplier "Quote accepted and paid, start preparing" instead of the "confirm within 24 hours" text. Everything else in 0003 holds: the claim, the replay rules, and late confirmation.

**Value sourcing**:

| Action | Value | Source |
|---|---|---|
| Invite at intake | who is invited | `supplier-offers` where `product_id` matches and `active`, joined to `suppliers` where `status = 'VERIFIED'` |
| Invite at intake | answer by | `invited_at` + 48 hours (`RESPONSE_WINDOW_HOURS` in `app/(supplier)/_lib/quotes.ts`, moved to a shared module) |
| Supplier answer | `valid_until` | now + `valid_days` (input, default 14) |
| Send quote | `unit_price` | the Wholesale Plus markup from `LADDER` in `lib/pricing-model.ts`, worked in whole thebe so float error cannot add a Pula: `ceil(round(price × 100) × 122 / 10000)`. `priceAtRung()` is changed to the same integer form, so the ladder and quotes agree |
| Send quote | `quantity`, `lead_time_days`, `supplier_id`, `supplier_unit_price` | the chosen `RfqResponse` |
| Send quote | `delivery_fee` | input from the team |
| Send quote | `subtotal`, `total` | `unit_price × quantity`; `subtotal + delivery_fee` |
| Send quote | `valid_until` | the chosen response's `valid_until` |
| Send quote | `variant_id` | `rfq.variant_id`; when null, `product.variants[0]` as the catalogue returns it |
| Buyer view | quantity differs flag | `quote.quantity !== rfq.requested_quantity` |
| Buyer view | answers received | count of this request's answers in `SUBMITTED` or `SELECTED` (placeholder `PENDING` rows never count, here or in best lead time, the inbox, or the team comparison) |
| Buyer view | `requotes_left` | 2 − the count of this request's quotes in `REQUOTE_REQUESTED` |
| Accept | delivery address prefill | the buyer's most recent order `delivery_address` and `delivery_city`, else empty |
| Accept | town check | `delivery_city` and `rfq.delivery_location` compared trimmed and case insensitive |
| Accept | order `subtotal`, `delivery_fee`, `total` | the quote |
| Accept | order `customer_id`, `customer_name` | the signed in buyer (`guard()` actor) |
| Accept | order `delivery_address`, `delivery_city`, `payment_method` | `quote.accepted_with` (written at claim) |
| Accept | order `timeline`, `internal_notes` | one entry "Placed from quote <rfq reference>" with status `AWAITING_PAYMENT`; notes carry the request reference |
| Accept | order `rfq_id`, `quote_id` | the request and quote |
| Accept | order item `id` | `nextIds('order-items', 'oi', 1)` |
| Accept | order item `qty`, `unit_price`, `line_total` | `quote.quantity`, `quote.unit_price`, `quote.subtotal` |
| Accept | order item `product_name`, `variant_label`, `emoji` | the catalogue (`products`, variant) at accept time |
| Accept | item `supplier_id`, `supplier_cost` | `quote.supplier_id`, `quote.supplier_unit_price` |
| Accept | `payment_expires_at` | `paymentExpiresAt(placed_at, payment_method)` from 0003 |
| Accept | order `reference` | derived from the id, as for every order |
| Runner job | payout | `order.delivery_fee` (each delivery pays its full fee, 2026-10-07); a quote order has one supplier, so one job |

**Key invariants**:
- At most one `SENT` quote per request, and at most three quotes per request. Checked inside `mutate('quotes')`.
- Buyer prices are computed on the server only; the browser never sends `unit_price`, `subtotal` or `total`.
- `quote.unit_price >= quote.supplier_unit_price` always holds (it is 22% above, rounded up).
- An accepted quote has at most one live order. The accept write order makes a retry finish that order rather than create another, and accepting again retires the old order so it can never be paid.
- A quote order's supplier and supplier price never change after the quote is sent; `quote.supplier_unit_price` is the only source for them.
- Stored quote and request statuses only move forward; expiry and the return to `QUOTED` are derived on read.
- A supplier answer under a `SENT` or `ACCEPTED` quote cannot be edited (a courtesy lock, see above).

**Security model**:
- **Buyer** (`CUSTOMER`): reads and acts only on requests where `customer_id` is theirs; another buyer's request returns 404. Quote fields returned to a buyer are an allowlist: `id`, `quantity`, `unit_price`, `delivery_fee`, `subtotal`, `total`, `lead_time_days`, `valid_until`, `status`. Never `supplier_id`, `supplier_unit_price` or `response_id`.
- **Supplier** (`SUPPLIER_OWNER`): sees only requests with an invitation row for their `supplierId`; others return 404. Request fields returned to a supplier are an allowlist without `customer_id`, `customer_name` or `target_price`. They see only their own answer.
- **Operations admin, super admin**: everything; the only roles that invite, send quotes or decline a request.
- **Finance admin**: read only (list and detail, with supplier prices), for payables context; 403 on every action.
- **Runner**: 403 on every endpoint here (today it can list every request with supplier prices).
- Any role added later is denied until it is listed here; the check is an allowlist of roles, not "everyone who is not a customer or supplier".
- The request's free text `notes` reach invited suppliers. The request form tells the buyer not to type contact details there.
- Compliance: buyer name and address are personal data under the DPA 2018. They go to no supplier until payment, when the supplier order carries the delivery details exactly as for checkout orders. Every transition is audited (AC-13).

**Notifications** (in app, through `notify()`):
- Supplier: invited; buyer asked for a new price; their quote was accepted and paid (the 0003 leg notification). Suppliers who were not chosen get "Not selected this time" when the buyer accepts.
- Team (ops, super admin): a supplier answered or passed; the buyer accepted, declined (with reason) or asked for a new price.
- Buyer: a quote is ready; their order is awaiting payment (as checkout).

**Screens** (requirements; layout follows the benchmark rules in `docs/design/alibaba-benchmark.md`):
- Buyer `/quotes` (list) and `/quotes/[id]` (detail), linked from the account sidebar beside Orders and Runner requests. The detail shows the progress, the quote, the quantity notice, and Accept, Decline and Ask for a new price (hidden at the limit). Accept opens the address and payment step, then checkout's payment screen. After a successful send, `RfqModal` links to the new request.
- Supplier `/supplier/quotes`: real invitations beside order confirmations, each with Answer and Pass and a countdown. The synthetic rows are removed.
- Team `/admin/quotes` (list with status filters) and `/admin/quotes/[id]`: answers side by side (supplier, price, quantity, minimum, lead time, valid until), Invite supplier, Send quote with a delivery charge field and the computed buyer price shown before sending, the buyer's reasons, and a link to the order. Add it to the console navigation.

**Critical test scenarios**:
- Happy path: Kefilwe requests 240 uniform sets; two suppliers are invited; one answers 129 per unit; the team sends a quote with delivery 450 (unit 158, total 38,370); Kefilwe accepts in Gaborone with mock card; payment confirms; the supplier's leg is `CONFIRMED` at 129, verifies **AC-1**, **AC-2**, **AC-4**, **AC-5**, **AC-6**, **AC-7**
- Double accept: two concurrent accepts return the same order id, and one order exists, verifies **AC-6**
- Crash between claim and order: a quote `ACCEPTED` with an `order_id` but no order row reads as acceptable; the next accept creates the order from `accepted_with`, verifies **AC-6**
- Accept again after a cancelled order: a new order is created, the old one carries `cancel_reason` `STAFF`, and a mock confirmation on the old one is refused and flagged, verifies **AC-11**
- Double accept sends one notification and one started payment, verifies **AC-6**
- Rounding: supplier prices 100, 129 and 0.05 price to 122, 158 and 1 Pula, verifies **AC-4**
- Requote limit: two requotes succeed, the third returns 409, verifies **AC-9**
- Expiry: a quote past `valid_until` reads expired and accept returns 410; an expired unpaid order returns the request to `QUOTED`, verifies **AC-10**, **AC-11**
- Town mismatch: accept with Francistown on a Gaborone quote returns 422, verifies **AC-6**
- Permission: a runner gets 403 on `GET /api/rfqs`; a supplier not invited gets 404 on the detail; a buyer never receives `supplier_unit_price`, verifies **AC-12**, **AC-5**

## Build plan

Tracer Bullet: the first slice proves one real request reaching a paid, confirmed supplier order through every layer, with plain screens. Later slices thicken the branches. Spec 0003 must be merged first.

1. Prerequisite: merge `feat/order-payment-states` (spec 0003) to `main` and branch from there. Satisfies **AC-6**, **AC-7** (the seam they rely on)
2. Migration and types: the `quotes` table in `lib/postgres/schema.ts` (`npm run db:generate`, commit the file under `drizzle/`); `Quote` and the new fields in `types/procurement.ts` and `types/index.ts`; `quotes` routed in `lib/db.ts`; seed `data/quotes.json` (rfq001 gets a `SENT` quote from rr001, with `valid_until` relative to seed time) and fix the seed's answer statuses to match. Satisfies **AC-4**, **AC-5**
3. Thread, server: write `PENDING` invitations in `POST /api/rfqs`; role scoped allowlists and the runner 403 on both GETs; `SEND_QUOTE` with server pricing in a new `lib/quotes.ts` (`priceQuote()`, `quoteAsDisplayed()`, `rfqAsDisplayed()`, `acceptQuote()` with the claim write order); `ACCEPT_QUOTE` calling `startPayment()`; the `confirmPayment()` branch for quote orders. Satisfies **AC-1**, **AC-4**, **AC-6**, **AC-7**, **AC-12**
4. Thread, screens: supplier inbox from real invitations with Answer (samples removed); `/admin/quotes` list and detail with Send quote; buyer `/quotes` and `/quotes/[id]` with Accept leading into checkout's payment step. Satisfies **AC-1**, **AC-2**, **AC-3**, **AC-5**, **AC-6**
5. Thread, proof: `npm run verify` checks for invite, answer, send, accept, double accept and confirm through the mock provider. Satisfies **AC-14**
6. Thicken, supplier and team: `PASS`, `INVITE`, answer locking, `SET_STATUS` limited to `DECLINED`. Satisfies **AC-2**, **AC-3**
7. Thicken, buyer: `DECLINE_QUOTE`, `REQUEST_REQUOTE` with the limit, the quantity notice, and the town check. Satisfies **AC-8**, **AC-9**, **AC-6**
8. Thicken, time: read time expiry of quotes and requests, and the return to `QUOTED` after an unpaid order expires. Satisfies **AC-10**, **AC-11**
9. Audit events and notifications for every transition (`EVENTS` in `lib/notifications.ts`). Satisfies **AC-13**
10. Verify and e2e: extend `scripts/verify.mjs` for every branch in AC-14; add the journey to `docs/testing/e2e-journeys.md` first, then its spec under `e2e/`; drop the "quote inbox samples" item from the walkthrough's known list. Satisfies **AC-14**

## Consequences

**Positive**:
- The quotation door on every product page now leads somewhere: a real request can become a paid order without anyone phoning a supplier.
- Quote orders pay, raise legs and pay runners through the same code as checkout orders, so 0003's tests protect them too.
- Two leaks close: runners no longer read supplier prices, and suppliers no longer see buyer names.

**Negative / tradeoffs**:
- A fixed 22% leaves the team no room to sharpen a price to win a large order. Changing that is a pricing decision, not a code tweak.
- The team types the delivery charge on every quote, which takes judgement each time. A wrong figure goes straight to the buyer, because the server checks only that it is 0 or more.
- One runner job carries the whole delivery charge for a large load. Truck or pallet deliveries do not fit the runner model and will need their own decision.
- `confirmPayment()` gains a branch that only quote orders take, and a regression there is easy to miss without the verify checks in task 5.
- Status worked out on read means the stored status can differ from what everyone sees (a request stored `QUOTED` shows `EXPIRED`). Every screen, report and verify check must use `quoteAsDisplayed()` and `rfqAsDisplayed()`.
- The whole delivery charge goes to the runner who carries it. A charge of 0 makes a 0 pay job, and AfriDeal earns nothing on delivery for a quote order. The console shows that when the team types 0.

**Neutral**:
- `SELECT_RESPONSE` is removed. No screen calls it today.
- One new table and migration; existing rows need no backfill (the new fields are nullable).
- The build waits on 0003's merge.

## Migration plan

**Strategy**: no live data transform. One additive migration (the `quotes` table); new fields on existing documents are optional.
**Phases**:
1. Deploy the migration and code together after 0003 is on `main`.
2. Reseed the demo data (`npm run seed`) so seed requests carry invitations and a sent quote.
**Rollback**: revert the merge commit; the `quotes` table can stay, since nothing else reads it.
**Risks**: live requests made before this deploy have no invitation rows. The three seed requests are the only ones; reseeding covers them. Any real request found in production gets invitations backfilled by a one off script before launch.

## Follow-up

- [ ] Product owner: decide whether truck or pallet deliveries need a delivery mode other than a runner job (raised by this spec's delivery charge).
- [ ] Product owner: decide whether the team should be allowed to price a quote below 22% (and to what floor). Today's answer is no.
- [ ] After build: update the client walkthrough and the status report, where "Suppliers cannot yet answer a quotation request" is listed as known.
