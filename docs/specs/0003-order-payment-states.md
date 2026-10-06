# 0003. Order payment states

**Date**: 2026-10-05
**Status**: In Progress

## Summary

Today an order is born paid. `POST /api/orders` writes a `PAID` timeline entry, invents a payment reference, and raises supplier orders and supplier invoices in the same request, before any money has moved. This spec makes an order start as `AWAITING_PAYMENT` and makes one function, `confirmPayment()`, the only way it becomes paid. Supplier orders and payables are raised there and nowhere else. Every later money feature, the card gateway, the EFT fallback and refunds, plugs into that one seam instead of inventing its own.

## Context

> ⚠️ Premise note: the design here is ordinary; the risk sits in two places. The first is the migration, because every order already in the database was created under the old model. The second is that the project's write primitive is per collection, not per confirmation, so "mark it paid and raise the supplier legs" is several transactions and not one. Both are addressed below rather than assumed away.

The shipped checkout tells the buyer "Your payment has been processed" at a point where nothing has been processed. `app/api/orders/route.ts` stamps a timeline of `PENDING` then `PAID` at the same timestamp, derives `payment_reference` from `Date.now()`, and writes one `SupplierOrder` and one `SupplierPayable` per supplier in the same request. A supplier can therefore be told to prepare goods, and a payable can enter the finance ledger, for an order nobody has paid for.

Four forces shape the fix. First, the gateway is not here yet: DPO Pay approval is outside our control, so the state model has to be provable without it. Second, Botswana payment reality is not uniform: a card session lives for minutes, while an interbank EFT clears in one to three working days, so a single expiry rule cannot serve both. Third, the project is at GA rigor because it handles card payments and buyer personal data under Botswana's Data Protection Act 2018, so audit logging on money transitions is required rather than optional. Fourth, and least obvious, `lib/db.ts` gives one advisory lock per collection, so a confirmation that spans orders, payments, supplier orders and payables cannot be made atomic by the store and has to be made recoverable by its write order instead.

The cost of not deciding is that features 4, 5, 13 and 14 each invent their own answer to "when is this order paid", and the answer ends up spread across four code paths with no single place to test it.

## Requirements

**User stories**:
- As a buyer, I want my order to show that it is waiting for payment until I have actually paid, so that I am never told money has moved when it has not.
- As a buyer whose card is declined, I want to try again on the same order, so that I do not have to rebuild my basket.
- As a supplier, I want to be asked to prepare goods only for orders that are paid for, so that I am not left holding stock for an abandoned checkout.
- As a finance admin, I want to see orders waiting on a bank transfer and mark one paid with its reference, so that we can trade before the card gateway is approved.
- As a super admin, I want to pause checkout storewide without a deploy, so that we can stop taking money during an incident.

**Acceptance criteria**:
- **AC-1**: A new order is created with status `AWAITING_PAYMENT` and a `payment_expires_at` deadline derived from its payment method.
- **AC-2**: No `SupplierOrder` and no `SupplierPayable` row exists for an order that has never had a `CONFIRMED` payment.
- **AC-3**: Confirming a payment raises exactly one supplier order and one payable per supplier on that order, and moves the order to `PROCESSING`.
- **AC-4**: A second confirmation carrying the same `(provider, provider_reference)` creates no duplicate payment, supplier order or payable. A confirmation that was interrupted part way finishes its remaining work when retried, rather than being treated as already done.
- **AC-5**: An order whose `payment_expires_at` has passed and which has no `CONFIRMED` payment reads as `CANCELLED` on every surface. The cancellation is written to the database the first time a payment path touches that order.
- **AC-6**: A finance admin or super admin can confirm payment with a reference. Operations, suppliers, runners and customers receive 403.
- **AC-7**: A payment confirming for an order that expired still confirms and reopens the order, and the audit log records it as a late confirmation. An order a person cancelled deliberately does not reopen.
- **AC-8**: While checkout is paused, `POST /api/orders` is refused and the storefront says checkout is temporarily unavailable.
- **AC-9**: The supplier chosen at checkout fulfils the order. Selection re-runs at confirmation only when that supplier can no longer fulfil. The customer price written at checkout never changes.
- **AC-10**: A failed payment leaves its order payable: the buyer can start another attempt until the deadline, and the order is not cancelled by the failure.
- **AC-11**: A confirmation whose amount does not match the order total is recorded and flagged for finance rather than silently accepted.
- **AC-12**: `npm run verify` covers the unpaid, confirmed, expired, replayed and failed states. It covers none of them today.

