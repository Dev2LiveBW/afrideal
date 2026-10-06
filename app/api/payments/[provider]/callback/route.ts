import { z } from 'zod';

import { fail, handled, ok } from '@/lib/api';
import { readAll } from '@/lib/db';
import { CALLBACK_ACTOR, confirmPayment, failPayment } from '@/lib/payments/confirm';
import { SIGNATURE_HEADER, isStale, verifyCallback } from '@/lib/payments/signature';
import type { PaymentProvider } from '@/types';

/**
 * Where a payment provider tells us what happened (spec 0003).
 *
 * This is the only unauthenticated write path in the application. It carries no
 * session on purpose, because a gateway has none: the signature is the whole of
 * its security, so the handler verifies before doing anything else and keeps its
 * surface as narrow as it can.
 *
 * `middleware.ts` already passes `/api` straight through, so there is nothing to
 * change there; the protection lives entirely here.
 *
 * ## Why the status codes matter
 *
 * A gateway retries anything that is not 2xx, often for hours. So:
 * - a replay returns 200, because the work is already done and retrying is pointless
 * - an unknown reference returns 404, which is final rather than a retry loop
 * - a business refusal returns 409, also final: more tries will not change it
 * - only an unexpected fault returns 500, the one case worth retrying
 */
export const dynamic = 'force-dynamic';

const PROVIDERS = ['MOCK', 'DPO_PAY', 'ORANGE_MONEY', 'PAYGATE', 'EFT'] as const;

const CallbackSchema = z.object({
  /** The provider's own reference, which is how we find the attempt. */
  reference: z.string().min(1),
  status: z.enum(['CONFIRMED', 'FAILED']),
  amount: z.number(),
  currency: z.string().min(3),
  occurred_at: z.string().min(1),
  /** Optional. The spec fixes no vocabulary for this, so it is stored as given. */
  reason: z.string().max(500).optional(),
});

function isProvider(value: string): value is PaymentProvider {
  return (PROVIDERS as readonly string[]).includes(value);
}

export const POST = handled(
  async (request: Request, { params }: { params: { provider: string } }) => {
    const provider = params.provider.toUpperCase();
    if (!isProvider(provider)) return fail('Unknown payment provider.', 404);

    // The raw text, before any parse. Hashing a re-serialised object would change
    // key order and spacing, so a genuine signature would never match.
    const rawBody = await request.text();

    const signature = request.headers.get(SIGNATURE_HEADER);
    const check = verifyCallback(provider, rawBody, signature);
    if (!check.ok) {
      // Deliberately vague: telling a caller whether the signature was absent or
      // merely wrong helps them probe. The detail stays in our own logs.
      return fail('Signature could not be verified.', 401);
    }

    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return fail('Callback body was not valid JSON.', 400);
    }

    const parsed = CallbackSchema.safeParse(payload);
    if (!parsed.success) return fail('Callback body was not in the expected shape.', 422);

    // A signed but ancient callback is refused, so a captured request cannot be
    // replayed days later even with a valid signature.
    if (isStale(parsed.data.occurred_at)) return fail('Callback is too old to act on.', 409);

    // Find the attempt this callback belongs to. The reference is the only link a
    // provider has to our data, which is why it is unique per provider.
    const payments = await readAll('payments');
    const attempt = payments.find(
      (row) => row.provider === provider && row.provider_reference === parsed.data.reference,
    );

    if (!attempt) return fail('No payment matches that reference.', 404);

    if (parsed.data.status === 'FAILED') {
      const failed = await failPayment({
        orderId: attempt.order_id,
        provider,
        providerReference: parsed.data.reference,
        reason: parsed.data.reason ?? null,
        actor: CALLBACK_ACTOR,
      });

      // Already confirmed means an out of order notification. Final, so the
      // response must not invite another delivery attempt.
      if (!failed.ok) {
        return failed.reason === 'ALREADY_CONFIRMED'
          ? fail('That payment is already confirmed.', 409)
          : fail('No payment matches that reference.', 404);
      }

      return ok({ status: 'FAILED', order_id: attempt.order_id });
    }

    const result = await confirmPayment({
      orderId: attempt.order_id,
      provider,
      providerReference: parsed.data.reference,
      amount: parsed.data.amount,
      actor: CALLBACK_ACTOR,
    });

    if (!result.ok) {
      if (result.reason === 'NOT_FOUND') return fail('That order no longer exists.', 404);
      // Both remaining refusals need a human, not another delivery attempt.
      if (result.reason === 'CANCELLED_BY_PERSON') {
        return fail('That order was cancelled and will not be reopened by a payment.', 409);
      }
      return fail('That order already has a different confirmed payment.', 409);
    }

    // 200 whether this call did the work or finished someone else's: from the
    // provider's side both mean "received, nothing more to do".
    return ok({
      status: 'CONFIRMED',
      order_id: result.order.id,
      order_status: result.order.status,
      replayed: result.replayed,
      late: result.late,
      amount_matches: result.payment.amount_matches,
    });
  },
);
