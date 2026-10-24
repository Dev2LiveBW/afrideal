# Mobile Golden Thread (Scope Feature 5 & Journey Z02)

**Date:** 2026-10-11

## Summary
Successfully implemented and verified the **Mobile Golden Thread (Journey Z02)** end-to-end against the 390px Alibaba buyer app benchmark, completing **Feature 5 (Phone Checkout)** and mobile storefront parity.

The golden thread shopping flow exercises the full mobile buying lifecycle from discovery to payment confirmation:
1. **Category Browse:** Navigating from the Alibaba benchmark home page into `/categories` and selecting the "Beauty & personal care" category.
2. **Sticky Mobile Buy Bar:** Pinned bottom bar on `/products/[id]` (`z-[60]`) with instant "Add to cart" action.
3. **Slide-up Cart Sheet:** High-density, gesture-ready cart sheet (`components/storefront/CartSheet.tsx`) built with Framer Motion following benchmark §4b timings (0.18s mask fade, 0.22s slide with ease `[0.22, 0.61, 0.36, 1]`), full line item controls, and direct "Proceed to checkout".
4. **Phone Checkout:** Single-column mobile checkout layout with a pinned sticky "Place order" action bar at `bottom-[calc(56px+env(safe-area-inset-bottom))]` so the primary action is thumb-reachable without scrolling.
5. **Card Payment Gateway:** Clean redirect handoff to the card gateway, payment processing with HMAC-signed webhooks, and return to `/orders/[id]?placed=1`.
6. **Payment Confirmation & Order Tracking:** Live order receipt rendering "Payment confirmed" and timeline milestone progression with zero horizontal scroll (`scrollWidth <= viewportWidth`).

Playwright E2E Journey **Z02** passed 100% green across both phone (390px Alibaba mobile benchmark) and desktop viewports, and high-fidelity captioned demo videos were generated.

---

## Accomplishments

1. **Slide-up Cart Sheet (`components/storefront/CartSheet.tsx`)**:
   - Built with Framer Motion following Alibaba benchmark §4b specs:
     - Backdrop mask: `rgba(0, 0, 0, 0.4)` with 0.18s linear fade.
     - Sheet container: Slide-up from bottom with 0.22s `cubic-bezier(0.22, 0.61, 0.36, 1)`.
   - Renders product thumbnails, item titles, quantity steppers (increment, decrement, remove), subtotal, delivery fee calculation, and primary checkout CTA.
   - Wired to global Zustand cart store (`useAfriDealStore`).

2. **Product Page Sticky Buy Bar Integration (`app/(store)/products/[id]/ProductBuyPanel.tsx`)**:
   - Pinned mobile action bar at `bottom-[calc(56px+env(safe-area-inset-bottom))]` on mobile (`lg:static`).
   - Wired "View cart" button directly to the slide-up `CartSheet` state (`cartSheetOpen`).
   - Cleaned up nested `<button>` markup to ensure semantic HTML compliance and eliminate accessibility/strict-mode collisions.

3. **Phone Checkout Sticky Action Bar (`app/(store)/checkout/CheckoutClient.tsx`)**:
   - Added sticky "Place order" bar on mobile (`lg:hidden`, `z-[60]`) pinned above the safe area.
   - Connected button to `form="checkout-form"` for immediate submission without scrolling down the page.
   - Enclosure card button on desktop remains `hidden lg:inline-flex` to prevent duplicate interactive elements in the DOM.
   - Padded container to `pb-36 pt-20` on mobile to prevent content overlap with the sticky bar.

4. **Zero Horizontal Overflow Enforcement at 390px**:
   - Asserted `document.documentElement.scrollWidth <= viewportWidth + 2` across every stage of the mobile journey:
     - Home page (`/`)
     - Category browser (`/categories`)
     - Product detail (`/products/[id]`)
     - Checkout (`/checkout`)
     - Order tracking (`/orders/[id]`)

5. **E2E Test & Demo Videos (Journey Z02)**:
   - Built Playwright Journey **Z02** in [`e2e/storefront/b-buy-closeout.spec.ts`](../../e2e/storefront/b-buy-closeout.spec.ts), verifying:
     1. Home page & category browsing at 390px.
     2. Sticky mobile buy bar adds product to cart with toast notification.
     3. Slide-up cart sheet displays items, calculates total, and proceeds to checkout.
     4. Mobile checkout enters delivery address and chooses DPO Pay card payment.
     5. Card payment completed via gateway.
     6. Order tracking verifies "Payment confirmed" and "Paid" timeline milestone.
   - Verified 11/11 tests passing in demo run.
   - Captioned demo MP4 videos generated:
     - `demo-videos/Z02-phone.mp4` (390×844 mobile viewport)
     - `demo-videos/Z02-desktop.mp4` (1280×720 desktop viewport)

---

## Next Steps
- Implement **Refunds & Disputes Settlement Reversal (Journey G11 & Scope Feature 14)** in the team console (`/admin/payables`).
- Review and verify **Phase 1 Closeout** feature set for upcoming production deployment.
