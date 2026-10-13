# Collection Point Delivery (Scope Feature 10 & Journey B10)

**Date:** 2026-10-11

## Summary
Successfully implemented and verified **Collection Point Delivery (Feature 10)** end-to-end. Buyers in Botswana can now choose between direct Doorstep delivery by runner (BWP 45.00) or self-service pickup from secure 24/7 smart lockers (from BWP 25.00), including `Gaborone Central Locker`, `Francistown Main Mall Locker`, and `Maun Airport Locker`. The order flow, dynamic fee adjustments, and order confirmation receipt details have been validated with Playwright E2E tests, and high-fidelity demo videos were recorded at both phone (390px) and desktop viewports.

## Accomplishments

1. **Checkout UI & Delivery Mode Switching**:
   - Added interactive radio option controls in [`app/(store)/checkout/CheckoutClient.tsx`](../../app/(store)/checkout/CheckoutClient.tsx) allowing buyers to toggle between "Doorstep delivery" (runner) and "Collection Point" (smart locker).
   - Embedded a smart locker location combobox displaying active pickup stations:
     - `Gaborone Central Locker` (Station Mall, Gaborone) · BWP 25.00
     - `Francistown Main Mall Locker` (Blue Jacket St, Francistown) · BWP 30.00
     - `Maun Airport Locker` (Airport Road, Maun) · BWP 35.00
   - Dynamically recalculated delivery fee and order total in the client summary based on the chosen collection point.

2. **Order API & Schema Enhancements**:
   - Updated `Order` interface in [`types/index.ts`](../../types/index.ts) with `delivery_method` (`'DOORSTEP' | 'COLLECTION_POINT'`) and `collection_point`.
   - Updated [`app/api/orders/route.ts`](../../app/api/orders/route.ts) to parse and validate collection point details, dynamically calculating the appropriate delivery fee (BWP 25.00 for locker vs BWP 45.00 for runner doorstep delivery).
   - Persisted the locker address and pickup location to the order record without breaking downstream runner or reporting consumers.

3. **Order Confirmation & Tracking**:
   - Updated the order detail page in [`app/(store)/orders/[id]/page.tsx`](../../app/(store)/orders/[id]/page.tsx) to surface the "Collection Point" badge, locker address, and locker PIN notification notice upon completed payment.

4. **E2E Test & Demo Videos (Journey B10)**:
   - Activated journey **B10** in [`e2e/storefront/b-buy-closeout.spec.ts`](../../e2e/storefront/b-buy-closeout.spec.ts), asserting cart addition, collection point selection, smart locker location choice, mock card payment, and receipt verification.
   - Successfully ran the test suite across both phone (390px Alibaba benchmark) and desktop viewports (11/11 tests passed).
   - Generated video recordings:
     - `demo-videos/B10-phone.mp4`
     - `demo-videos/B10-desktop.mp4`

## Next Steps
- Implement **Runner Drop-off at Collection Point (Journey F04)** in the runner portal (`/runner/jobs`), allowing runners to complete drop-off with a locker confirmation code.
- Implement **Customs & Duty in Landed Price (Scope Feature 9 & Journey B11)** for imported South African inventory lines.
