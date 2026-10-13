# AfriDeal user journeys: Phase 1 Close-out

Drafted 2026-10-09. This document extends the core journeys in `e2e-journeys.md` with new flows targeting the Phase 1 Close-out scope (Card Payments, Mobile Parity, Duties, Finance Controls).

## B. Buying and tracking (Extensions)

### B09 Checkout with real card payment (Gateway)

**Start:** signed in as Thabo.

1. Add a product to the cart and proceed to checkout.
2. Select "DPO Pay" as the payment method.
3. Tap "Place order".
4. The user is redirected via a full window navigation to the mock payment gateway page (`/mock-gateway`).
5. Enter test card details and submit. The gateway signs a callback and POSTs it to the API.
6. The gateway redirects back to AfriDeal.

**Expect:**
- The order is created successfully.
- The order status is `Processing` and the timeline shows `Paid` immediately.
- The payment reference is securely generated.
- No actual card details are saved to our database.

### B10 Delivery to a Collection Point

**Start:** signed in as Kefilwe.

1. Add a product to the cart and proceed to checkout.
2. Under Delivery, select "Collection Point" instead of Home Delivery.
3. Choose the "Gaborone Central Locker" from the list.
4. Place the order.

**Expect:**
- The delivery fee is adjusted for a collection point.
- The order confirms and displays the collection point address on the receipt.

### B11 Customs and duty included in landed price

**Start:** signed out, product `p002` (an imported item subject to duty) detail page.

1. View the price breakdown.
2. Add to cart and proceed to checkout.

**Expect:**
- The detail page displays the final landed price (BWP).
- At checkout, the subtotal breakdown explicitly lists "Customs & Duty" as a line item before the final total.
- The buyer sees that AfriDeal is covering the border mechanics.

## C. Request for quotation (Extensions)

### C04 Chosen quote becomes an order and is paid by card

**Start:** signed in as Kefilwe.

1. Submit a quotation request for an unlisted bulk quantity (e.g. 150 units of `p001`).
2. An invited supplier (Naledi) responds with a unit quote.
3. Buyer accepts the quote (or staff selects), converting the quotation into an order in `AWAITING_PAYMENT` state with standard `AFD-xxxxx` reference. The RFQ status updates to `ORDERED`.
4. Buyer opens `/orders` and clicks through to the quotation order receipt (`/orders/[id]`), seeing "Waiting for your payment".
5. Buyer clicks "Try paying again", completes card payment via `/mock-gateway`.
6. Returning to the receipt confirms the payment.

**Expect:**
- The order status advances to `Processing`.
- The receipt displays "Payment confirmed" with the timeline showing Placed and Paid.

## F. Runner deliveries (Extensions)

### F04 Runner delivers to a Collection Point

**Start:** signed in as Kagiso, `/runner/jobs`. Job for Kefilwe's order (B10) is active.

1. Pick up the item from the supplier.
2. Navigate to the Collection Point.
3. Tap "Drop off at Collection Point" and enter the locker confirmation code (e.g. `LCK-7711`).
4. Buyer (Kefilwe) opens the order receipt (`/orders/[id]`), views the locker PIN, and taps "Confirm collection".

**Expect:**
- The runner job is marked complete.
- Kefilwe's order moves to `Ready for Collection` with the locker PIN displayed.
- Buyer confirming collection transitions order to `Delivered` and releases supplier payables for settlement.
- **Status:** Verified in `e2e/storefront/b-buy-closeout.spec.ts` (19/19 passed).
- **Videos:** `demo-videos/F04-phone.mp4`, `demo-videos/F04-desktop.mp4`.

## G. Team console (Extensions)

### G11 Process a refund

**Start:** signed in as Finance Admin, `/admin/payables`. An order was recently resolved in favor of the customer via a dispute.

1. Locate the disputed order.
2. Tap "Initiate Refund".
3. Enter the refund amount (full) and confirm.

**Expect:**
- The order timeline reflects a `Refunded` state.
- The supplier's pending settlement is reduced by their portion of the reversed sale.
- The APR analytics reflect the refunded amount.

## Z. The golden thread (Extensions)

### Z02 The Mobile Golden Thread

**Start:** A 390px viewport, signed in as Thabo.

1. Browse the home page, tap a category, and open a product.
2. Use the sticky mobile buy bar to add the item to the cart.
3. Open the slide-up cart sheet and proceed to checkout.
4. Complete checkout.

**Expect:**
- All elements render cleanly within 390px (Alibaba benchmark).
- Dialogs (e.g., quotations) overlay correctly without clipping the sticky buy bar.
- Transitions and sheet animations perform smoothly.
- **Status:** Verified in `e2e/storefront/b-buy-closeout.spec.ts` (11/11 passed in demo run).
- **Videos:** `demo-videos/Z02-phone.mp4`, `demo-videos/Z02-desktop.mp4`.
