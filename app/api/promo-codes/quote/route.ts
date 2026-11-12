import { z } from 'zod';

import { fail, guard, handled, ok } from '@/lib/api';
import { throttle } from '@/lib/rate-limit';
import { priceOrder, resolveLane } from '@/lib/order-lines';
import { evaluateCode } from '@/lib/promo-codes';

export const dynamic = 'force-dynamic';

const QuoteSchema = z.object({
  code: z.string().trim().min(1, 'Enter a code.').max(40),
  lines: z
    .array(z.object({ product_id: z.string(), variant_id: z.string(), qty: z.number().int().min(1).max(999) }))
    .min(1, 'Your cart is empty.'),
  delivery_country: z.string().trim().toUpperCase().length(2).optional(),
  delivery_method: z.enum(['DOORSTEP', 'COLLECTION_POINT']).optional().default('DOORSTEP'),
  collection_point: z.string().nullish(),
});

/**
 * Spec 0011, AC-21 to AC-23: what a code takes off this cart, worked out exactly
 * as the order will be. Signed in only, and an unknown code and a switched off
 * code answer alike, so codes cannot be probed by message.
 */
export const POST = handled(async (request: Request) => {
  const { actor, response } = await guard(['CUSTOMER']);
  if (response) return response;

  const throttled = throttle('promoQuote', actor.id);
  if (throttled) return throttled;

  const parsed = QuoteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Check the code.', 422);

  const lane = await resolveLane(parsed.data);
  if (!lane.ok) return fail(lane.error, lane.status);

  const built = await priceOrder(parsed.data.lines, lane, actor.customerType);
  if (!built.ok) return fail(built.error, built.status);

  const { code, result } = await evaluateCode({ code: parsed.data.code, buyerId: actor.id, built, lane });
  if (!result.ok) return fail(result.reason, 422);

  return ok({
    code,
    discount: result.discount,
    discount_pula: result.discountPula,
    capped: result.capped,
    total: Math.round((built.subtotal - result.discount + lane.deliveryFee) * 100) / 100,
  });
});
