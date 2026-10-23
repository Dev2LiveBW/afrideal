import { fail, handled, ok } from '@/lib/api';
import { readAll } from '@/lib/db';
import { CALLBACK_ACTOR, confirmPayment, failPayment } from '@/lib/payments/confirm';
import { STRIPE_SIGNATURE_HEADER, interpretStripeEvent, verifyStripeEvent } from '@/lib/payments/stripe';

/**
 * Where Stripe tells us what happened to a Checkout session (spec 0010).
 *
 * Like spec 0003's callback, this carries no session and authenticates by
 * signature alone, so it verifies before doing anything else. It is its own
 * route because Stripe signs its own way (`Stripe-Signature`, over the raw body
 * with a timestamp), and so the generic callback can never be used to confirm a
 * Stripe payment with some other secret.
 *
 * ## Why almost everything is a 200
 *
 * Stripe retries every non-2xx for up to three days and disables an endpoint
 * that keeps failing. So the only non-2xx answers are a bad signature (nothing
 * we will ever accept) and an unexpected fault (worth a retry). A replay, a
 * business refusal, an event we do not act on and a session this environment
 * never opened are all final, and all 200, with what happened in the body.
 * Refusals are already flagged for finance inside confirmPayment().
 */
export const dynamic = 'force-dynamic';

export const POST = handled(async (request: Request) => {
  // The raw text, before any parse: the signature covers the exact bytes.
  const rawBody = await request.text();

  const check = verifyStripeEvent(rawBody, request.headers.get(STRIPE_SIGNATURE_HEADER));
  if (!check.ok) {
    if (check.reason === 'NOT_CONFIGURED') return fail('Stripe is not configured here.', 404);
    // Deliberately vague about why, as with the generic callback.
    return fail('Signature could not be verified.', 401);
  }

  const outcome = interpretStripeEvent(check.event);
  if (outcome.kind === 'IGNORED') return ok({ received: true, ignored: outcome.why });

  // The session id is the attempt's reference. One Stripe sandbox can feed
  // several environments (local, e2e, a preview) and every endpoint receives
  // every event, so a session we never opened is someone else's, not an error.
  const attempt = (await readAll('payments')).find(
    (row) => row.provider === 'STRIPE' && row.provider_reference === outcome.reference,
  );
  if (!attempt) return ok({ received: true, ignored: 'no payment here matches that session' });

  if (outcome.kind === 'FAILED') {
    const failed = await failPayment({
      orderId: attempt.order_id,
      provider: 'STRIPE',
      providerReference: outcome.reference,
      reason: outcome.reason,
      actor: CALLBACK_ACTOR,
    });
    // Already confirmed: an expiry that raced a payment, or arrived out of order.
    return ok({
      received: true,
      status: failed.ok ? 'FAILED' : 'IGNORED',
      order_id: attempt.order_id,
      ...(failed.ok ? {} : { ignored: failed.reason }),
    });
  }

  const result = await confirmPayment({
    orderId: attempt.order_id,
    provider: 'STRIPE',
    providerReference: outcome.reference,
    amount: outcome.amount,
    currency: outcome.currency,
    actor: CALLBACK_ACTOR,
  });

  if (!result.ok) {
    return ok({ received: true, status: 'REFUSED', reason: result.reason, order_id: attempt.order_id });
  }

  return ok({
    received: true,
    status: 'CONFIRMED',
    order_id: result.order.id,
    order_status: result.order.status,
    replayed: result.replayed,
    late: result.late,
    amount_matches: result.payment.amount_matches,
  });
});
