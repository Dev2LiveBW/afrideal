# Orders List Clean-Up & Tracking (Scope Feature 20 & Journey B04)

**Date:** 2026-10-11

## Summary
Successfully implemented and verified **Orders List Clean-Up (Scope Feature 20)** and **Order Timeline Tracking (Journey B04)**, resolving the longstanding text encoding mojibake and optimizing the buyer orders list for high mobile density.

Every order card on `/orders` now renders with compact density (height ~70px at 390px, strictly `<= 120px`), collapses order metadata into two clean lines, replaces all stray `Â·` Latin-1 artifacts with proper unicode middle dots (`·`), and provides an uninterrupted transition into the live order tracking timeline.

Both `K01` (orders list integrity & height constraint) and `K02` (runner requests list integrity) have graduated from `test.fail()` known issues into active, passing Playwright guards. Playwright Journey **B04** passed 100% green across mobile and desktop viewports, and captioned demo videos have been generated.

---

## Accomplishments

1. **Mojibake Elimination Across the Storefront**:
   - Fixed `app/(store)/orders/page.tsx`: replaced `Â·` with clean middle dot `·` in order metadata.
   - Fixed `app/(store)/requests/page.tsx`: replaced `Â·` with clean middle dot `·` in request metadata.
   - Fixed `components/v4/v4-footer.tsx`: replaced `Â©` with unicode copyright `©`.
   - Verified zero occurrences of `Â` across all TypeScript and TSX files in `app/` and `components/`.

2. **Mobile Row Density Optimization (`app/(store)/orders/page.tsx`)**:
   - Replaced multi-row wrapped flex container with a structured, single-row card layout.
   - Reduced mobile padding to `p-3.5` (`sm:p-5`), matching the mobile design rhythm.
   - Scaled thumbnails to `h-10 w-10` (`sm:h-11 sm:w-11`).
   - Collapsed metadata to exactly two lines:
     - **Line 1:** Order reference (`AFD-...`) alongside an inline compact status badge (`StatusBadge size="sm"` on mobile; full badge on desktop).
     - **Line 2:** Formatted date, item count, and payment method with ellipsis truncation.
   - Right-aligned order total and `Track →` action link.
   - Total card height at 390px measures ~70px, easily beating the benchmark threshold of `<= 120px`.

3. **Graduation of Known-Issue Guards (`e2e/access/known-issues.spec.ts`)**:
   - Removed `test.fail(true)` from `K01` and `K02`.
   - Added automated bounding-box height assertion verifying that every rendered order row in `main ul > li` is `<= 120px`.
   - Maintained `expectHealthy(page)` assertions ensuring no garbled characters appear on either `/orders` or `/requests`.

4. **E2E Journey B04 Strengthening (`e2e/storefront/b-buy.spec.ts`)**:
   - Updated Journey **B04** to start at the buyer orders list (`/orders`), locate the seeded in-transit order (`AFD-24814`), verify the row height constraint, click through to `/orders/o005`, and verify all milestones on the progress timeline (`Placed`, `Paid`, `Preparing`, `Collected`, `In transit`, `Delivered`).
   - Re-verified alongside B01, B02, B08, and C01 (21/21 tests passing).

5. **Demo Video Artifacts Generated**:
   - `demo-videos/B04-phone.mp4` (Mobile 390px timeline tracking)
   - `demo-videos/B04-desktop.mp4` (Desktop timeline tracking)
   - `demo-videos/K01-desktop.mp4` (Orders list density & integrity guard)
   - `demo-videos/K02-desktop.mp4` (Runner requests list integrity guard)

---

## Next Steps
- Implement **Refunds & Disputes Settlement Reversal (Journey G11 & Scope Feature 14)** in the team console (`/admin/payables`).
- Implement **Finance Controls: Mark as Paid for EFT & Pause Checkout (Scope Feature 13)**.
