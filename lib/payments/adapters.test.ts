import { afterEach, describe, expect, it, vi } from 'vitest';

// `adapters` reads the eft_bank_details setting through the store. Mocked at the
// boundary so these tests exercise the adapter, not the database.
const findById = vi.fn();
vi.mock('@/lib/db', () => ({ findById: (...args: unknown[]) => findById(...args) }));

const { MockProviderInProductionError, availablePaymentMethods, mockGatewayAvailable, providerFor, startPayment } =
  await import('./adapters');
import type { Order } from '@/types';

/**
 * Which provider takes the money, and what the buyer is told (spec 0003).
 *
 * The production gate is the case that matters. A mock that can mark orders paid
 * must not exist in production, and `npm run verify` can never prove that because
 * it never runs with NODE_ENV=production.
 */

function order(over: Partial<Order> = {}): Order {
  return {
    id: 'o001',
    reference: 'AFD-24810',
    customer_id: 'u006',
    customer_name: 'Thabo Modise',
    status: 'AWAITING_PAYMENT',
    subtotal: 284,
    delivery_fee: 45,
    total: 329,
    payment_method: 'CARD',
    payment_reference: null,
    payment_expires_at: '2026-10-06T11:00:00.000Z',
    cancel_reason: null,
    delivery_address: 'Plot 1',
    delivery_city: 'Gaborone',
    placed_at: '2026-10-06T10:30:00.000Z',
    updated_at: '2026-10-06T10:30:00.000Z',
    timeline: [],
    internal_notes: '',
    ...over,
  };
}

afterEach(() => {
  vi.unstubAllEnvs();
  findById.mockReset();
});

describe('providerFor', () => {
  it('routes a card method to the mock while PAYMENTS_PROVIDER is mock', () => {
    vi.stubEnv('PAYMENTS_PROVIDER', 'mock');

    expect(providerFor('CARD')).toBe('MOCK');
    expect(providerFor('PAYGATE')).toBe('MOCK');
    expect(providerFor('ORANGE_MONEY')).toBe('MOCK');
  });

  it('routes a card to Stripe when the mock is off (spec 0010)', () => {
    vi.stubEnv('PAYMENTS_PROVIDER', 'live');

    expect(providerFor('CARD')).toBe('STRIPE');
  });

  // Mocking a bank transfer would mean mocking a human reading a statement.
  it('never mocks a bank transfer, even with the mock switched on', () => {
    vi.stubEnv('PAYMENTS_PROVIDER', 'mock');

    expect(providerFor('EFT')).toBe('EFT');
  });

  it('refuses the mock in production rather than quietly using a real provider', () => {
    vi.stubEnv('PAYMENTS_PROVIDER', 'mock');
    vi.stubEnv('NODE_ENV', 'production');

    expect(() => providerFor('CARD')).toThrow(MockProviderInProductionError);
  });

  it('is unaffected in production when the mock is not requested', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('PAYMENTS_PROVIDER', 'live');

    expect(providerFor('CARD')).toBe('STRIPE');
  });
});

describe('startPayment, for a bank transfer', () => {
  it('uses the order reference, which is what the buyer quotes to their bank', async () => {
    findById.mockResolvedValue(null);

    const started = await startPayment(order({ payment_method: 'EFT' }));

    expect(started.provider).toBe('EFT');
    expect(started.providerReference).toBe('AFD-24810');
    expect(started.redirectUrl).toBeNull();
  });

  it('includes the banking details from the setting when it is configured', async () => {
    findById.mockResolvedValue({ value: { text: 'First National Bank\nAccount 620 1234 5678' } });

    const started = await startPayment(order({ payment_method: 'EFT' }));

    expect(started.instructions).toContain('620 1234 5678');
    expect(started.instructions).toContain('AFD-24810');
  });

  // Never invent an account number: a wrong one sends a buyer's money to a stranger.
  it('says details will follow rather than inventing an account number when the setting is absent', async () => {
    findById.mockResolvedValue(null);

    const started = await startPayment(order({ payment_method: 'EFT' }));

    expect(started.instructions).toContain('AFD-24810');
    expect(started.instructions).toMatch(/details will be sent/i);
    expect(started.instructions).not.toMatch(/\b\d{6,}\b/);
  });

  it('ignores a setting whose text is blank or the wrong type', async () => {
    for (const value of [{ text: '   ' }, { text: 42 }, {}]) {
      findById.mockResolvedValue({ value });
      const started = await startPayment(order({ payment_method: 'EFT' }));
      expect(started.instructions).toMatch(/details will be sent/i);
    }
  });
});

describe('startPayment, for a card', () => {
  it('mints a reference a callback can match on', async () => {
    vi.stubEnv('PAYMENTS_PROVIDER', 'mock');

    const started = await startPayment(order());

    expect(started.provider).toBe('MOCK');
    expect(started.providerReference).toContain('o001');
    expect(started.instructions).toBeNull();
  });

  it('gives two orders different references, so one callback cannot settle both', async () => {
    vi.stubEnv('PAYMENTS_PROVIDER', 'mock');

    const a = await startPayment(order({ id: 'o001' }));
    const b = await startPayment(order({ id: 'o002' }));

    expect(a.providerReference).not.toBe(b.providerReference);
  });

  it('does not read the settings store for a card payment', async () => {
    vi.stubEnv('PAYMENTS_PROVIDER', 'mock');

    await startPayment(order());

    expect(findById).not.toHaveBeenCalled();
  });

  // Only the reference travels: an amount in the URL could be edited by the buyer.
  it('sends the buyer to the stand-in hosted page with only the reference', async () => {
    vi.stubEnv('PAYMENTS_PROVIDER', 'mock');

    const started = await startPayment(order());

    expect(started.redirectUrl).toBe(
      `/mock-gateway?reference=${encodeURIComponent(started.providerReference)}`,
    );
    expect(started.redirectUrl).not.toContain('329');
  });

  it('has nowhere to send the buyer for a wallet whose gateway does not exist yet', async () => {
    vi.stubEnv('PAYMENTS_PROVIDER', 'live');

    const started = await startPayment(order({ payment_method: 'ORANGE_MONEY' }));

    expect(started.redirectUrl).toBeNull();
  });

  // Spec 0010: DPO is a provider behind CARD, and until it is built a card
  // routed to it must fail at checkout rather than open an unpayable attempt.
  it('refuses a card routed to DPO until its adapter exists', async () => {
    vi.stubEnv('CARD_PROVIDER', 'dpo');

    await expect(startPayment(order())).rejects.toThrow(/DPO Pay is not connected/);
  });
});