## Options considered

### Option 1: Fix in place, add a status and gate the writes

Add `AWAITING_PAYMENT` to `OrderStatus`, and move the supplier order and payable writes out of the checkout handler into a `confirmPayment()` function that the mock provider, the EFT action and later the real gateway all call.

**Pros**:
- One seam. Every payment path converges on one function, so the invariant is testable in one place.
- No new infrastructure. Reuses `lib/db.ts`, the existing `audit()` and `notify()` helpers.
- Features 4, 13 and 14 become adapters around an existing seam rather than new flows.

**Cons**:
- Touches the busiest write path in the app, so the migration needs care on live data.
- The store cannot make the confirmation atomic, so recoverability has to be designed into the write order rather than delegated.

### Option 2: A separate payment service alongside checkout

Stand up a payments module with its own tables and its own lifecycle, and have checkout publish an event it consumes.

**Pros**:
- Clean separation; payment logic never mixes with cart and pricing logic.
- Easier to reason about if payments later grow their own retry and reconciliation machinery.

**Cons**:
- Needs an event mechanism the project does not have. There is no queue and no background worker today.
- Eventual consistency between an order and its payment, for a single developer, with no operational tooling to debug it at 2am.
- Solves a scale problem this product does not have.

### Option 3: Keep orders paid on creation, add a reconciliation sweep

Leave checkout as it is and add a job that later cancels orders whose money never arrived.

**Pros**:
- Smallest change to existing code.

**Cons**:
- The supplier is still told to prepare goods for unpaid orders, which is the actual harm.
- The ledger still contains payables that are not owed.
- It inverts the safe default: wrong until proven right, rather than unpaid until proven paid.

## Decision

**Chosen option**: Option 1: fix in place, add a status and gate the writes.

An order starts `AWAITING_PAYMENT` with a deadline, and `confirmPayment()` is the only code path that marks it paid and raises supplier orders and payables. Because the store locks one collection at a time, `confirmPayment()` is written as claim then complete, so an interrupted run finishes on retry instead of leaving a paid order with no supplier legs.

## Rationale

Option 2 is the textbook answer and the wrong one here. It needs a queue, a worker and a way to debug a message that did not arrive, and none of those exist in this project. The context that rules it out is team size and operational tooling: one developer, no background infrastructure, a launch date already measured against a 283 feature list. Introducing eventual consistency into the money path for a product doing single digit orders a day buys nothing and costs the ability to reason about a stuck order.

Option 3 fails on the specific harm named in Context. The problem is not that bad orders survive too long; it is that a supplier is instructed to act and a payable enters the ledger before payment exists. A sweep that cleans up afterwards leaves both of those doors open.

Option 1 holds, but not for the reason it first appears to. `mutate()` takes an advisory lock per collection, so it makes each collection's write safe and does nothing for a confirmation that spans five of them. What makes the design sound is the write order in the next section: the payment row is claimed first and the order status flips last, so the order moving to `PROCESSING` is the marker that everything before it finished. A crash leaves a claimed payment and an unfinished order, which the next callback or a manual retry completes. This is why AC-4 is worded as "finishes its remaining work" rather than "does nothing".

The seam also matches what the blocked work needs: when DPO Pay approves, feature 4 adds a signature verifier and a provider adapter and calls the same function the mock already calls.

