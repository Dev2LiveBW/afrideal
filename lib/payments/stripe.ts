import 'server-only';

import Stripe from 'stripe';

import type { Order } from '@/types';

/**
 * Cards through Stripe Checkout, in test mode (spec 0010).
 *
 * Stripe is a provider behind the `CARD` method, not a method of its own, so
 * nothing outside `lib/payments` knows it is Stripe. DPO Pay slots in beside
 * this file with the same four calls when its application is approved.
 *
 * Everything that talks to Stripe takes a `StripeGateway` argument that
 * defaults to the real client, so the unit tests can hand in a fake and assert
 * on exactly what would have been sent.
 */

/** The parts of the Stripe client this module uses. */
export interface StripeGateway {
  checkout: {
    sessions: {
      create(
        params: Stripe.Checkout.SessionCreateParams,
      ): Promise<Pick<Stripe.Checkout.Session, 'id' | 'url'>>;
      retrieve(
        id: string,
      ): Promise<Pick<Stripe.Checkout.Session, 'id' | 'url' | 'status' | 'payment_intent'>>;
      expire(id: string): Promise<unknown>;
      list(params: Stripe.Checkout.SessionListParams): Promise<{ data: Pick<Stripe.Checkout.Session, 'id'>[] }>;
    };
  };
  refunds: {
    create(
      params: Stripe.RefundCreateParams,
      options?: Stripe.RequestOptions,
    ): Promise<Pick<Stripe.Refund, 'id' | 'status'>>;
  };
}

// ── Keys ─────────────────────────────────────────────────────────────────────

/**
 * A live key in the environment.
 *
 * Refused rather than used: live mode needs an account decision and its own
 * review (spec 0010, open questions), and the cheapest place to stop a copied
 * live key from taking real money is the line that would have used it.
 */
export class StripeLiveKeyError extends Error {
  constructor() {
    super('STRIPE_SECRET_KEY is a live key. Only Stripe test keys (sk_test_ or rk_test_) are accepted.');
    this.name = 'StripeLiveKeyError';
  }
}

export class StripeNotConfiguredError extends Error {
  constructor() {
    super('Stripe is not configured. Set STRIPE_SECRET_KEY (a test key) and STRIPE_WEBHOOK_SECRET.');
    this.name = 'StripeNotConfiguredError';
  }
}

export type StripeKeyState = 'MISSING' | 'TEST' | 'LIVE' | 'UNRECOGNISED';

export function stripeKeyState(key = process.env.STRIPE_SECRET_KEY): StripeKeyState {
  if (!key) return 'MISSING';
  if (/^(sk|rk)_test_/.test(key)) return 'TEST';
  if (/^(sk|rk)_live_/.test(key)) return 'LIVE';
  return 'UNRECOGNISED';
}

/**
 * Whether cards can be taken through Stripe right now: a test key to create
 * sessions and a webhook secret to believe what Stripe says happened. Without
 * the second, a buyer could pay and the order would never hear about it.
 */
export function stripeConfigured(): boolean {
  return stripeKeyState() === 'TEST' && Boolean(process.env.STRIPE_WEBHOOK_SECRET);
}

let cached: { key: string; client: Stripe } | null = null;

/** The real client, built once per key. Throws on a live or missing key. */
export function stripeGateway(): StripeGateway {
  const key = process.env.STRIPE_SECRET_KEY ?? '';
  const state = stripeKeyState(key);
  if (state === 'LIVE') throw new StripeLiveKeyError();
  if (state !== 'TEST') throw new StripeNotConfiguredError();

  if (cached?.key !== key) {
    cached = {
      key,
      // Retries carry an idempotency key the SDK adds itself, so a dropped
      // connection while creating a session cannot open two.
      client: new Stripe(key, { maxNetworkRetries: 2, timeout: 20_000, appInfo: { name: 'AfriDeal' } }),
    };
  }
  return cached.client;
}

// ── Money ────────────────────────────────────────────────────────────────────

/**
 * The currencies a buyer is charged in (spec 0009, answer 1). Both are
 * two-decimal currencies on Stripe's presentment list. Anything else is refused
 * here rather than sent, because a wrong decimal count would charge a buyer
 * a hundred times too much or too little.
 */
const CHARGEABLE = new Set(['BWP', 'ZAR']);

export class UnsupportedCurrencyError extends Error {
  constructor(currency: string) {
    super(`Cards cannot be charged in ${currency} yet. Stripe is set up for BWP and ZAR.`);
    this.name = 'UnsupportedCurrencyError';
  }
}

