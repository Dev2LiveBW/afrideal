import { fail, guard, handled, ok } from '@/lib/api';
import { findById, insert, nextIds, readAll } from '@/lib/db';
import { startPayment } from '@/lib/payments/adapters';
import { windowHasClosed } from '@/lib/payments/policy';
import type { Payment } from '@/types';

/**
 * Start another payment attempt on an order that is still waiting (AC-10).
 *
 * A declined card should not cost the buyer their basket. The order stays put and
 * this opens a fresh attempt against it, until the deadline passes.
 *
 * Only the buyer who owns the order may do this. Staff confirming a bank transfer
 * go through the mark as paid action instead, which is a different authority.
 */
export const dynamic = 'force-dynamic';

export const POST = handled(async (_request: Request, { params }: { params: { id: string } }) => {
  const { actor, response } = await guard();
  if (response) return response;

  const order = await findById('orders', params.id);
  if (!order) return fail('That order does not exist.', 404);

  // Ownership, not role: a signed in stranger must not be able to open payment
  // attempts against someone else's order.
  if (order.customer_id !== actor.id) return fail('That is not your order.', 403);

  const payments = await readAll('payments');
  const mine = payments.filter((row) => row.order_id === order.id);

  if (mine.some((row) => row.status === 'CONFIRMED')) {
    return fail('That order is already paid for.', 409);
  }

  if (order.status !== 'AWAITING_PAYMENT') {
    return fail('That order is not waiting for payment.', 409);
  }

  // The deadline is the whole point of the window. Reopening past it would let a
  // buyer pay for an order the clock has already released.
  if (windowHasClosed(order)) {
    return fail('The payment window for that order has closed.', 409);
  }

  // An attempt still open is handed back rather than duplicated, so a buyer who
  // double taps does not litter the order with STARTED rows.
  const open = mine.find((row) => row.status === 'STARTED');
  if (open) {
    const existing = await startPayment(order);
    return ok({
      payment: {
        id: open.id,
        provider: open.provider,
        reference: open.provider_reference,
        redirect_url: existing.redirectUrl,
        instructions: existing.instructions,
      },
      reused: true,
    });
  }

  const started = await startPayment(order);
  const [paymentId] = await nextIds('payments', 'pmt', 1);
  const now = new Date().toISOString();

  const payment: Payment = {
    id: paymentId,
    order_id: order.id,
    provider: started.provider,
    provider_reference: started.providerReference,
    status: 'STARTED',
    amount: order.total,
    amount_matches: false,
    created_at: now,
    confirmed_at: null,
    failure_reason: null,
    note: null,
  };

  await insert('payments', payment);

  return ok(
    {
      payment: {
        id: payment.id,
        provider: payment.provider,
        reference: payment.provider_reference,
        redirect_url: started.redirectUrl,
        instructions: started.instructions,
      },
      reused: false,
    },
    { status: 201 },
  );
});
