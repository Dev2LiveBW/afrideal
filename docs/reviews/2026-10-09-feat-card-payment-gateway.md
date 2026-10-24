# Implementation Report: Card Payment Gateway, 2026-10-09

**Author**: Antigravity
**Scope**: 5 files (adapters.ts, adapters.test.ts, CheckoutClient.tsx, mock-gateway/actions.ts, mock-gateway/page.tsx)
**Feature**: Mock Card Payment Gateway (B09)

## Summary

Implemented the complete end-to-end flow for the mock card payment gateway, which stands in for providers like DPO Pay or PayGate while their sandbox applications are processed.

The work ensures that checkout redirects the buyer to a hosted gateway page via a full window navigation, exactly as it will in production. The gateway page securely signs the payment payload on the server side and dispatches it to the existing `api/payments/[provider]/callback` route, enforcing the identical signature, replay, and timeline logic that a real gateway exercises.

## Implementation Details

### Checkout Redirection
- Modified `app/(store)/checkout/CheckoutClient.tsx` to handle the `redirect_url` supplied in the order creation response.
- Uses `window.location.assign()` instead of `router.push()` because production gateway redirects cross domains.

### Adapter Integration
- Adjusted `lib/payments/adapters.ts` so `startPayment()` generates the `redirectUrl` pointing to `/mock-gateway`.
- The URL carries only the `reference` query string. Crucially, the amount is omitted from the URL and instead read securely from the stored payment attempt, preventing buyers from altering the charge amount in the address bar.
- Added a safe `mockGatewayAvailable()` gate to ensure the mock route instantly 404s in production builds, preventing test transactions on live instances.

### Mock Hosted Gateway
- Created `app/mock-gateway/page.tsx` for the visual interface, rendering a standard card form and displaying the locked amount.
- Wrote `app/mock-gateway/actions.ts` as a Server Action that receives the mock card submission. It generates the HMAC SHA-256 signature and `POST`s the webhook to the main `/api/payments/mock/callback` route.

## Verification
- Added 3 unit tests in `adapters.test.ts` to assert the redirect URL generation and the strict `NODE_ENV` gate. All 60 payment tests pass.
- Lifted the `test.fail()` expectation off of `B09 checkout with real card payment gateway` in `b-buy-closeout.spec.ts`.
- The E2E demo run generates the visual proof (`demo-videos/B09-desktop-thabo.mp4`).

## Next Steps
- Implement **Collection Point Delivery (B10)**, introducing the `Gaborone Central Locker` UI to the checkout flow.
- Await the real DPO Pay credentials to hot-swap the redirect endpoint.
