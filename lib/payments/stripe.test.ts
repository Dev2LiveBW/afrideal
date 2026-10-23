import Stripe from 'stripe';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  SESSION_MINUTES,
  StripeLiveKeyError,
  UnsupportedCurrencyError,
  checkoutSessionState,
  createCheckoutSession,
  expireCheckoutSession,
  fromMinorUnits,
  interpretStripeEvent,
  refundCheckoutPayment,
  stripeConfigured,
  stripeGateway,
  stripeKeyState,
  toMinorUnits,
  verifyStripeEvent,
  type StripeGateway,
} from './stripe';

/**
 * Cards through Stripe (spec 0010).
 *
 * Nothing here talks to Stripe. The session and refund calls are checked
 * against a fake gateway, so the assertions are on exactly what would be sent;
 * the webhook checks sign payloads with the SDK's own test signer, so they
 * prove the real verification path, not a reimplementation of it.
 */

afterEach(() => {
  vi.unstubAllEnvs();
});

/** A gateway that records what it was asked and answers as configured. */
function fakeGateway(session: Partial<Stripe.Checkout.Session> = {}) {
  const calls = {
    create: [] as Stripe.Checkout.SessionCreateParams[],
    expire: [] as string[],
    refunds: [] as { params: Stripe.RefundCreateParams; options?: Stripe.RequestOptions }[],
  };
  const gateway: StripeGateway = {
    checkout: {
      sessions: {
        create: async (params) => {
          calls.create.push(params);
          return { id: 'cs_test_123', url: 'https://checkout.stripe.com/c/pay/cs_test_123' };
        },
        retrieve: async (id) => ({
          id,
          url: 'https://checkout.stripe.com/c/pay/cs_test_123',
          status: 'open',
          payment_intent: null,
          ...session,
        }),
        expire: async (id) => {
          calls.expire.push(id);
          return {};
        },
      },
    },
    refunds: {
      create: async (params, options) => {
        calls.refunds.push({ params, options });
        return { id: 're_test_1', status: 'succeeded' };
      },
    },
  };
  return { gateway, calls };
}

const ORDER = { id: 'o016', reference: 'AFD-25365', total: 329.5, currency: 'BWP' as const };

describe('keys', () => {
  it('tells a test key from a live one', () => {
    expect(stripeKeyState('sk_test_abc')).toBe('TEST');
    expect(stripeKeyState('rk_test_abc')).toBe('TEST');
    expect(stripeKeyState('sk_live_abc')).toBe('LIVE');
    expect(stripeKeyState('rk_live_abc')).toBe('LIVE');
    expect(stripeKeyState('')).toBe('MISSING');
    expect(stripeKeyState('pk_test_abc')).toBe('UNRECOGNISED');
  });

  // The important one: a live key copied into the environment must not take money.
  it('refuses to build a client on a live key', () => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_live_abc');
    expect(() => stripeGateway()).toThrow(StripeLiveKeyError);
  });

  it('is configured only with a test key and a webhook secret together', () => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_abc');
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', '');
    expect(stripeConfigured()).toBe(false);

    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_abc');
    expect(stripeConfigured()).toBe(true);

    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_live_abc');
    expect(stripeConfigured()).toBe(false);
  });
});

describe('minor units', () => {
  it('charges pula and rand in cents, rounding away float noise', () => {
    expect(toMinorUnits(329.5, 'BWP')).toBe(32950);
    expect(toMinorUnits(0.1 + 0.2, 'ZAR')).toBe(30);
    expect(toMinorUnits(1999.99, 'bwp')).toBe(199999);
    expect(fromMinorUnits(32950)).toBe(329.5);
  });

  it('refuses a currency nobody has checked the decimals of', () => {
    expect(() => toMinorUnits(100, 'LSL')).toThrow(UnsupportedCurrencyError);
    expect(() => toMinorUnits(100, 'JPY')).toThrow(UnsupportedCurrencyError);
  });

  it('refuses a zero, negative or non-numeric charge', () => {
    for (const bad of [0, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => toMinorUnits(bad, 'BWP')).toThrow(RangeError);
    }
  });
});