describe('mockGatewayAvailable', () => {
  it('is on only for the mock outside production', () => {
    vi.stubEnv('PAYMENTS_PROVIDER', 'mock');
    vi.stubEnv('NODE_ENV', 'development');
    expect(mockGatewayAvailable()).toBe(true);

    vi.stubEnv('NODE_ENV', 'production');
    expect(mockGatewayAvailable()).toBe(false);

    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('PAYMENTS_PROVIDER', 'live');
    expect(mockGatewayAvailable()).toBe(false);
  });

  it('opens in a production build only through the opt in, and never on Vercel', () => {
    vi.stubEnv('PAYMENTS_PROVIDER', 'mock');
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('VERCEL', '');
    vi.stubEnv('ALLOW_MOCK_PAYMENTS', '1');
    expect(mockGatewayAvailable()).toBe(true);

    vi.stubEnv('VERCEL', '1');
    expect(mockGatewayAvailable()).toBe(false);

    // The old spelling no longer opens it: one opt in, one value.
    vi.stubEnv('VERCEL', '');
    vi.stubEnv('ALLOW_MOCK_PAYMENTS', 'true');
    expect(mockGatewayAvailable()).toBe(false);
  });
});

describe('the production opt in for the mock', () => {
  it('lets a production build outside Vercel use the mock when ALLOW_MOCK_PAYMENTS is 1', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('VERCEL', '');
    vi.stubEnv('PAYMENTS_PROVIDER', 'mock');
    vi.stubEnv('ALLOW_MOCK_PAYMENTS', '1');

    expect(providerFor('CARD')).toBe('MOCK');
  });

  it('ignores ALLOW_MOCK_PAYMENTS on Vercel, so a deployed site can never use the mock', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('VERCEL', '1');
    vi.stubEnv('PAYMENTS_PROVIDER', 'mock');
    vi.stubEnv('ALLOW_MOCK_PAYMENTS', '1');

    expect(() => providerFor('CARD')).toThrow(MockProviderInProductionError);
  });
});

describe('availablePaymentMethods', () => {
  it('offers bank transfer alone when nothing can take a card payment', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('PAYMENTS_PROVIDER', '');

    expect(availablePaymentMethods()).toEqual(['EFT']);
  });

  it('offers bank transfer alone, not an error, when the mock is misconfigured in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('VERCEL', '1');
    vi.stubEnv('PAYMENTS_PROVIDER', 'mock');

    expect(availablePaymentMethods()).toEqual(['EFT']);
  });

  it('offers every method while the mock can take card payments', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('PAYMENTS_PROVIDER', 'mock');

    expect(availablePaymentMethods()).toEqual(['CARD', 'ORANGE_MONEY', 'PAYGATE', 'EFT']);
  });
});

describe('the card provider (spec 0010)', () => {
  function withStripeKeys() {
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_unit');
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_unit');
  }

  it('sends cards to Stripe and leaves wallets on the mock when CARD_PROVIDER is stripe', () => {
    vi.stubEnv('PAYMENTS_PROVIDER', 'mock');
    vi.stubEnv('CARD_PROVIDER', 'stripe');
    withStripeKeys();

    expect(providerFor('CARD')).toBe('STRIPE');
    expect(providerFor('ORANGE_MONEY')).toBe('MOCK');
    expect(availablePaymentMethods()).toEqual(['CARD', 'ORANGE_MONEY', 'PAYGATE', 'EFT']);
  });

  it('offers the card only once Stripe has both a test key and a webhook secret', () => {
    vi.stubEnv('PAYMENTS_PROVIDER', 'live');
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_unit');
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', '');
    expect(availablePaymentMethods()).toEqual(['EFT']);

    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_unit');
    expect(availablePaymentMethods()).toEqual(['CARD', 'EFT']);
  });

  it('never offers the card on a live key, and refuses to start a payment with one', async () => {
    vi.stubEnv('PAYMENTS_PROVIDER', 'live');
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_live_unit');
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_unit');

    expect(availablePaymentMethods()).toEqual(['EFT']);
    await expect(startPayment(order({ payment_method: 'CARD' }), { origin: 'http://localhost' })).rejects.toThrow(
      /live key/,
    );
  });

  it('holds CARD_PROVIDER=mock to the same production gate as the mock', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('VERCEL', '1');
    vi.stubEnv('CARD_PROVIDER', 'mock');

    expect(() => providerFor('CARD')).toThrow(MockProviderInProductionError);
    expect(availablePaymentMethods()).toEqual(['EFT']);
  });

  it('does not offer a card through DPO until its adapter exists', () => {
    vi.stubEnv('CARD_PROVIDER', 'dpo');

    expect(providerFor('CARD')).toBe('DPO_PAY');
    expect(availablePaymentMethods()).toEqual(['EFT']);
  });
});