/** `329.5` BWP → `32950` thebe. */
export function toMinorUnits(amount: number, currency: string): number {
  if (!CHARGEABLE.has(currency.toUpperCase())) throw new UnsupportedCurrencyError(currency);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new RangeError(`A card charge must be a positive amount, not ${amount}.`);
  }
  return Math.round(amount * 100);
}

/** `32950` → `329.5`. Integer arithmetic first so `0.1 + 0.2` never creeps in. */
export function fromMinorUnits(minor: number): number {
  return Math.round(minor) / 100;
}

// ── Sessions ─────────────────────────────────────────────────────────────────

/**
 * How long a Checkout session stays payable. Stripe's minimum is 30 minutes;
 * one more absorbs clock drift between us and Stripe. The order's card window
 * is 35 (lib/payments/policy.ts), so the session closes first.
 */
export const SESSION_MINUTES = 31;

export type CheckoutStart = { reference: string; url: string };

/**
 * Open a hosted Checkout session for an order's total.
 *
 * Only the order id and reference go to Stripe, never the buyer's name, email
 * or address: what the buyer types on Stripe's page is theirs to give, and the
 * less personal data we copy abroad the less the data protection review has to
 * cover (spec 0009, answer 9).
 */
export async function createCheckoutSession(
  order: Pick<Order, 'id' | 'reference' | 'total' | 'currency'>,
  origin: string,
  gateway: StripeGateway = stripeGateway(),
  now = new Date(),
): Promise<CheckoutStart> {
  const currency = order.currency ?? 'BWP';
  const amount = toMinorUnits(order.total, currency);
  const orderUrl = `${origin.replace(/\/$/, '')}/orders/${encodeURIComponent(order.id)}`;
  const metadata = { order_id: order.id, order_reference: order.reference };

  const session = await gateway.checkout.sessions.create({
    mode: 'payment',
    // The current API filters the dashboard's methods rather than listing them
    // (payment_method_types is gone in stripe-node 23): only a card is offered.
    allowed_payment_method_types: ['card'],
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: currency.toLowerCase(),
          unit_amount: amount,
          product_data: { name: `AfriDeal order ${order.reference}` },
        },
      },
    ],
    client_reference_id: order.id,
    metadata,
    payment_intent_data: { metadata, description: `AfriDeal order ${order.reference}` },
    // The return pages show the order; whether it is paid is the webhook's to
    // say, never the redirect's.
    success_url: `${orderUrl}?placed=1&paid=card`,
    cancel_url: `${orderUrl}?placed=1`,
    expires_at: Math.floor(now.getTime() / 1000) + SESSION_MINUTES * 60,
  });

  if (!session.url) throw new Error(`Stripe opened session ${session.id} without a payment page.`);
  return { reference: session.id, url: session.url };
}

export type SessionState =
  | { state: 'OPEN'; url: string }
  /** Paid; the webhook is on its way or already here. */
  | { state: 'COMPLETE' }
  | { state: 'EXPIRED' };

/** Where an existing session stands, so a retry can hand it back rather than open another. */
export async function checkoutSessionState(
  reference: string,
  gateway: StripeGateway = stripeGateway(),
): Promise<SessionState> {
  const session = await gateway.checkout.sessions.retrieve(reference);
  if (session.status === 'open' && session.url) return { state: 'OPEN', url: session.url };
  if (session.status === 'complete') return { state: 'COMPLETE' };
  return { state: 'EXPIRED' };
}

/**
 * Close a session nobody should pay any more, such as one on an order a person
 * cancelled. Returns whether it was open. Stripe answers with
 * `checkout.session.expired`, which fails the attempt through the webhook.
 */
export async function expireCheckoutSession(
  reference: string,
  gateway: StripeGateway = stripeGateway(),
): Promise<boolean> {
  const session = await gateway.checkout.sessions.retrieve(reference);
  if (session.status !== 'open') return false;
  await gateway.checkout.sessions.expire(reference);
  return true;
}

/**
 * Give a buyer's money back through Stripe (spec 0010, refunds).
 *
 * Idempotent per `idempotencyKey`: finance pressing "Refund" twice, or a
 * request retried after a timeout, refunds once.
 */
export async function refundCheckoutPayment(
  args: { reference: string; amount: number; currency: string; idempotencyKey: string; reason?: string },
  gateway: StripeGateway = stripeGateway(),
): Promise<{ refundId: string }> {
  const session = await gateway.checkout.sessions.retrieve(args.reference);
  const intent = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
  if (!intent) throw new Error(`Stripe session ${args.reference} has no payment to refund.`);

  const refund = await gateway.refunds.create(
    {
      payment_intent: intent,
      amount: toMinorUnits(args.amount, args.currency),
      reason: 'requested_by_customer',
      metadata: { session: args.reference, ...(args.reason ? { note: args.reason.slice(0, 500) } : {}) },
    },
    { idempotencyKey: args.idempotencyKey },
  );
  return { refundId: refund.id };
}

