# Review, feat/buyer-account-extras, 2026-11-04

**Reviewed by**: review subagent (author on a different model)
**Scope**: 82 files (data/*.json and drizzle/meta skipped), branch vs d937338 (commits 21a707e, a279435, 28d137b)
**Verdict**: Changes requested

## Summary
Adds saved addresses and a review step, reorder, saved items, alert settings and promo codes with a margin floor. The money core is sound: I fuzzed `promoDiscount` (180k cases, rates 0.5 to 1.37) and the pula discount never exceeded the cap or went below landed cost. `buildOrderLines` matches the old order route line for line, the once per buyer check really runs inside the write lock, and the payable formula nets to the old gross. The headline problem is that the promo discount can still be recovered exactly by a supplier from fields the privacy helpers leave in place.

## Major
### 🟠 A supplier can still read the exact discount share from their own leg, `lib/order-privacy.ts:24` (with `lib/payments/confirm.ts:581,623`)
**Problem**: `legForSupplier` strips `promo_discount` but leaves `platform_margin`, `supplier_subtotal` and the payable `amount`. Since `platform_margin = gross - cost - share` and `payable.amount = supplier_subtotal + platform_margin + share = gross`, a supplier computes `share = payable.amount - supplier_subtotal - platform_margin`. Both are in the same payload: `/api/orders/[id]` (`legs[].platform_margin`, plus `payables` which is not filtered to the supplier at all) and `getSupplierWorkspace` (`legs[].platform_margin`, `legs[].payable.amount`). This is exact per leg and also works on orders where `order.total` inference would be muddied by delivery. It contradicts AC-9 and the comment on `orderForSupplier`. `scripts/verify.mjs:1500` only asserts that `promo_discount` is undefined, so it would not catch this.
**Why it matters**: The convention is that suppliers must not see promo details. Exposing our margin to a supplier was already questionable, but before this change margin carried no buyer-specific information; now it does.
**Suggested fix**: Strip `platform_margin` from supplier-facing legs in `legForSupplier` (no supplier page reads it; only `admin/orders/[id]/page.tsx` does). Also filter `detail.payables` to the supplier's own in `/api/orders/[id]` GET. Extend the verify check to assert the margin is absent.

## Minor
### 🟡 Resumed confirmation can mis-share the discount if routing changed, `lib/payments/confirm.ts:526`
**Problem**: Shares are recomputed from `bySupplier` on every run, and `bySupplier` comes from `resolveSupplier`, which re-routes when the pinned supplier lost stock or verification. If run 1 raised a leg for supplier A from set {A, B} and run 2 sees {A, C}, A's stored share differs from what run 2 computes and the leg shares no longer sum to `promo_discount_pula`. The comment claims "a resumed run shares the discount out exactly as the first did", which holds only while routing is stable.
**Why it matters**: Ledger margin is off by part of a discount on a rare path. Not a payable error (payables are unchanged by design).
**Suggested fix**: Compute shares from the order items' original `supplier_id` (fixed at checkout), or when legs already exist, derive remaining shares from `discount - sum(existing leg shares)`.

### 🟡 Total usage limit can be exceeded, `lib/promo.mjs:78`, `lib/promo-codes.ts:30`
**Problem**: Uses are counted only from paid orders (per AC-25) and the limit is checked only at order placement. Any number of buyers can place unpaid orders on the last remaining use, all get the discount, and `confirmPayment()` does not recheck. A code with limit 100 can end up with far more paid uses.
**Why it matters**: Finance sets a limit to cap spend. It is consistent with the spec text but the spec does not say overshoot is accepted for the total limit (it does for the late reopen case).
**Suggested fix**: Decide explicitly. Either count open unpaid orders towards the limit at placement (inside the same `insertUnless` lock), or record in the spec that the limit is soft.

### 🟡 Promo dates compared as strings with offsets allowed, `app/api/promo-codes/route.ts:18`, `lib/promo.mjs:76`, `app/api/promo-codes/[id]/route.ts:41`
**Problem**: `z.string().datetime({ offset: true })` admits `+02:00` style values, but `now` is a `Z` string and the `ends_at > starts_at` refine and the PATCH check compare strings lexicographically. A code starting `2026-11-05T00:00:00+02:00` goes live two hours late and ends two hours late; an end date earlier in real time than the start can pass the refine.
**Suggested fix**: Normalise to UTC (`new Date(x).toISOString()`) on write, or drop `offset: true`, or compare as timestamps.

### 🟡 Manual reroute mixes currencies in the margin, `app/api/supplier-orders/[id]/route.ts:73-78`
**Problem**: `gross` sums `item.line_total` (buyer currency) while `newCost` is the offer's untransformed cost and `leg.promo_discount` is pula. Pre-existing for gross and cost; this change adds a third unit to the same expression. Harmless at today's 1:1 rates. The payable is also not updated on reroute (existing), so `platform_margin` no longer reconciles with it after a reroute.
**Suggested fix**: Use `toPula(item.line_total, order.buyer_fx_rate)` and the item's `fx_rate` cost, as `raiseSupplierLegs` does; consider a shared leg-money helper.

### 🟡 Unbounded audit writes from failed promo codes, `app/api/orders/route.ts:196-205`
**Problem**: Every stale or invalid code at order time writes an audit row with `entityId` set to the caller's raw code string (up to 40 chars). A signed in buyer can fill the audit log with arbitrary text by posting orders with junk codes (each passes pricing first, but costs nothing).
**Suggested fix**: Audit only when the code exists (was valid at quote time), or rate limit, and keep the free text out of `entityId`.

### 🟡 No unit test for the supplier privacy helpers or `insertUnless`, `lib/order-privacy.ts`, `lib/db.ts:297`
**Problem**: `orderForSupplier` and `legForSupplier` are security relevant and untested (finding above went unnoticed because of it). `insertUnless` carries the once per buyer guarantee; only `verify` exercises it, serially.
**Suggested fix**: Add a small Vitest for the helpers (assert exact key sets) and a parallel `insertUnless` test on the JSON driver.

## Nits
- ⚪ `lib/promo.mjs:57`, the single one cent step-down assumes rate above about 0.05; at rate 0.0517 the pula figure can exceed the cap by a cent (1131 of 30k cases in my fuzz). Irrelevant at today's rates, worth a loop or a comment.
- ⚪ `lib/promo.mjs:30`, `capped` ignores the `subtotal` clamp, so the checkout "up to the most this order allows" note can miss that case.
- ⚪ `app/api/addresses/[id]/route.ts:15`, 403 vs 404 lets a buyer probe whether another user's address id exists; answer 404 for both.

## Strengths
- Discount arithmetic is decided in pula and the order currency figure is derived with rounding that provably never exceeds the cap; `evaluatePromo` is pure and shared by quote and order, so the two cannot drift.
- `insertUnless` puts the once per buyer check and the write under one lock, re-evaluated against orders as displayed, which is exactly the race AC-25 names.
- `buildOrderLines` is a faithful extraction: same checks, same order of refusal, same pricing and customs calls; the only difference is cent rounding of the total.
- `confirmPayment()` still never reads effective status; shares are deterministic (sorted by supplier id, floor with remainder on the last), and the payable formula restores the pre-promo gross.
- New routes use `guard()`, take the owner from the session, and use `.strict()` schemas where fields must stay fixed; the sign in redirect is path-only and rejects `//` and `/\`.

## Test coverage
Configured. Good: unit tests for promo math (including rates other than 1), `buildOrderLines`, shares and payables in `confirm.test.ts`, reorder, saved items, addresses, alert prefs, map link; verify section 9i and new Playwright journeys cover the stale code, use counting and ledger. Gaps: `order-privacy` helpers (no test, and verify misses the margin leak), `insertUnless` under concurrency, the resumed confirmation with changed routing, and promo date handling with offsets.
