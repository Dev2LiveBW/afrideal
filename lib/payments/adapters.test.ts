import { afterEach, describe, expect, it, vi } from 'vitest';

// `adapters` reads the eft_bank_details setting through the store. Mocked at the
// boundary so these tests exercise the adapter, not the database.
const findById = vi.fn();
vi.mock('@/lib/db', () => ({ findById: (...args: unknown[]) => findById(...args) }));

const { MockProviderInProductionError, providerFor, startPayment } = await import('./adapters');
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
    payment_method: 'DPO_PAY',
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

    expect(providerFor('DPO_PAY')).toBe('MOCK');
    expect(providerFor('PAYGATE')).toBe('MOCK');
    expect(providerFor('ORANGE_MONEY')).toBe('MOCK');
  });

  it('routes a card method to itself when the mock is off', () => {
    vi.stubEnv('PAYMENTS_PROVIDER', 'live');

    expect(providerFor('DPO_PAY')).toBe('DPO_PAY');
  });

  // Mocking a bank transfer would mean mocking a human reading a statement.
  it('never mocks a bank transfer, even with the mock switched on', () => {
    vi.stubEnv('PAYMENTS_PROVIDER', 'mock');

    expect(providerFor('EFT')).toBe('EFT');
  });

  it('refuses the mock in production rather than quietly using a real provider', () => {
    vi.stubEnv('PAYMENTS_PROVIDER', 'mock');
    vi.stubEnv('NODE_ENV', 'production');

    expect(() => providerFor('DPO_PAY')).toThrow(MockProviderInProductionError);
  });

  it('is unaffected in production when the mock is not requested', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('PAYMENTS_PROVIDER', 'live');

    expect(providerFor('DPO_PAY')).toBe('DPO_PAY');
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
});
