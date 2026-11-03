import 'server-only';

import { headers } from 'next/headers';

import { findById } from '@/lib/db';
import { mockAllowedInProduction } from '@/lib/payments/policy';
import {
  StripeLiveKeyError,
  checkoutSessionState,
  createCheckoutSession,
  expireCheckoutSession,
  stripeConfigured,
  stripeKeyState,
} from '@/lib/payments/stripe';
import type { Order, Payment, PaymentMethod, PaymentProvider } from '@/types';

/**
 * Which provider actually takes the money, and what the buyer does next
 * (specs 0003 and 0010).
 *
 * `PAYMENTS_PROVIDER=mock` routes every card and wallet order to a mock provider
 * that confirms through the same signed callback a real gateway uses. That is
 * what let the whole payment path be built and tested before any gateway existed.
 *
 * The card is a method; who takes it is `CARD_PROVIDER` (spec 0010): Stripe now,
 * DPO Pay once approved. Checkout and the order route only ever see `CARD`.
 */

/** What checkout hands back to the buyer once an order is waiting for payment. */
export type StartedPayment = {
  provider: PaymentProvider;
  /** What a callback arrives carrying, so it can find this attempt. */
  providerReference: string;
  /** Where to send the buyer. Null when there is nothing hosted to send them to. */
  redirectUrl: string | null;
  /** What the buyer must do by hand, for a bank transfer. Null otherwise. */
  instructions: string | null;
};

/**
 * A mock that can mark orders paid must never exist in production.
 *
 * Thrown rather than quietly falling back to a real provider: a misconfigured
 * deployment should fail loudly at the first checkout, not take money through a
 * path nobody meant to enable.
 */
export class MockProviderInProductionError extends Error {
  constructor() {
    super(
      'PAYMENTS_PROVIDER=mock is refused in production. A mock must not be able to mark orders paid.',
    );
    this.name = 'MockProviderInProductionError';
  }
}

function usingMock(): boolean {
  const mock = process.env.PAYMENTS_PROVIDER === 'mock';
  if (mock && process.env.NODE_ENV === 'production' && !mockAllowedInProduction()) {
    throw new MockProviderInProductionError();
  }
  return mock;
}

type CardProvider = 'MOCK' | 'STRIPE' | 'DPO_PAY';

/**
 * Who takes a card (spec 0010). `CARD_PROVIDER` decides; unset, the card follows
 * `PAYMENTS_PROVIDER`, so an environment on the mock keeps paying cards on the
 * mock and every other one uses Stripe.
 *
 * `CARD_PROVIDER=mock` is held to the same production gate as
 * `PAYMENTS_PROVIDER=mock`: a mock that can mark orders paid must not exist in
 * production, however it was switched on.
 */
function cardProvider(): CardProvider {
  const chosen = (process.env.CARD_PROVIDER ?? '').trim().toLowerCase();
  if (chosen === 'stripe') return 'STRIPE';
  if (chosen === 'dpo') return 'DPO_PAY';
  if (chosen === 'mock') {
    if (process.env.NODE_ENV === 'production' && !mockAllowedInProduction()) {
      throw new MockProviderInProductionError();
    }
    return 'MOCK';
  }
  return usingMock() ? 'MOCK' : 'STRIPE';
}

/** Whether the card's provider can actually take a payment right now. */
function cardIsLive(): boolean {
  const provider = cardProvider();
  if (provider === 'MOCK') return true;
  // A live key is not an error here: checkout simply does not offer the card,
  // and startPayment() is what refuses loudly.
  if (provider === 'STRIPE') return stripeConfigured();
  // DPO Pay's adapter is not built yet (spec 0010).
  return false;
}

/** A misconfigured mock in production offers nothing rather than throwing. */
function safely(check: () => boolean): boolean {
  try {
    return check();
  } catch {
    return false;
  }
}

/**
 * The methods a buyer can actually complete a payment with, right now.
 *
 * A bank transfer always works: finance marks it paid by hand. A card needs its
 * provider configured, and a wallet the mock until its own gateway exists.
 * Offering a method that can never complete would leave every order it touches
 * waiting for a payment that cannot arrive, so it is not offered at all.
 */
export function availablePaymentMethods(): PaymentMethod[] {
  const methods: PaymentMethod[] = [];
  if (safely(cardIsLive)) methods.push('CARD');
  if (safely(usingMock)) methods.push('ORANGE_MONEY', 'PAYGATE');
  return [...methods, 'EFT'];
}

/**
 * Whether the stand-in hosted page may exist. Never throws: when it is off the
 * page answers 404, and checkout is what fails loudly (usingMock above).
 *
 * Only with PAYMENTS_PROVIDER=mock (or CARD_PROVIDER=mock), and in a production
 * build only through the same opt in as the mock provider (ALLOW_MOCK_PAYMENTS=1
 * for CI and the e2e run), which is ignored on Vercel: a deployed site never
 * shows a page that can mark orders paid.
 */
export function mockGatewayAvailable(): boolean {
  const requested =
    process.env.PAYMENTS_PROVIDER === 'mock' || process.env.CARD_PROVIDER?.trim().toLowerCase() === 'mock';
  if (!requested) return false;
  return process.env.NODE_ENV !== 'production' || mockAllowedInProduction();
}

