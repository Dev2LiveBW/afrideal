# Customs & Duty in Landed Price (Scope Feature 9 & Journey B11)

**Date:** 2026-10-11

## Summary
Successfully implemented and verified **Customs & Duty included in Landed Price (Feature 9)** across the storefront, cart, checkout, and order receipt flows. As merchant of record, AfriDeal clears all cross-border customs and VAT at the Botswana border, ensuring buyers pay one unified landed price without surprise clearing fees upon delivery. Journey B11 has been verified end-to-end with Playwright and demo videos recorded at both phone (390px Alibaba mobile benchmark) and desktop viewports.

## Accomplishments

1. **Storefront Product Pricing & Landed Clarification**:
   - Updated [`app/(store)/products/[id]/ProductBuyPanel.tsx`](../../app/(store)/products/[id]/ProductBuyPanel.tsx) to display the `"Customs & duty included"` badge for imported items (e.g. South African goods like `p002`) alongside the unit price.
   - Preserved all exact text selectors (`"Price per unit"`) required by existing automated suites.

2. **Cart & Checkout Order Summary Alignment**:
   - In [`app/(store)/checkout/CheckoutClient.tsx`](../../app/(store)/checkout/CheckoutClient.tsx), aligned the summary panel heading to `"Order summary"`.
   - Added automatic detection of imported products in the basket (`country_of_origin !== 'BW'`).
   - Added the explicit `"Customs & Duty"` line item to the cost breakdown (`[Included]` badge and `"Covered by AfriDeal"` note) before the final total.
   - Enhanced the buyer reassurance card at checkout to clarify that AfriDeal clears all border customs and duties directly on behalf of the customer.
   - Mirrored the breakdown in [`app/(store)/cart/CartClient.tsx`](../../app/(store)/cart/CartClient.tsx).

3. **Order Receipt & Post-Purchase Confidence**:
   - In [`app/(store)/orders/[id]/page.tsx`](../../app/(store)/orders/[id]/page.tsx), added the `"Customs & Duty: Included (Covered by AfriDeal)"` line item under the payment summary for orders containing imported lines.

4. **E2E Test & Demo Videos (Journey B11)**:
   - Activated journey **B11** in [`e2e/storefront/b-buy-closeout.spec.ts`](../../e2e/storefront/b-buy-closeout.spec.ts).
   - Verified that visiting an imported product (`p002`), adding it to cart, and proceeding to `/checkout` displays the explicit `"Customs & Duty"` line item covered by AfriDeal.
   - Ran demo E2E suite across phone and desktop viewports (11/11 tests passing in 3.4m).
   - Produced converted demo MP4s:
     - `demo-videos/B11-phone.mp4`
     - `demo-videos/B11-desktop.mp4`

## Status & Progress

With **B09** (Card payments), **B10** (Collection point delivery), and **B11** (Customs & duty in landed price) completed and verified with video recordings, Package 2 & 3 closeouts for checkout and buyer journeys are fully verified.
