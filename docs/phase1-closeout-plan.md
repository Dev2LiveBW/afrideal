# Phase 1 close-out plan (internal)

_2 October 2026. For the developer, not the client._

## Where Phase 1 stands

Measured against the client's Phase 1 feature list (283 features), the app is at **70%**: 173 built, 49 partly
built, 61 not built. The item-by-item list is in `Tshego/demo-2026-10-01/phase1-gap-list.md`.

**Only 8 of the 283 need someone else to finish:** DPO Pay, Orange Money and PayGate going live, money held by a
provider until delivery, real text messages, real email, and push alerts (two items). Everything else can be built
alone. That puts the ceiling for solo work at **about 97%**.

The rule for the blocked 8: build everything up to the point where only an approval, a credential or a DNS record is
missing, so each one becomes a configuration change, not a project, when it unblocks.

## The order of work

Each package is something you can finish and demo on its own. Sizes are rough: **S** about a day, **M** two to four
days, **L** about a week. The scope feature it touches is in brackets; `/architect` first where marked.

### 1. Close the open loops (S to M)

- [ ] Merge PR #2 (demo sign in by ticket) and PR #3 (Clerk lookup retry).
- [ ] Staging link: spec 0002 milestones "Data isolation" and "Staging live" (feature 2). The dashboard steps are
  yours: Neon branches, the Sanity staging project, renaming the Vercel project. `/develop staging & production environments`.
- [ ] A chosen quote becomes an order. Today `SELECT_RESPONSE` in `app/api/rfqs/[id]/route.ts` marks the quote
  selected but creates no order. This is a core Phase 1 flow.

### 2. An honest payment flow, without the gateway (M to L)

- [ ] Order payment states (feature 3, `/architect` first): new orders start as awaiting payment, and no supplier order or
  payable exists until payment is confirmed.
- [ ] EFT "mark as paid" and pause checkout (feature 13).
- [ ] Payment provider interface with a **mock provider**: start payment, a signed callback, ignoring a repeated callback,
  failed payment, refund (feature 4, built against the mock). When DPO Pay approves, the work left is one adapter
  plus credentials.
- [ ] Checkout copy stops saying "Your payment has been processed" before it has been.

### 3. Buyer checkout and account (M to L)

Cart and checkout is the weakest part at 39%; orders and account is at 53%.

- [ ] Saved addresses: add, edit, set default, choose at checkout.
- [ ] Step by step checkout (delivery, payment, review), with delivery instructions and the terms checkbox.
- [ ] Payment entry screens for card and Orange Money number, wired to the mock provider.
- [ ] Promo codes.
- [ ] Reorder, map link on tracking, mini cart.
- [ ] Wishlist / saved items (the account panel already shows it dimmed).
- [ ] Alert preferences screen (stored now, used when alerts go live).
- [ ] Welcome step after sign up.

### 4. Supplier and runner onboarding (M)

- [ ] Supplier sign up, document upload, waiting for approval, welcome. The admin side already approves and
  rejects; this is the supplier side.
- [ ] Runner sign up, documents, service area, waiting for approval, welcome.
- [ ] Runner profile page (figures, performance, reviews, settings).
- [ ] Supplier: decline a quote, product on/off switch, storefront settings, CSV export of earnings.

### 5. Team console gaps (M)

- [ ] Customer management: list, detail, suspend, message, password reset (through Clerk).
- [ ] Runner detail and suspend.
- [ ] Audit log screen (the log already exists).
- [ ] Flag an order, escalate a dispute, override the chosen supplier.
- [ ] Export analytics to CSV (PDF can wait).
- [ ] Team user management (`/architect` first): it conflicts with the rule that roles come only from
  `scripts/sync-users-to-clerk.mjs` and the Sanity people directory, so decide where team roles live before
  building a screen for them.

### 6. Alerts, ready to switch on (M)

- [ ] One alert service with email, text and push channels, each behind a provider interface. `lib/notifications.ts`
  already fires the events.
- [ ] Email through Resend in test mode; text messages through the Africa's Talking sandbox. Going live needs the
  client's sending domain and sender name (blocked, see below).
- [ ] Team alert feed: mark read, filter.

### 7. Polish (S each, any time)

- [ ] Browse: price range filter, load more, recently viewed.
- [ ] Runner: real delivery photo upload (replaces the placeholder).
- [ ] Hydration warnings on storefront pages (the saved cart loads after the first render).
- [ ] Suppliers see the customer's price and payment method on their order panel. Confirm with the product owner what
  a supplier should see, then hide the rest.

## Waiting on others (not on your critical path)

| Item | From | Unblocks |
|---|---|---|
| DPO Pay merchant approval, plus business registration and ID documents | Client | Real payments (package 2 adapter) |
| Orange Money and PayGate onboarding | Client | The other two gateways |
| Text message sender name | Client | Real text alerts |
| Email sending domain (DNS records) | Client | Real email alerts |
| Real products, photographs, delivery fees and runner rates | Client | Launch content and real prices |
| Production domain and the Clerk production instance | Client DNS | Production go live (spec 0002) |
| Neon project moved to the company org | Client org | Before production go live |

## Worth raising with the client before building

- **Cart grouped by supplier** and "items may arrive separately" come from the old marketplace model. AfriDeal is now
  the seller to the customer, so these may not belong in Phase 1. Ask to drop them.
- **Supplier replies to reviews** is deferred for now.

## How to run it

Each package can go through the usual loop: `/architect` where a decision is owed, then `/develop`, `/check verify`,
`/test`, `/check review`. Package 1 first, then 2, because the client's staging review needs an honest payment step.
Packages 3 to 7 can go in any order after that. After each package, update the scores in
`Tshego/demo-2026-10-01/report-src/features.py` and run `python build_report.py` there to refresh the client report.