On the windows: 30 minutes for `DPO_PAY`, `PAYGATE` and `ORANGE_MONEY`, because a hosted card session and a wallet prompt both live in minutes and our deadline should outlive theirs rather than fire first. 7 days for `EFT`, covering a one to three day interbank clear plus a weekend and a public holiday, which is what makes the finance fallback usable rather than nominally present.

## Feature design

**Data model sketch**:

| Entity | Key | Fields | Relationships |
|---|---|---|---|
| `Order` (exists) | `id`, e.g. `o001` | `status` gains `AWAITING_PAYMENT`; new `payment_expires_at` (ISO string); new `cancel_reason` (`EXPIRED`, `CUSTOMER`, `STAFF`, nullable); `payment_reference` becomes nullable | 1 to many to `Payment`, `OrderItem`, `SupplierOrder` |
| `Payment` (new, `payments`) | `id`, e.g. `pmt001` | `order_id`, `provider` (`MOCK`, `DPO_PAY`, `ORANGE_MONEY`, `PAYGATE`, `EFT`), `provider_reference` (nullable while `STARTED`), `status` (`STARTED`, `CONFIRMED`, `FAILED`), `amount`, `amount_matches` (boolean), `created_at`, `confirmed_at` (nullable), `failure_reason` (nullable), `note` (nullable) | many to 1 to `Order` |
| `Setting` (new, `settings`) | `id`, e.g. `checkout_paused` | `value` (json, `{ "paused": boolean }`), `updated_at`, `updated_by` | none |
| `SupplierOrder` (exists) | `id`, e.g. `sup001` | unchanged | many to 1 to `Order`. Creation moves from checkout to confirmation |
| `SupplierPayable` (exists) | `id`, e.g. `pay001` | unchanged | many to 1 to `SupplierOrder`. Creation moves from checkout to confirmation |

`PaymentMethod` gains `EFT`, shown at checkout as "Bank transfer". It is a real method a buyer picks, not an internal marker, and the pilot depends on it existing.

The id prefix is `pmt`, not `pay`: `pay` is already the supplier payables series and `nextIds()` scans by prefix, so reusing it would collide.

**Constraints on a document store.** Every table is `{ id, seq, data jsonb }`, so these are not column constraints:
- Uniqueness of `(provider, provider_reference)` is a partial unique expression index over `(data->>'provider', data->>'provider_reference')` where `data->>'provider_reference' is not null`.
- A violation reaches the application as Postgres error `23505` thrown out of `mutate()`. `withRetry` does not treat it as transient, so `confirmPayment()` catches `23505` on the claim and routes it to the replay path.
- `payment_expires_at` is validated in application code, not by a not null column, because the backfill and the jsonb shape make a database level constraint more trouble than it is worth here.

**The confirmation write order** (this is the heart of the spec):

```
1. claim    mutate('payments'): insert or flip this payment to CONFIRMED.
            Returns whether THIS call won the claim.
            A 23505 here means another call already claimed it: go to step 2 anyway.
2. legs     For each supplier on the order, upsert a SupplierOrder keyed by
            (order_id, supplier_id), then a SupplierPayable keyed by
            (supplier_order_id). Both are idempotent: an existing row is left alone.
3. finish   mutate('orders'): set status PROCESSING, payment_reference,
            clear cancel_reason. This write is the completion marker.
4. after    audit() and notify(). Never before step 3.
```

A retry whose payment is already `CONFIRMED` but whose order is not yet `PROCESSING` re-runs steps 2 to 4. That is the recovery path, and it is why AC-4 says "finishes its remaining work".

**State transitions**:

```
AWAITING_PAYMENT --confirmPayment()--> PROCESSING --> IN_TRANSIT --> DELIVERED
       |                                    |
       | deadline passes                    +--> DISPUTED
       v
   CANCELLED (cancel_reason EXPIRED) --confirmPayment() (late)--> PROCESSING
   CANCELLED (cancel_reason CUSTOMER or STAFF) --confirmPayment()--> refused, flagged
```

