# Epic: Buying

Everything between a buyer landing on AfriDeal and AfriDeal holding their money: the storefront, pricing, the buy funnel on a phone, card payment, and the money operations behind it. Back to [index.md](index.md).

## Already built

### E. Design system & Alibaba benchmark · existing
AfriDeal's colour, type and copy on the Alibaba phone app's layout and density; press states, floors, rails, the two column feed. Measured specs and the pattern map in `docs/design/alibaba-benchmark.md`. code in `components/ui/`, `components/storefront/`, `tailwind.config.ts`

### F. Pricing engine & tier ladder · existing
Supplier cost plus margin rules produce the customer price, with a four rung quantity ladder. code in `lib/pricing-engine.ts`, `lib/pricing-model.ts`, `lib/pricing-tiers.ts`

### G. Storefront: home, categories, suppliers, RFQ, browse · existing
Home at the benchmark grid, category browser, supplier directory and the two step RFQ scored 8 to 9 against the benchmark; browse scored 5 and is deferred. code in `app/(store)/`

### H. Buy flow, desktop first (detail, cart, checkout) · existing
Product detail, cart and checkout work end to end, but were built desktop first and create the order already paid. Rows 3 to 7 rebuild them phone first around real payment. code in `app/(store)/products/`, `app/(store)/cart/`, `app/(store)/checkout/`, `app/api/orders/`

### I. Buyer orders & tracking · existing
Order list and order detail with status events. code in `app/(store)/orders/`

## Foundations

### 3. Order payment states
An order is born waiting for payment and only becomes paid when payment is confirmed; supplier orders and payables are raised at that moment, never at checkout. Abandoned orders expire. Every later payment feature stands on this.
**Done when:** a new order starts as pending payment; no supplier order or payable exists until confirmation; an unpaid order expires after its window; `npm run verify` covers the new states.
spec [0003](../specs/0003-order-payment-states.md) · code in `lib/payments/`
- [x] Design it (spec): `/architect order payment states`
- [ ] Build it: `/develop order payment states`
  - [x] Schema, types and the confirmation seam: `AWAITING_PAYMENT`, `EFT`, the `payments` and `settings` collections, and `confirmPayment()` in its claim, legs, finish order (AC-1, AC-2, AC-3, AC-4, AC-7, AC-9, AC-11)
  - [x] Reaching the seam: the signed provider callback, the retry endpoint, and cancel from unpaid (AC-4, AC-6, AC-10)
  - [x] Expiry everywhere: `effectiveOrderStatus()` across the read surfaces, including the analytics revenue filters (AC-5)
  - [x] Finance and switches: mark as paid on the payables queue, plus pause checkout (AC-6, AC-8, AC-11)
  - [ ] Honest checkout and full coverage: the waiting state, EFT instructions, and `payAs()` in verify (AC-1, AC-10, AC-12)
- [ ] Verify it: `/check verify order payment states`
- [ ] Test it: `/test order payment states`
- [ ] Review it (fresh model): `/check review order payment states`
- [ ] Document it: `/document order payment states`

## Slice 1: Pay for one order by card, end to end

### 4. Card payment gateway · needs a decision
The thinnest real thread through every layer: checkout hands the buyer to a hosted card page, and the order turns paid only on a verified, signed callback from the gateway. A local mock gateway lets CI test the same path.
**Done when:** a sandbox card payment turns one order paid only through a signed callback; an unsigned or replayed callback changes nothing; returning before the callback shows "confirming"; the payment path tests run green in CI against the mock.
- [ ] Design it (spec): `/architect card payment gateway`

### 5. Phone checkout · needs a decision
Checkout rebuilt once, phone first, around the gateway handoff: page header, single column, sticky "Place order".
**Done when:** at 390 by 844 the place order button is visible without scrolling; placing an order hands off to the gateway and returns to a clear paid, failed or confirming state.
- [ ] Design it (spec): `/architect phone checkout`

## Slice 2: The buy decision on a phone

