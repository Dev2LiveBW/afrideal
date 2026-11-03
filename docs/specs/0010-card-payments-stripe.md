# 0010. Card payments through Stripe, DPO later behind the same seam

**Date**: 2026-10-23
**Status**: Built and paid end to end on Stripe's test mode (2026-10-23). Live mode is not enabled (see Open questions).

## Summary

The card ("Visa / Mastercard") becomes a live method at checkout in every
launch country, taken through **Stripe Checkout in test mode** and confirmed
by a signed Stripe webhook into spec 0003's `confirmPayment()`. The card is a
**method** (`CARD`); Stripe is a **provider** behind it, chosen by
configuration. DPO Pay, when its application is approved, becomes a second
provider behind the same method. Checkout, the order route and the order data
do not change when it does.

## Context

Spec 0009, answers 2 and 8 (product owner, 2026-10-22/23): the card is the
live method everywhere at launch, built on Stripe's sandbox now, with DPO added
behind the same adapter later. Answer 1: buyers in Botswana pay in pula (BWP),
buyers in South Africa, Lesotho and Eswatini in rand (ZAR). Until now the card
method was called `DPO_PAY` and could only be paid through the mock gateway.

## Decision

### The method is `CARD`; the provider is configuration

`PaymentMethod` is what the buyer chose; `PaymentProvider` is who takes the
money. Naming the method after one gateway (`DPO_PAY`) would have meant either
a `STRIPE` method beside it (checkout, the countries data and every order
change again when DPO arrives, and a buyer would see two card rows) or a
method named after a gateway it is not paid through. So:

| | Before | After |
|---|---|---|
| `PaymentMethod` | `DPO_PAY`, `ORANGE_MONEY`, `PAYGATE`, `EFT` | `CARD`, `ORANGE_MONEY`, `PAYGATE`, `EFT` |
| `PaymentProvider` | `MOCK`, `DPO_PAY`, `ORANGE_MONEY`, `PAYGATE`, `EFT` | adds `STRIPE` |

`lib/payments/adapters.ts` picks the provider for `CARD` from `CARD_PROVIDER`:

| `CARD_PROVIDER` | Card is taken by | Card offered when |
|---|---|---|
| unset, with `PAYMENTS_PROVIDER=mock` | `MOCK` (unchanged behaviour) | always |
| unset otherwise, or `stripe` | `STRIPE` | test keys are set (below) |
| `mock` | `MOCK` | the mock is allowed (spec 0003's production gate) |
| `dpo` | `DPO_PAY` | never yet: the adapter is not built |

`CARD_PROVIDER=stripe` with `PAYMENTS_PROVIDER=mock` sends cards to Stripe and
leaves the wallets on the mock, which is how `npm run verify` exercises Stripe
and every other path in one run.

When DPO is approved: write `lib/payments/dpo.ts` with the same calls (start,
resume, expire, refund), a webhook route that verifies DPO's signature and
calls `confirmPayment()`, and set `CARD_PROVIDER=dpo`. Nothing under
`app/(store)` or `app/api/orders` changes.

### Stripe Checkout, not Payment Intents with our own form

Stripe's hosted page keeps card numbers off AfriDeal entirely (PCI SAQ A),
matches the redirect shape checkout already has for the mock
(`payment.redirect_url`), and lets a declined buyer retry inside the same
session, which covers most of AC-10 before our own retry route is needed.

- One session per payment attempt, one line ("AfriDeal order AFD-…") for
  `order.total` in `order.currency`, `mode: payment`, cards only.
- `provider_reference` is the session id (`cs_test_…`). `client_reference_id`
  and metadata carry the order id and reference.
- Amounts go to Stripe in minor units (`Math.round(total * 100)`). BWP and ZAR
  are both two-decimal currencies and both on Stripe's presentment list; any
  other currency is refused before a session is created.
- `success_url` and `cancel_url` return to `/orders/<id>`; the order page is
  never the source of truth for payment, the webhook is.

### Keys, and never a live one

`STRIPE_SECRET_KEY` (an `sk_test_` or `rk_test_` key) and
`STRIPE_WEBHOOK_SECRET` (`whsec_…`, from the dashboard endpoint or
`stripe listen`) in `.env.local`. A live key (`sk_live_`, `rk_live_`) is
refused outright: checkout does not offer the card and the adapter throws.
Going live is a separate decision with its own review (Open questions).

### The webhook: `POST /api/payments/stripe/webhook`

Its own route, because Stripe signs differently from spec 0003's callback
(`Stripe-Signature: t=…,v1=…` over `t.rawBody`). Verified with the Stripe
SDK against the **raw body** and a 5 minute timestamp tolerance, which also
replaces spec 0003's 24 hour staleness rule: Stripe re-signs every retry, so
a captured request cannot be replayed later. The generic
`/api/payments/[provider]/callback` does not accept `STRIPE`.

| Event | Effect |
|---|---|
| `checkout.session.completed`, `payment_status: paid` | `confirmPayment()` with `amount_total / 100` and the session currency |
| `checkout.session.async_payment_succeeded` | the same |
| `checkout.session.completed`, not yet paid | ignored; the async event follows |
| `checkout.session.async_payment_failed` | `failPayment()` |
| `checkout.session.expired` | `failPayment()` ("checkout session expired") |
| `charge.dispute.created` | `flagChargeback()`: audit `PAYMENT_CHARGEBACK` and notify finance with the amount, reason and evidence deadline. The order is left alone; a person decides. The session is found from the payment intent |
| anything else | ignored |

A buyer returning to `/orders/<id>?paid=card` before the webhook lands sees
"Confirming your card payment", and the page refreshes itself for about a
minute (`ConfirmingPayment.tsx`). The flag only changes wording while a Stripe
attempt is open; it never marks anything paid.

Status codes differ from spec 0003's callback table on purpose. Stripe retries
**every** non-2xx for up to three days and disables endpoints that keep
failing, so a final answer must be a 2xx:

- bad or missing signature: 401
- replay, business refusal (cancelled on purpose, already paid differently),
  unknown session, ignored event: 200 with what happened in the body. Refusals
  are already flagged for finance inside `confirmPayment()`.
- unknown session is 200 because one Stripe sandbox may feed several
  environments (local, e2e, a preview), and every endpoint receives every
  event in the account.
- unexpected fault: 500, the one case worth a retry.

Idempotency is spec 0003's: `(provider, provider_reference)` is unique, so a
redelivered event finds the claimed payment and finishes or no-ops.

**Currency**: `confirmPayment()` now takes the paid currency. A confirmation in
a currency other than the order's is a mismatch (AC-11): recorded, flagged,
never treated as a match because the numbers happen to be equal.

### Expiry (spec 0003, AC-5 and AC-7)

Stripe sessions live at least 30 minutes, so the card window grows from 30 to
**35 minutes**: the session is created with `expires_at` 31 minutes out and the
order outlives it, keeping spec 0003's rule that our deadline outlives the
gateway's. A session that expires unpaid fails its attempt through the
`expired` event. A payment that still lands after the order expired reopens
it, as AC-7 already says. When a buyer or staff cancels an unpaid order, its
open Stripe sessions are expired at once, so nobody can pay for an order a
person cancelled.

The retry route (`POST /api/orders/<id>/payments`) hands back the open session
while Stripe still has it open, rather than minting a second one; a session
Stripe has closed fails its attempt and a fresh one is started.

### Refunds

Spec 0003's rule stands: money that arrives and cannot be applied is flagged
for finance, never refunded automatically. What changes is the finance
`REFUND` action: for an order paid through Stripe it now issues the refund
through Stripe (idempotent per order) and records Stripe's refund id. If Stripe
refuses, nothing in our records changes. Before this, a refund was a record of
money returned by some other means, which for a card would have told the buyer
"refund processed" while nothing moved.

## Configuration

| Variable | Value |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_…` or `rk_test_…`. Live keys refused |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` for the endpoint above |
| `CARD_PROVIDER` | `stripe`, `mock` or `dpo` (see table) |

Locally the webhook needs a tunnel: `stripe listen --forward-to
localhost:3000/api/payments/stripe/webhook` prints the `whsec_` to use.

## Data

The method rename touches stored rows: `orders.payment_method`,
`supplier-payables.gateway` and `countries.payment_methods[].method`. They are
seed rows, so the seed and `data/*.json` change, and Postgres picks it up from
`npm run db:load` (or `npm run seed`) when this merges. Until that reload the
live countries still name `DPO_PAY`, and checkout shows the card as "coming
soon" there rather than taking it through a stale name.

## Tests

- `lib/payments/stripe.test.ts`: session parameters (minor units, currency,
  expiry, metadata), the live-key refusal, resume and expire, refunds, the
  event interpretation table above, and signature verification against the
  raw body (good, tampered, wrong secret, stale timestamp, missing header).
- `npm run verify`: the webhook refuses unsigned and mis-signed events and
  ignores unknown sessions; with `CARD_PROVIDER=stripe` every card order in the
  suite is paid through a signed Stripe event, replayed, and checked for one
  payment and one set of supplier legs.
- By hand: a 4242 4242 4242 4242 test card takes an order from
  `AWAITING_PAYMENT` to `PROCESSING` on a local server.

## Verified (2026-10-23, the "Afrideal sandbox" account)

- The product owner's sandbox is a **US** Stripe account (default currency
  USD). It presents BWP and ZAR: sessions were created in both.
