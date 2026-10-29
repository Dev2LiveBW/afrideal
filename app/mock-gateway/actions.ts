'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import { findById, readAll } from '@/lib/db';
import { mockGatewayAvailable } from '@/lib/payments/adapters';
import { SIGNATURE_HEADER, signCallback } from '@/lib/payments/signature';

/**
 * The stand-in gateway "taking" a card (spec 0003, scope feature 4).
 *
 * It does what a real gateway does after the buyer pays: send a signed callback
 * to /api/payments/mock/callback. It never calls confirmPayment() itself, so the
 * mock goes through the same signature check, staleness check and lookup a real
 * gateway will. The amount comes from the stored attempt, never from the page.
 */
export async function submitMockCard(formData: FormData): Promise<void> {
  if (!mockGatewayAvailable()) throw new Error('The mock gateway is switched off.');

  const reference = String(formData.get('reference') ?? '');
  const outcome = formData.get('outcome') === 'FAILED' ? 'FAILED' : 'CONFIRMED';

  const attempt = (await readAll('payments')).find(
    (row) => row.provider === 'MOCK' && row.provider_reference === reference,
  );
  if (!attempt) throw new Error('No payment matches that reference.');

  // Only the buyer who placed the order can pay for it here.
  const session = await auth();
  const order = await findById('orders', attempt.order_id);
  if (!session?.user || !order || order.customer_id !== session.user.id) {
    throw new Error('That payment belongs to another account.');
  }

  if (attempt.status === 'STARTED') {
    const rawBody = JSON.stringify({
      reference,
      status: outcome,
      amount: attempt.amount,
      // What the order is charged in (spec 0009), as a real gateway reports it.
      currency: order.currency ?? 'BWP',
      occurred_at: new Date().toISOString(),
      ...(outcome === 'FAILED' ? { reason: 'Card declined (mock gateway)' } : {}),
    });

    const incoming = headers();
    const host = incoming.get('x-forwarded-host') ?? incoming.get('host');
    const protocol = incoming.get('x-forwarded-proto') ?? 'http';

    const response = await fetch(`${protocol}://${host}/api/payments/mock/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', [SIGNATURE_HEADER]: signCallback('MOCK', rawBody) },
      body: rawBody,
      cache: 'no-store',
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.error ?? `The payment callback was refused (${response.status}).`);
    }
  }

  redirect(`/orders/${attempt.order_id}?placed=1`);
}
