# RFQ Chosen Quote to Order Conversion (Scope Feature 24 & Journey C04)

**Date:** 2026-10-11

## Summary
Successfully implemented and verified **Chosen Quote Becomes an Order (Package 1 / Scope Feature 24)** end-to-end. When staff triages and selects a winning supplier quote (`action: 'SELECT_RESPONSE'`) or a buyer accepts a quote (`action: 'ACCEPT_QUOTE'`), the system converts the quote into an `Order` and `OrderItem` in the `AWAITING_PAYMENT` state with standard `AFD-xxxxx` reference. The RFQ status moves to `'ORDERED'`. The buyer immediately sees the order in `/orders` and can open the receipt (`/orders/[id]`) to pay via the mock card gateway (`/mock-gateway`). Upon card payment callback, the order advances to `PROCESSING` with "Payment confirmed".

Both `scripts/verify.mjs` (Section 15) and Playwright E2E Journey **C04** pass cleanly across phone and desktop viewports, and high-fidelity demo videos with on-screen captions were recorded in MP4 format.

## Accomplishments

1. **RFQ to Order Conversion Engine**:
   - Implemented order creation logic in [`app/api/rfqs/[id]/route.ts`](../../app/api/rfqs/[id]/route.ts):
     - Calculates unit price with customer markup or staff override.
     - Spawns an `Order` with `status: 'AWAITING_PAYMENT'`, linking to the customer.
     - Mints corresponding `OrderItem` record with supplier attribution, cost, and landed selling price.
     - Calls `startPayment()` to initialize card payment attempt.
     - Updates RFQ status to `ORDERED` with `order_id` and `quoted_unit_price`.
     - Logs audit entry (`RFQ_RESPONSE_SELECTED`) and notifies the buyer.
     - Idempotent: re-calling quote selection or acceptance returns the existing order.

2. **Buyer Self-Service Quote Acceptance**:
   - Enabled `action: 'ACCEPT_QUOTE'` for buyers on their own quotation requests in [`app/api/rfqs/[id]/route.ts`](../../app/api/rfqs/[id]/route.ts).
   - Scoped `GET /api/rfqs/[id]` so buyers can see quotes marked as `SELECTED` without disclosing raw supplier costs.

3. **Payment Reference Sync**:
   - Fixed payment retry reference mismatch in [`app/api/orders/[id]/payments/route.ts`](../../app/api/orders/[id]/payments/route.ts) where reusing an open payment attempt updated the URL parameter but did not sync `payments.provider_reference`, which previously caused gateway lookup 404s.

4. **In-Memory Atomic ID Sequencing**:
   - Added `inMemoryCounters` in [`lib/db.ts`](../../lib/db.ts) for `DB_DRIVER=json`. This mimics PostgreSQL's atomic `reserveIds` sequence generation within the Next.js process, preventing ID collisions during concurrent multi-worker test runs.

5. **Verification & E2E Tests (Journey C04)**:
   - Extended Section 15 of [`scripts/verify.mjs`](../../scripts/verify.mjs) to verify order creation, status, and buyer order list visibility.
   - Built Playwright Journey **C04** in [`e2e/storefront/b-buy-closeout.spec.ts`](../../e2e/storefront/b-buy-closeout.spec.ts), covering:
     1. Buyer submits RFQ.
     2. Supplier (Naledi) submits quote.
     3. Buyer accepts quote, generating an order.
     4. Buyer visits `/orders` and clicks through to order receipt.
     5. Buyer clicks "Try paying again", completes card payment on `/mock-gateway`.
     6. Buyer returns to receipt with "Payment confirmed".
   - Verified 17/17 tests passing across phone (390px Alibaba mobile benchmark) and desktop viewports.

6. **Demo Videos Generated**:
   - `demo-videos/C04-phone.mp4` (Buyer phone flow)
   - `demo-videos/C04-phone-naledi.mp4` (Supplier quote on phone)
   - `demo-videos/C04-desktop.mp4` (Buyer desktop flow)
   - `demo-videos/C04-desktop-naledi.mp4` (Supplier quote on desktop)