- A 4242 test card paid order AFD-24855 (BWP 182.00) through the real
  checkout and Stripe's hosted page; `stripe listen` forwarded
  `checkout.session.completed`; the order went `AWAITING_PAYMENT` →
  `PROCESSING` with one payment, one supplier order and one payable.
- A session left unpaid expired at 31 minutes, and the real
  `checkout.session.expired` event failed its attempt.
- Finance `REFUND` on that order created Stripe refund `re_…` (succeeded,
  BWP 182.00); a second refund was refused.
- `npm run verify` with `CARD_PROVIDER=stripe`: section 9f runs against
  real test-mode sessions (amount in thebe, rand for Lesotho, resume,
  expiry, cancel, replay, wrong currency).

## Review against Stripe's products (2026-10-23)

The product owner asked for Payments, Connect and Tax. From Stripe's own
documentation, read on 2026-10-23:

**Payments: in place.** Hosted Checkout, signed webhook as the only source of
truth, raw-body verification, idempotent confirmation, refunds through the
API, no card data or buyer personal data on our side. Chargebacks
(`charge.dispute.created`) reach finance; checked with Stripe's dispute test
card 4000 0000 0000 0259 on AFD-24825 (2026-10-24). Still to set before
live: the dashboard webhook endpoint pinned to the SDK's API version
(`2026-09-30` for stripe-node 23) and subscribed to the five events above;
a statement descriptor.

**Connect: not a fit for these countries today.** Self-serve cross-border
payouts reach connected accounts only in the US, UK, EEA, Canada and
Switzerland, so suppliers in Botswana, South Africa, Lesotho and Eswatini
cannot be connected accounts paid by a US platform. Stripe's alternative,
**Global Payouts** (US or UK sender), lists Botswana (BWP, wire) and South
Africa (ZAR, wire) as recipient countries; Lesotho and Eswatini are not
listed. AfriDeal is merchant of record with its own payables ledger
(`lib/payables.ts`), which is the shape Global Payouts expects (payments and
payouts decoupled), not Connect's. South Africa itself appears on Stripe's
availability page only as "Extended network", through Paystack.

**Tax: not recommended.** Stripe Tax does not support Botswana, Lesotho or
Eswatini at all, and supports South Africa only as a customer location, not
as a business location. Spec 0009, answer 3, has VAT and import duty paid by
the buyer at the border through the courier, never in AfriDeal's price, so
there is nothing for Stripe Tax to calculate at checkout. Whether AfriDeal as
merchant of record must register for VAT in Botswana (BURS) is a question for
the accountant, not Stripe.

## Open questions

1. **Where the Stripe account lives.** Stripe does not open accounts for
   businesses in Botswana, Lesotho or Eswatini, and South Africa is reached
   through Paystack. The sandbox is a US account; a live US (or UK) entity
   would settle in USD (or GBP), with pula and rand charges converted, and
   could pay Botswana and South African suppliers through Global Payouts.
   That is a company and tax question for the product owner before live
   mode, not a code one. DPO, which is licensed in Botswana, stays the
   alternative behind the same seam.
2. **Live mode.** Turning it on needs: the account above, a live webhook
   endpoint on the deployed site, and a review of this path at GA rigor.
3. **Refund currency in copy.** `lib/refunds.ts` writes "BWP" into refund
   notes whatever the order currency; a rand card refund reads wrong there.