// ── Webhook ──────────────────────────────────────────────────────────────────

export const STRIPE_SIGNATURE_HEADER = 'stripe-signature';

/**
 * How old a signature may be. Stripe signs every delivery afresh, retries
 * included, so five minutes is ample for a genuine event and makes a captured
 * request useless soon after. This replaces spec 0003's 24 hour staleness rule
 * for Stripe.
 */
export const SIGNATURE_TOLERANCE_SECONDS = 300;

export type StripeEventCheck =
  | { ok: true; event: Stripe.Event }
  | { ok: false; reason: 'NOT_CONFIGURED' | 'MISSING' | 'MISMATCH' };

/**
 * Check a webhook against the raw request body, before any JSON parse: the
 * signature covers the exact bytes Stripe sent.
 */
export function verifyStripeEvent(
  rawBody: string,
  signature: string | null,
  secret = process.env.STRIPE_WEBHOOK_SECRET,
  nowSeconds?: number,
): StripeEventCheck {
  if (!secret) return { ok: false, reason: 'NOT_CONFIGURED' };
  if (!signature) return { ok: false, reason: 'MISSING' };
  try {
    const event = Stripe.webhooks.constructEvent(
      rawBody,
      signature,
      secret,
      SIGNATURE_TOLERANCE_SECONDS,
      undefined,
      nowSeconds,
    );
    return { ok: true, event };
  } catch {
    return { ok: false, reason: 'MISMATCH' };
  }
}

export type StripeOutcome =
  | { kind: 'CONFIRMED'; reference: string; amount: number; currency: string }
  | { kind: 'FAILED'; reference: string; reason: string }
  /**
   * A chargeback. It names the payment intent, not the session, so the route
   * looks the session up (sessionForPaymentIntent) before it can find the order.
   */
  | {
      kind: 'DISPUTED';
      disputeId: string;
      paymentIntent: string;
      amount: number;
      currency: string;
      reason: string;
      respondBy: string | null;
    }
  | { kind: 'IGNORED'; why: string };

/** The Checkout session that created a payment intent, or null if none here did. */
export async function sessionForPaymentIntent(
  paymentIntent: string,
  gateway: StripeGateway = stripeGateway(),
): Promise<string | null> {
  const found = await gateway.checkout.sessions.list({ payment_intent: paymentIntent, limit: 1 });
  return found.data[0]?.id ?? null;
}

/** What a verified event means for a payment attempt (the table in spec 0010). */
export function interpretStripeEvent(event: Pick<Stripe.Event, 'type' | 'data'>): StripeOutcome {
  if (event.type === 'charge.dispute.created') {
    const dispute = event.data.object as Stripe.Dispute;
    const intent = typeof dispute.payment_intent === 'string' ? dispute.payment_intent : dispute.payment_intent?.id;
    if (!intent) return { kind: 'IGNORED', why: 'dispute with no payment intent' };
    const due = dispute.evidence_details?.due_by;
    return {
      kind: 'DISPUTED',
      disputeId: dispute.id,
      paymentIntent: intent,
      amount: fromMinorUnits(dispute.amount ?? 0),
      currency: (dispute.currency ?? '').toUpperCase(),
      reason: dispute.reason ?? 'unspecified',
      respondBy: due ? new Date(due * 1000).toISOString() : null,
    };
  }

  const session = event.data.object as Stripe.Checkout.Session;

  switch (event.type) {
    case 'checkout.session.completed':
      // Cards settle synchronously, so this is normally the payment. A method
      // that settles later completes the session unpaid and sends the async
      // event when the money lands.
      if (session.payment_status !== 'paid') {
        return { kind: 'IGNORED', why: `session completed with payment ${session.payment_status}` };
      }
      return paid(session);
    case 'checkout.session.async_payment_succeeded':
      return paid(session);
    case 'checkout.session.async_payment_failed':
      return { kind: 'FAILED', reference: session.id, reason: 'The payment failed after checkout (Stripe).' };
    case 'checkout.session.expired':
      return { kind: 'FAILED', reference: session.id, reason: 'Checkout session expired before payment (Stripe).' };
    default:
      return { kind: 'IGNORED', why: `${event.type} is not a payment outcome` };
  }
}

function paid(session: Stripe.Checkout.Session): StripeOutcome {
  return {
    kind: 'CONFIRMED',
    reference: session.id,
    // A missing total is recorded as nothing paid, which AC-11 flags, rather
    // than assumed to be the order total.
    amount: fromMinorUnits(session.amount_total ?? 0),
    currency: (session.currency ?? '').toUpperCase(),
  };
}