describe('createCheckoutSession', () => {
  it('charges the order total in the order currency, cards only', async () => {
    const { gateway, calls } = fakeGateway();
    const started = await createCheckoutSession(ORDER, 'http://localhost:3000', gateway);

    expect(started).toEqual({ reference: 'cs_test_123', url: 'https://checkout.stripe.com/c/pay/cs_test_123' });
    const params = calls.create[0];
    expect(params.mode).toBe('payment');
    expect(params.allowed_payment_method_types).toEqual(['card']);
    expect(params.line_items).toHaveLength(1);
    expect(params.line_items?.[0]).toMatchObject({
      quantity: 1,
      price_data: { currency: 'bwp', unit_amount: 32950, product_data: { name: 'AfriDeal order AFD-25365' } },
    });
  });

  it('charges a rand buyer in rand (spec 0009, answer 1)', async () => {
    const { gateway, calls } = fakeGateway();
    await createCheckoutSession({ ...ORDER, currency: 'ZAR' }, 'http://localhost:3000', gateway);
    expect(calls.create[0].line_items?.[0].price_data?.currency).toBe('zar');
  });

  it('treats an order from before currencies existed as pula', async () => {
    const { gateway, calls } = fakeGateway();
    await createCheckoutSession({ ...ORDER, currency: undefined }, 'http://localhost:3000', gateway);
    expect(calls.create[0].line_items?.[0].price_data?.currency).toBe('bwp');
  });

  it('links the session to the order and sends no personal data', async () => {
    const { gateway, calls } = fakeGateway();
    await createCheckoutSession(ORDER, 'https://afrideal.example/', gateway);
    const params = calls.create[0];

    expect(params.client_reference_id).toBe('o016');
    expect(params.metadata).toEqual({ order_id: 'o016', order_reference: 'AFD-25365' });
    expect(params.success_url).toBe('https://afrideal.example/orders/o016?placed=1&paid=card');
    expect(params.cancel_url).toBe('https://afrideal.example/orders/o016?placed=1');
    expect(params.customer_email).toBeUndefined();
  });

  it('closes the session before the 35 minute order window does', async () => {
    const { gateway, calls } = fakeGateway();
    const now = new Date('2026-10-23T08:00:00.000Z');
    await createCheckoutSession(ORDER, 'http://localhost:3000', gateway, now);

    expect(calls.create[0].expires_at).toBe(now.getTime() / 1000 + SESSION_MINUTES * 60);
    // Stripe refuses anything under 30 minutes.
    expect(SESSION_MINUTES).toBeGreaterThanOrEqual(30);
    expect(SESSION_MINUTES).toBeLessThan(35);
  });

  it('sends nothing for a currency it cannot charge', async () => {
    const { gateway, calls } = fakeGateway();
    await expect(
      createCheckoutSession({ ...ORDER, currency: 'LSL' }, 'http://localhost:3000', gateway),
    ).rejects.toThrow(UnsupportedCurrencyError);
    expect(calls.create).toHaveLength(0);
  });
});

describe('an existing session', () => {
  it('is handed back while Stripe still has it open', async () => {
    const { gateway } = fakeGateway({ status: 'open' });
    expect(await checkoutSessionState('cs_test_123', gateway)).toEqual({
      state: 'OPEN',
      url: 'https://checkout.stripe.com/c/pay/cs_test_123',
    });
  });

  it('reads as complete once paid, and expired once closed', async () => {
    expect(await checkoutSessionState('cs_1', fakeGateway({ status: 'complete' }).gateway)).toEqual({
      state: 'COMPLETE',
    });
    expect(await checkoutSessionState('cs_1', fakeGateway({ status: 'expired' }).gateway)).toEqual({
      state: 'EXPIRED',
    });
  });

  it('is expired when open, and left alone when already closed', async () => {
    const open = fakeGateway({ status: 'open' });
    expect(await expireCheckoutSession('cs_1', open.gateway)).toBe(true);
    expect(open.calls.expire).toEqual(['cs_1']);

    const done = fakeGateway({ status: 'complete' });
    expect(await expireCheckoutSession('cs_1', done.gateway)).toBe(false);
    expect(done.calls.expire).toEqual([]);
  });
});

describe('refundCheckoutPayment', () => {
  it('refunds the session payment in minor units, idempotently', async () => {
    const { gateway, calls } = fakeGateway({ payment_intent: 'pi_test_9' });
    const result = await refundCheckoutPayment(
      { reference: 'cs_1', amount: 100.25, currency: 'ZAR', idempotencyKey: 'afrideal-refund-o016' },
      gateway,
    );

    expect(result).toEqual({ refundId: 're_test_1' });
    expect(calls.refunds[0].params).toMatchObject({ payment_intent: 'pi_test_9', amount: 10025 });
    expect(calls.refunds[0].options).toEqual({ idempotencyKey: 'afrideal-refund-o016' });
  });

  it('refuses to refund a session that never took a payment', async () => {
    const { gateway, calls } = fakeGateway({ payment_intent: null });
    await expect(
      refundCheckoutPayment({ reference: 'cs_1', amount: 10, currency: 'BWP', idempotencyKey: 'k' }, gateway),
    ).rejects.toThrow(/no payment to refund/);
    expect(calls.refunds).toHaveLength(0);
  });
});