A payment moves `STARTED` to `CONFIRMED` or `STARTED` to `FAILED`. `FAILED` is not terminal for the order: the buyer may start another attempt until the deadline. `CONFIRMED` to `FAILED` is refused; an out of order provider notification is logged and ignored.

**Expiry is computed, then persisted once.** An order is effectively expired when `now >= payment_expires_at`, it is `AWAITING_PAYMENT`, and it has no `CONFIRMED` payment. One shared helper, `effectiveOrderStatus(order)`, is the single place that decides, and every read surface uses it: the order APIs, `getOrderDetail`, the store and admin order pages, the dashboard, analytics, disputes, payables and runner pages. Reads never write. The cancellation is persisted, with `cancel_reason: 'EXPIRED'` and a timeline entry, the first time a payment path touches that order: a confirmation, a mark as paid, or a retry. This removes write on GET, the question of which of roughly sixteen read paths triggers it, and the race between two concurrent readers.

**Analytics must exclude unpaid orders.** `billable = status !== 'CANCELLED'` in `analytics/page.tsx`, `dashboard/page.tsx` and `api/analytics` would count `AWAITING_PAYMENT` orders as revenue. All three move to the shared helper and exclude both `CANCELLED` and `AWAITING_PAYMENT`.

**API surface**:

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/api/orders` | POST | `lines`, `payment_method` (now includes `EFT`), `delivery_address`, `delivery_city` | `order` (status `AWAITING_PAYMENT`), `payment` (`id`, `redirect_url`, `instructions`) | session, customer | 409 checkout paused, 409 no supplier, 422 invalid |
| `/api/orders/[id]/payments` | POST | none | `payment` with a fresh `redirect_url` | session, order owner | 409 past deadline, 409 already paid, 403 not owner |
| `/api/orders/[id]` | PATCH | `action: 'MARK_PAID'`, `reference` (required), `paid_note` (optional), `amount` (optional) | updated order | session, `FINANCE_ADMIN` or `SUPER_ADMIN` | 403 wrong role, 404, 409 already paid, 409 cancelled by a person |
| `/api/orders/[id]` | PATCH | `action: 'CANCEL'` | updated order | session, order owner or staff | 409 already paid |
| `/api/payments/[provider]/callback` | POST | raw body, `x-afrideal-signature` header | 200 on success and on replay | none, signature verified | 401 bad signature, 404 unknown reference, 409 refused |
| `/api/settings/checkout` | GET, PATCH | `paused: boolean` on PATCH | `{ paused }` | GET session, PATCH `SUPER_ADMIN` | 403 wrong role |

**Callback contract**: the body is JSON with `reference`, `status` (`CONFIRMED` or `FAILED`), `amount`, `currency` and `occurred_at`. The signature is an HMAC SHA256 of the **raw request body**, computed before any JSON parse, sent in `x-afrideal-signature`, and compared with a constant time equality check. A callback whose `occurred_at` is more than 24 hours old is refused. HTTP codes matter because gateways retry on anything that is not 2xx: a replay returns 200, an unknown reference returns 404, a business refusal (an order a person cancelled) returns 409, and only an unexpected fault returns 500.

**POST /api/orders response shape changes.** Today it returns `supplier_orders`, `payables` and a three entry `events` array, which `verify.mjs` and `CheckoutClient` both read. Under this spec none of those exist at checkout time. The new response is `{ order, payment }`, and the supplier legs appear on the confirmation response and on `getOrderDetail` instead. Build task 10 updates both consumers.

**Value sourcing**:

| Action | Value produced | Source |
|---|---|---|
| Place order | `payment_expires_at` | `placed_at` plus a per method constant: 30 minutes for `DPO_PAY`, `PAYGATE` and `ORANGE_MONEY`; 7 days for `EFT`. Overridable by `PAYMENT_WINDOW_SECONDS` outside production only, which is what makes AC-5 and AC-7 testable |
| Place order | `Payment.amount` | `order.total` at creation |
| Place order | `Payment.provider` | `MOCK` whenever `PAYMENTS_PROVIDER=mock`, otherwise the adapter matching `order.payment_method`. `EFT` orders always use provider `EFT` |
| Place order | `Payment.provider_reference` | the adapter at session creation for card providers; for `EFT` it is `order.reference`, which is what the buyer quotes to the bank |
| Place order | `payment.redirect_url` | the adapter; `null` for `EFT` and for the mock's manual path |
| Place order | `payment.instructions` | for `EFT`, the bank details from the `settings` row `eft_bank_details` plus `order.reference`; `null` otherwise |
| Confirm payment | `order.payment_reference` | the confirmed `Payment.provider_reference` |
| Confirm payment | `Payment.amount_matches` | `payment.amount === order.total`, computed at confirmation, drives AC-11 |
| Confirm payment | `SupplierOrder.supplier_id` | `OrderItem.supplier_id` from checkout, unless that supplier now fails `selectSupplier`'s validity test, in which case re-selection runs for that line only |
| Confirm payment | `SupplierPayable.terms_days`, `gateway` | unchanged from today: 7 days, and `order.payment_method` |
| Confirm payment | `OrderItem.unit_price` | unchanged from checkout. The buyer's quoted price is a promise and is never recomputed |
| Confirm payment | audit actor for a callback | the fixed pair `('system:payments', 'Payment callback')`, so the audit log never has a null actor |
| Place order | "is checkout paused" | the `settings` row `checkout_paused`. A missing row or a failed read means not paused, so a settings outage never blocks trading |
| Expire order | `cancel_reason` | the constant `EXPIRED`, which is what distinguishes it from a person's cancellation and gates AC-7 |

**Key invariants**:
- An order has at most one `CONFIRMED` payment. Enforced in the claim step, which reads the order's payments inside the same `mutate('payments')` that writes.
- `(provider, provider_reference)` is unique where the reference is not null, by partial expression index.
- No `SupplierOrder` or `SupplierPayable` exists for an order with no `CONFIRMED` payment.
- An order at `PROCESSING` or beyond has a `CONFIRMED` payment and a complete set of supplier legs. This is what makes step 3 a valid completion marker.
- The customer price on an order item never changes after checkout.

**Security model**:
- Mark as paid: `FINANCE_ADMIN` and `SUPER_ADMIN` only, enforced by a per action check inside the PATCH handler. `OPS_DENIED_PREFIXES` is a page path list and does not gate API routes, and the existing `isStaff` check in that handler includes `OPERATIONS_ADMIN`, so the role gate here is new code rather than an inherited rule.
- A finance admin cannot currently reach `/admin/orders/[id]`, since `FINANCE_ALLOWED_PREFIXES` is analytics, payables and settlements. Rather than widen that, the mark as paid control lives on a new awaiting payment queue under `/admin/payables`, which is the screen someone reconciling a bank statement actually wants.
- Pause checkout: `SUPER_ADMIN` only, matching the existing restriction on `/admin/settings`.
- The callback route carries no session and authenticates by signature alone. It is the only unauthenticated write path in the application. `middleware.ts` already passes `/api` straight through, so no middleware change is needed; the protection is entirely in the handler.
- `MOCK` is refused when `NODE_ENV === 'production'`, as a hard gate in the adapter factory. A mock that can mark orders paid must not exist in production.
- Secrets are per provider (`PAYMENT_SECRET_MOCK`, `PAYMENT_SECRET_DPO`), not one shared value, so a leaked mock secret cannot forge a real confirmation. The mock signs server side only; its secret never reaches a browser.
- Compliance: Botswana Data Protection Act 2018 applies. A payment reference is linked to a named buyer, so every transition through `confirmPayment()` writes an `audit()` entry naming the actor. Audit logging on this path is not negotiable.

**Configuration required**:
- `PAYMENT_SECRET_MOCK`: HMAC secret for the mock provider's callbacks.
- `PAYMENTS_PROVIDER`: `mock` or `live`. Selects the adapter while DPO is unapproved.
- `PAYMENT_WINDOW_SECONDS`: optional, ignored in production. Shortens every window so expiry is testable.

**Critical test scenarios**:
- Happy path: place an order, confirm through the mock, assert `PROCESSING` and exactly one supplier order per supplier. Verifies **AC-1**, **AC-2**, **AC-3**.
- Replay: post the same callback twice, assert one payment, one supplier order, one payable. Verifies **AC-4**.
- Recovery: confirm with the legs write interrupted, retry, assert the order completes rather than being skipped. Verifies **AC-4**.
- Expiry: place an order with `PAYMENT_WINDOW_SECONDS=1`, read it, assert it reads `CANCELLED` and that no write happened on the read. Verifies **AC-5**.
- Late confirm: confirm against that expired order, assert it reopens and the audit records a late confirmation. Verifies **AC-7**.
- Deliberate cancel: customer cancels, then a callback arrives, assert it is refused with 409 and the order stays cancelled. Verifies **AC-7**.
- Failure and retry: fail a payment, assert the order is still `AWAITING_PAYMENT`, then start a second attempt and confirm it. Verifies **AC-10**.
- Amount mismatch: confirm with an amount below the total, assert `amount_matches` is false and the order is flagged. Verifies **AC-11**.
- Auth: operations admin attempts `MARK_PAID`, receives 403. Verifies **AC-6**.
- Auth: an unsigned callback receives 401 and changes nothing. Verifies **AC-6**.
- Pause: pause checkout, attempt to place an order, assert 409. Verifies **AC-8**.

## Build plan

Ordered as a Tracer Bullet, the project's recorded approach: tasks 2 and 3 together form the thinnest thread that runs end to end through schema, domain logic, API and the storefront, and everything after thickens that thread rather than adding a parallel one.

1. Migration and types: add `AWAITING_PAYMENT` to `OrderStatus`, `EFT` to `PaymentMethod`, `payment_expires_at` and `cancel_reason` to orders, the `payments` and `settings` collections with their table, schema entry, `data/*.json` seeds for the JSON driver, and the partial unique expression index. Satisfies **AC-1**, **AC-2**, **AC-4**.
2. `lib/payments/confirm.ts`: `confirmPayment()` in the claim, legs, finish, after order above, including the `23505` replay path, the resume path, the expired and deliberately cancelled branches, and the amount check. Satisfies **AC-3**, **AC-4**, **AC-7**, **AC-9**, **AC-11**.
3. `lib/payments/adapters.ts` plus `POST /api/orders`: the provider factory with the production gate on `MOCK`, order creation stopping at `AWAITING_PAYMENT`, a `STARTED` payment, the new `{ order, payment }` response, and no supplier legs. Satisfies **AC-1**, **AC-2**.
4. `effectiveOrderStatus()` and its rollout to every read surface, including the three analytics and dashboard `billable` calculations. Satisfies **AC-5**.
5. `POST /api/payments/[provider]/callback` with raw body HMAC verification, the replay and staleness rules, and the HTTP code table. Satisfies **AC-4**, **AC-6**.
6. `POST /api/orders/[id]/payments` for a retry after failure, and the `CANCEL` action accepting `AWAITING_PAYMENT` with `cancel_reason`. Satisfies **AC-10**, **AC-7**.
7. `MARK_PAID` on the orders PATCH with its own role check, plus the awaiting payment queue and its control under `/admin/payables`. Satisfies **AC-6**, **AC-11**.
8. `settings` row, the `GET` and `PATCH` endpoints, the pause guard in `POST /api/orders`, the storefront banner, and wiring `SettingsForm` to persist the toggle. Satisfies **AC-8**.
9. Checkout: remove "Your payment has been processed", handle `redirect_url` and the EFT instructions, and show the waiting for payment state. Satisfies **AC-1**, **AC-10**.
10. `verify`: a `payAs()` helper that confirms through the signed callback, applied after each of the 13 existing order creations; rewrite the checkout assertions that read `supplier_orders`, `payables` and `events` from the POST response; then the new state checks. Satisfies **AC-12**.

## Migration plan

**Strategy**: additive schema first, then a behaviour switch. Not a strangler, because there is one write path rather than two systems; the added fields are ignored by the previous code.

**Phases**:
1. Add the new fields and the two collections, with their tables, schema entries and JSON driver seed files. No behaviour change, nothing reads them yet.
2. Backfill, which is not uniform. An order already at `PROCESSING` or beyond was genuinely paid under the old model and gets a synthetic `CONFIRMED` payment with provider `EFT` and a reference marking it as a backfill. An order at `PENDING` (the seed has `o011` and `o012`, whose timelines show only "Order placed") was never paid: it gets `AWAITING_PAYMENT`, a past deadline, and **no** payment row, and its existing supplier orders and payables are removed so it satisfies AC-2. An order at `CANCELLED` (the seed has `o015`) gets `cancel_reason: 'STAFF'` and no payment row. Stamping every order `CONFIRMED` would write payments that never happened into a ledger the Data Protection Act applies to.
3. Switch `POST /api/orders` to the new path, with the pause guard and the new response shape.
4. Roll `effectiveOrderStatus()` out to the read surfaces and the analytics `billable` calculations.

**Rollback**: revert the commit. The added fields and collections are ignored by the previous code, so a revert needs no down migration. `DB_DRIVER=json` remains the escape hatch for local work.

**Risks**:
- The backfill is the dangerous step, and phase 2's three way split is the part to get right. Run it against a Neon branch first, per the project's branch first workflow, and count rows per status before and after.
- Phase 3 and phase 4 must ship together or analytics will count unpaid orders as revenue in the window between them.

## Consequences

**Positive**:
- The supplier is only asked to prepare goods for orders that are paid for, and the finance ledger only contains payables that are genuinely owed.
- One tested seam for every payment path, so feature 4 is an adapter plus credentials rather than a second flow.
- An interrupted confirmation is recoverable rather than silently broken, which is the failure this design exists to survive.
- Trading becomes possible before DPO Pay approves, through the EFT path, which takes the gateway off the critical path for a pilot.
- The storefront stops making a false claim to the buyer.

**Negative / tradeoffs**:
- The busiest write path in the app changes, with a three way backfill against live data.
- Suppliers hear about orders later than today, by minutes for card and potentially days for EFT. Operations should know this before it surprises them.
- `effectiveOrderStatus()` has to be used by every read surface. One place that forgets it shows a stale `AWAITING_PAYMENT` order, and the compiler cannot catch the omission.
- Not holding stock means two buyers can pay for the last unit. That is a deliberate trade for simplicity and it lands on operations to resolve.
- An EFT arriving after day 7, which a Botswana holiday period can cause, shows the buyer a cancelled order while their money is in transit. AC-7 makes it recoverable but the buyer still sees the wrong thing first.
- The build plan grew from eight tasks to ten, and the real cost is larger than that suggests, because task 4 touches roughly sixteen read surfaces.

**Neutral**:
- `settings` becomes the first persisted row behind `admin/settings`, which currently persists nothing.
- The callback route is the application's only unauthenticated write path, which is a new shape for this codebase and worth calling out in review.
- `PaymentMethod` gaining `EFT` means `SupplierPayable.gateway`, which is typed as `PaymentMethod`, can now read `EFT`. That is accurate rather than a problem.

## Follow-up

- [ ] Decide what happens when a confirmation arrives for an order whose supplier is gone and no replacement exists. This spec keeps the checkout assignment and re-selects only on invalidity, which makes the case rare but not impossible. It needs a commercial answer: hold the order for operations, or refund.
- [ ] Decide the handling for a confirmed underpayment or overpayment. AC-11 flags it; it does not say who chases it.
- [ ] Revisit the computed expiry if a report ever needs to query expired orders by status directly rather than through the helper. A scheduled sweep is the natural upgrade and needs no redesign.
- [ ] `PAYMENT_WINDOW_SECONDS` must never be set in production. Worth an assertion at boot rather than a convention.