### 6. Product detail at phone parity · needs a decision
The page where the buy decision happens, at the benchmark: gallery, compact tier rows, and a sticky action bar so buying is one thumb away at any scroll. Needs the product owner's recording of Alibaba's product page (benchmark §5).
**Done when:** the buy action is reachable at any scroll position; the page scores 7 or more on the design scorecard; the page is under 2,500px tall at 390px.
- [ ] Design it (spec): `/architect product detail at phone parity`

### 7. Cart at phone parity
Patch the cart so it reads on a phone: sticky checkout bar, one line titles, tier pills that do not wrap. The full rebuild is deferred.
**Done when:** the checkout button stays in the viewport at 390px; no tier pill wraps.
- [ ] Build it: `/develop cart at phone parity`

## Slice 5: Money operations

### 13. Finance controls: mark as paid, pause checkout
The EFT and invoice fallback: a finance admin marks an order paid with a reference and note through the same confirmation path the gateway uses, and can pause checkout storewide without a deploy.
**Done when:** an EFT order becomes paid with its supplier order raised and the action audit logged; pausing checkout shows "temporarily unavailable" on the storefront within one request.
- [ ] Build it: `/develop finance controls`

### 14. Refunds · needs a decision
Full and partial refunds through the gateway from a paid order, with the supplier payable adjusted to match.
**Done when:** a sandbox refund lands; order, payable and ledger balance to the thebe; the refund is audit logged.
- [ ] Design it (spec): `/architect refunds`

### 15. Payment reconciliation · needs a decision
A finance page comparing orders paid in a period against the gateway's settlement export, so mismatches surface before month end.
**Done when:** a deliberately mismatched row is flagged; matched rows are marked settled.
- [ ] Design it (spec): `/architect payment reconciliation`

## Slice 7: Reach

### 20. Orders list clean up · Beta
Fix the stray `Â·` characters in the orders list and collapse each row's meta to two lines. The full rebuild is deferred.
**Done when:** no mojibake anywhere in the orders list; each order row is 120px or less at 390px.
- [ ] Build it: `/develop orders list clean up`

## Phase 1 close out

Gaps against the client's Phase 1 feature list that you can build alone. Order and packages: [docs/phase1-closeout-plan.md](../phase1-closeout-plan.md).

### 24. Chosen quote becomes an order · needs a decision
Today a buyer can choose a supplier's quote, but nothing happens next. Choosing a quote should create an order at the quoted price, ready to pay like any other.
**Done when:** selecting a quote creates one order linked to the request for quote, at the quoted price, in the same payment state as a checkout order; the request shows "ordered"; `npm run verify` covers it.
- [ ] Design it (spec): `/architect chosen quote becomes an order`

### 25. Buyer account & checkout extras · needs a decision
The account and checkout pieces on the Phase 1 list: saved addresses chosen at checkout, a review step with delivery instructions and terms, promo codes, reorder, a map link on tracking, a mini cart, saved items, alert settings, and a welcome step after sign up. Builds on 5 (phone checkout).
**Done when:** a buyer can save addresses and pick one at checkout; checkout has a review step with delivery instructions and a terms checkbox; a promo code changes the total; a delivered order can be reordered; saved items and alert settings are live in the account (no longer dimmed).
- [ ] Design it (spec): `/architect buyer account & checkout extras`

### 26. Browse extras · needs a decision
The browsing pieces still missing from the Phase 1 list: a price range filter, load more on long result lists, and recently viewed products.
**Done when:** results can be narrowed by a price range; long lists load more on demand; a product page shows the buyer's recently viewed products.
- [ ] Design it (spec): `/architect browse extras`

## Deferred
Out of scope for the current build pass, kept so the plan stays honest.
- **Browse and search results at phone parity**: rows with tier pills that do not wrap · needs a decision
- **Orders list rebuilt to the benchmark** · needs a decision
- **Account screen**: the account tab currently links to orders · needs a decision (now part of 25)
- **Progressive three screen sign in and create account** · needs a decision
- **Cart full rebuild** · needs a decision
- **More payment methods**: other card gateways and mobile money · needs a decision