// ── The webhook ──────────────────────────────────────────────────────────────

const SECRET = 'whsec_test_secret_for_unit_tests';

function sessionEvent(type: string, session: Partial<Stripe.Checkout.Session> = {}) {
  return {
    id: 'evt_test_1',
    object: 'event',
    type,
    data: {
      object: {
        id: 'cs_test_123',
        object: 'checkout.session',
        amount_total: 32950,
        currency: 'bwp',
        payment_status: 'paid',
        ...session,
      },
    },
  };
}

function signed(payload: string, options: { secret?: string; timestamp?: number } = {}) {
  return Stripe.webhooks.generateTestHeaderString({
    payload,
    secret: options.secret ?? SECRET,
    timestamp: options.timestamp,
  });
}

describe('verifyStripeEvent', () => {
  const body = JSON.stringify(sessionEvent('checkout.session.completed'));

  it('accepts an event signed with our secret over the raw body', () => {
    const check = verifyStripeEvent(body, signed(body), SECRET);
    expect(check.ok).toBe(true);
    if (check.ok) expect(check.event.type).toBe('checkout.session.completed');
  });

  it('refuses a body changed after signing, even by whitespace', () => {
    const header = signed(body);
    expect(verifyStripeEvent(body.replace('32950', '1'), header, SECRET)).toEqual({ ok: false, reason: 'MISMATCH' });
    expect(verifyStripeEvent(JSON.stringify(JSON.parse(body), null, 2), header, SECRET)).toEqual({
      ok: false,
      reason: 'MISMATCH',
    });
  });

  it('refuses an event signed with someone else’s secret', () => {
    expect(verifyStripeEvent(body, signed(body, { secret: 'whsec_other' }), SECRET)).toEqual({
      ok: false,
      reason: 'MISMATCH',
    });
  });

  it('refuses a captured event replayed after the five minute tolerance', () => {
    const tenMinutesAgo = Math.floor(Date.now() / 1000) - 600;
    expect(verifyStripeEvent(body, signed(body, { timestamp: tenMinutesAgo }), SECRET)).toEqual({
      ok: false,
      reason: 'MISMATCH',
    });
  });

  it('refuses a missing header, and says so when no secret is configured', () => {
    expect(verifyStripeEvent(body, null, SECRET)).toEqual({ ok: false, reason: 'MISSING' });
    expect(verifyStripeEvent(body, signed(body), '')).toEqual({ ok: false, reason: 'NOT_CONFIGURED' });
  });

  it('refuses a header that is not a Stripe signature at all', () => {
    expect(verifyStripeEvent(body, 'not-a-signature', SECRET)).toEqual({ ok: false, reason: 'MISMATCH' });
  });
});

describe('interpretStripeEvent', () => {
  const asEvent = (event: ReturnType<typeof sessionEvent>) => event as unknown as Stripe.Event;

  it('confirms a paid session with its amount and currency', () => {
    expect(interpretStripeEvent(asEvent(sessionEvent('checkout.session.completed')))).toEqual({
      kind: 'CONFIRMED',
      reference: 'cs_test_123',
      amount: 329.5,
      currency: 'BWP',
    });
  });

  it('waits on a session completed before its money settled', () => {
    const outcome = interpretStripeEvent(
      asEvent(sessionEvent('checkout.session.completed', { payment_status: 'unpaid' })),
    );
    expect(outcome.kind).toBe('IGNORED');
  });

  it('confirms when delayed money lands, and fails when it does not', () => {
    expect(interpretStripeEvent(asEvent(sessionEvent('checkout.session.async_payment_succeeded'))).kind).toBe(
      'CONFIRMED',
    );
    expect(interpretStripeEvent(asEvent(sessionEvent('checkout.session.async_payment_failed'))).kind).toBe(
      'FAILED',
    );
  });

  it('fails the attempt when the session expires unpaid', () => {
    expect(interpretStripeEvent(asEvent(sessionEvent('checkout.session.expired')))).toMatchObject({
      kind: 'FAILED',
      reference: 'cs_test_123',
    });
  });

  it('records a missing total as nothing paid, for finance to see', () => {
    expect(
      interpretStripeEvent(asEvent(sessionEvent('checkout.session.completed', { amount_total: null }))),
    ).toMatchObject({ kind: 'CONFIRMED', amount: 0 });
  });

  it('ignores events that are not a payment outcome', () => {
    expect(interpretStripeEvent(asEvent(sessionEvent('customer.created'))).kind).toBe('IGNORED');
  });
});