/**
 * The provider for a method.
 *
 * A bank transfer is always itself: there is no gateway in the middle, so mocking
 * it would mean mocking a human reading a bank statement.
 */
export function providerFor(method: PaymentMethod): PaymentProvider {
  if (method === 'EFT') return 'EFT';
  if (method === 'CARD') return cardProvider();
  return usingMock() ? 'MOCK' : method;
}

/**
 * The origin the buyer's browser is on, for the URLs a hosted page sends them
 * back to. Read from the request, because the same build serves localhost, the
 * e2e port and the deployed domain.
 */
function requestOrigin(): string {
  const incoming = headers();
  const host = incoming.get('x-forwarded-host') ?? incoming.get('host');
  if (!host) throw new Error('Cannot tell which site this request came from.');
  const local = host.startsWith('localhost') || host.startsWith('127.0.0.1');
  const protocol = incoming.get('x-forwarded-proto') ?? (local ? 'http' : 'https');
  return `${protocol}://${host}`;
}

/**
 * Open a payment attempt for an order.
 *
 * The reference is minted here rather than at confirmation because a callback has
 * to be able to find the attempt it belongs to. For a bank transfer it is the
 * order reference, which is what the buyer quotes to their bank; for Stripe it is
 * the Checkout session id.
 */
export async function startPayment(
  order: Order,
  options: { origin?: string } = {},
): Promise<StartedPayment> {
  const provider = providerFor(order.payment_method);

  if (provider === 'EFT') {
    return {
      provider,
      providerReference: order.reference,
      redirectUrl: null,
      instructions: await bankTransferInstructions(order),
    };
  }

  if (provider === 'STRIPE') {
    // Refused loudly: a live key must not take money through a path that was
    // only ever reviewed in test mode (spec 0010).
    if (stripeKeyState() === 'LIVE') throw new StripeLiveKeyError();
    const session = await createCheckoutSession(order, options.origin ?? requestOrigin());
    return {
      provider,
      providerReference: session.reference,
      redirectUrl: session.url,
      instructions: null,
    };
  }

  if (provider === 'DPO_PAY') {
    throw new Error('DPO Pay is not connected yet. Set CARD_PROVIDER=stripe (spec 0010).');
  }

  const providerReference = `${provider}-${order.id}-${Date.now().toString(36)}`;

  // The mock has a stand-in hosted page (app/mock-gateway) that confirms through
  // the signed callback, exactly as a real gateway does. Only the reference
  // travels in the URL: the page reads the amount from the stored attempt, so
  // editing the address bar cannot change what gets confirmed.
  const redirectUrl =
    provider === 'MOCK' ? `/mock-gateway?reference=${encodeURIComponent(providerReference)}` : null;

  return {
    provider,
    providerReference,
    redirectUrl,
    instructions: null,
  };
}

/**
 * Hand back an attempt that is still open, so a buyer who comes back (or double
 * taps "Pay") returns to the same payment rather than opening a second one.
 *
 * Returns null when the attempt can no longer be paid and a fresh one is needed.
 * A Stripe session is asked where it stands: a second session beside an open one
 * would let the buyer pay twice. Other providers keep spec 0003's behaviour of
 * re-issuing the hosted page for the same attempt.
 */
export async function resumePayment(
  order: Order,
  attempt: Payment,
  options: { origin?: string } = {},
): Promise<StartedPayment | null> {
  if (attempt.provider === 'STRIPE' && attempt.provider_reference) {
    const session = await checkoutSessionState(attempt.provider_reference);
    if (session.state === 'EXPIRED') return null;
    return {
      provider: 'STRIPE',
      providerReference: attempt.provider_reference,
      // Paid but not yet confirmed: nothing to send the buyer to, the webhook
      // moves the order in a moment.
      redirectUrl: session.state === 'OPEN' ? session.url : null,
      instructions: null,
    };
  }
  return startPayment(order, options);
}

/**
 * Close every attempt that could still take money for an order a person just
 * cancelled, so nobody pays for it afterwards (spec 0010). Best effort: a
 * payment that slips through is refused and flagged by confirmPayment(), which
 * is the backstop. Returns the references it closed.
 */
export async function closeOpenAttempts(attempts: Payment[]): Promise<string[]> {
  const closed: string[] = [];
  for (const attempt of attempts) {
    if (attempt.status !== 'STARTED' || attempt.provider !== 'STRIPE' || !attempt.provider_reference) continue;
    try {
      if (await expireCheckoutSession(attempt.provider_reference)) closed.push(attempt.provider_reference);
    } catch (error) {
      console.error(`[payments] could not expire Stripe session ${attempt.provider_reference}`, error);
    }
  }
  return closed;
}

/**
 * What a buyer paying by bank transfer needs to see.
 *
 * The account details come from the `eft_bank_details` setting, never from code.
 * If that setting is missing we say so plainly instead of inventing an account
 * number, because a wrong one sends a buyer's money to a stranger.
 */
async function bankTransferInstructions(order: Order): Promise<string> {
  const setting = await findById('settings', 'eft_bank_details');
  const raw = setting?.value?.text;
  const details = typeof raw === 'string' ? raw.trim() : '';

  const quote = `Use ${order.reference} as the payment reference so we can match your transfer.`;

  if (!details) {
    return `${quote} Our banking details will be sent to you shortly.`;
  }

  return `${details}\n\n${quote}`;
}
