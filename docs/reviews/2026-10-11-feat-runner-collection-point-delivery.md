# Runner Drop-off at Collection Point (Scope Feature 10 & Journey F04)

**Date:** 2026-10-11

## Summary
Successfully implemented and verified **Runner Drop-off at Collection Point (Journey F04)** end-to-end, completing the fulfillment half of **Feature 10 (Collection Point Delivery)**. 

When a buyer selects self-service locker pickup (e.g., `Gaborone Central Locker`), the runner job preserves the smart locker destination. In the runner portal (`/runner/jobs`), the runner sees the designated pickup station, marks pickup from the supplier, and upon arrival enters the secure smart locker drop-off code (e.g. `LCK-7711`). Completing the drop-off advances the order to `'READY_FOR_COLLECTION'`, notifies the buyer with their pickup PIN, and updates the order tracking timeline with an "At locker" milestone. The buyer can then view the pickup PIN on their receipt and tap "Confirm collection" once retrieved, which moves the order to `'DELIVERED'` and releases supplier payables for settlement.

Playwright E2E Journey **F04** passed 100% green across both phone (390px Alibaba mobile benchmark) and desktop viewports (19/19 passing tests in `e2e/storefront/b-buy-closeout.spec.ts`), and high-fidelity captioned demo videos were generated.

## Accomplishments

1. **Shipment Routing & Destination Preservation**:
   - Updated `openJobForLeg()` in [`lib/shipments.ts`](../../lib/shipments.ts) to check `order.delivery_method === 'COLLECTION_POINT'`.
   - Automatically assigns `dropoff_name` to the locker name (e.g., `Gaborone Central Locker`) and `dropoff_address` to the station address, ensuring runners have exact directions to the smart locker depot.

2. **Runner Portal Locker Drop-off Flow**:
   - Enhanced [`app/(runner)/_components/ActiveJobCard.tsx`](../../app/(runner)/_components/ActiveJobCard.tsx) with collection point detection.
   - For collection point jobs, replaces standard delivery with a dedicated locker deposit workflow:
     - Smart locker code input field (`#locker-code`, placeholder `e.g. LCK-8821`).
     - Action button "Drop off at Collection Point".
     - Validates and passes `locker_code` in the payload to `PATCH /api/shipments/[id]`.

3. **Shipment API State Machine & Notifications**:
   - Updated [`app/api/shipments/[id]/route.ts`](../../app/api/shipments/[id]/route.ts) schema to accept `locker_code`.
   - When marking `DELIVERED` on a collection point shipment:
     - Transitions order to `'READY_FOR_COLLECTION'` (defined in [`types/index.ts`](../../types/index.ts)).
     - Appends an audit timeline entry with `Locker PIN: ${locker_code}`.
     - Dispatches an in-app notification to the customer containing their collection locker location and PIN.

4. **Buyer Collection Confirmation & Receipt UX**:
   - Updated order receipt in [`app/(store)/orders/[id]/page.tsx`](../../app/(store)/orders/[id]/page.tsx):
     - Displays a prominent amber "Ready for collection" notice.
     - Extracts the runner's locker PIN from the timeline note and renders a high-visibility PIN pickup badge.
     - Adds "At locker" milestone node to [`components/orders/OrderTimeline.tsx`](../../components/orders/OrderTimeline.tsx).
   - Updated [`app/(store)/orders/[id]/OrderActions.tsx`](../../app/(store)/orders/[id]/OrderActions.tsx):
     - Enables buyer action when `order.status === 'READY_FOR_COLLECTION'`.
     - Contextually labels button "Confirm collection" with locker-specific modal confirmation dialog.
     - Upon confirmation, advances order to `'DELIVERED'`, marks delivery on timeline, and settles associated payables.

5. **Clerk Auth & Multi-Worker Hardening**:
   - Hardened [`app/sign-in/actions.ts`](../../app/sign-in/actions.ts) with exponential backoff retries for Clerk session creation to eliminate intermittent network latency timeouts.
   - Updated [`e2e/auth.setup.ts`](../../e2e/auth.setup.ts) to explicitly wait for demo buttons to be enabled (`toBeEnabled()`) before clicking.

6. **E2E Test & Demo Videos (Journey F04)**:
   - Built Playwright Journey **F04** in [`e2e/storefront/b-buy-closeout.spec.ts`](../../e2e/storefront/b-buy-closeout.spec.ts), verifying:
     1. Buyer (Kefilwe) checks out with collection point delivery.
     2. Supplier (Naledi) marks order ready for pickup.
     3. Runner (Kagiso) picks up order from supplier.
     4. Runner navigates to collection point and enters locker drop-off code `LCK-7711`.
     5. Buyer verifies order status `Ready for collection` and views locker PIN.
     6. Buyer confirms collection, transitioning order to `DELIVERED`.
   - Verified 19/19 tests passing across phone (390px) and desktop viewports.
   - Demo videos generated:
     - `demo-videos/F04-phone.mp4`
     - `demo-videos/F04-phone-kagiso.mp4`
     - `demo-videos/F04-phone-naledi.mp4`
     - `demo-videos/F04-desktop.mp4`
     - `demo-videos/F04-desktop-kagiso.mp4`
     - `demo-videos/F04-desktop-naledi.mp4`

## Next Steps
- Implement **Refunds & Disputes Settlement Reversal (Journey G11 & Scope Feature 14)** in the team console (`/admin/payables`).
- Validate **Mobile Golden Thread (Journey Z02)** at 390px viewport against the Alibaba buyer app benchmark.
