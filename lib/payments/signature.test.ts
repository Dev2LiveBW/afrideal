import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  MissingPaymentSecretError,
  SIGNATURE_HEADER,
  isStale,
  signCallback,
  verifyCallback,
} from './signature';

/**
 * Callback signing (spec 0003, AC-4 and AC-6).
 *
 * The callback route is the only unauthenticated write path in the application, so
 * a signature is the whole of its security. `npm run verify` proves an unsigned and
 * a wrong signature are both refused over HTTP; what it cannot reach is the
 * behaviour around the edges: a length mismatch, a provider with no secret
 * configured, and the exact staleness boundary.
 */

const BODY = JSON.stringify({
  reference: 'MOCK-o001-abc',
  status: 'CONFIRMED',
  amount: 329,
  currency: 'BWP',
  occurred_at: '2026-10-06T12:00:00.000Z',
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('signCallback', () => {
  it('produces a stable hex digest for the same body', () => {
    expect(signCallback('MOCK', BODY)).toBe(signCallback('MOCK', BODY));
    expect(signCallback('MOCK', BODY)).toMatch(/^[0-9a-f]{64}$/);
  });

  // The receiver hashes the raw bytes it was sent. If a single character differs,
  // including key order or spacing, the signature must not match.
  it('changes completely when one character of the body changes', () => {
    const tampered = BODY.replace('329', '330');

    expect(signCallback('MOCK', tampered)).not.toBe(signCallback('MOCK', BODY));
  });

  it('gives different providers different signatures for the same body, so a leaked mock secret cannot forge a real one', () => {
    vi.stubEnv('PAYMENT_SECRET_DPO_PAY', 'a-real-looking-secret');

    expect(signCallback('DPO_PAY', BODY)).not.toBe(signCallback('MOCK', BODY));
  });

  it('refuses to sign for a real provider with no secret configured, rather than falling back to something guessable', () => {
    expect(() => signCallback('DPO_PAY', BODY)).toThrow(MissingPaymentSecretError);
  });

  it('refuses the mock dev secret in production, where a mock must not be able to mark orders paid', () => {
    vi.stubEnv('NODE_ENV', 'production');

    expect(() => signCallback('MOCK', BODY)).toThrow(MissingPaymentSecretError);
  });

  it('never leaks a secret, not in the digest and not in the error that names a missing one', () => {
    vi.stubEnv('PAYMENT_SECRET_DPO_PAY', 'super-secret-value');

    expect(signCallback('DPO_PAY', BODY)).not.toContain('super-secret-value');

    // The error names the env var to set, which is helpful, but must never quote a
    // value: these messages reach logs.
    let message = '';
    try {
      signCallback('PAYGATE', BODY);
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }

    expect(message).toContain('PAYMENT_SECRET_PAYGATE');
    expect(message).not.toContain('super-secret-value');
  });
});

describe('verifyCallback', () => {
  it('accepts a signature it produced itself · covers AC-4', () => {
    expect(verifyCallback('MOCK', BODY, signCallback('MOCK', BODY))).toEqual({ ok: true });
  });

  it('reports a missing signature distinctly from a wrong one, for our own logs · covers AC-6', () => {
    expect(verifyCallback('MOCK', BODY, null)).toEqual({ ok: false, reason: 'MISSING' });
    expect(verifyCallback('MOCK', BODY, '')).toEqual({ ok: false, reason: 'MISSING' });
  });

  it('rejects a signature for a different body · covers AC-6', () => {
    const forOtherBody = signCallback('MOCK', BODY.replace('329', '1'));

    expect(verifyCallback('MOCK', BODY, forOtherBody)).toEqual({ ok: false, reason: 'MISMATCH' });
  });

  // timingSafeEqual throws on unequal lengths, so a short signature must be
  // handled rather than becoming a 500 that tells an attacker they found an edge.
  it('rejects a signature of the wrong length without throwing · covers AC-6', () => {
    expect(verifyCallback('MOCK', BODY, 'abc')).toEqual({ ok: false, reason: 'MISMATCH' });
    expect(verifyCallback('MOCK', BODY, 'f'.repeat(128))).toEqual({ ok: false, reason: 'MISMATCH' });
  });

  it('rejects a signature made with a different secret · covers AC-6', () => {
    vi.stubEnv('PAYMENT_SECRET_MOCK', 'the-wrong-secret');
    const wrong = signCallback('MOCK', BODY);
    vi.unstubAllEnvs();

    expect(verifyCallback('MOCK', BODY, wrong)).toEqual({ ok: false, reason: 'MISMATCH' });
  });
});

describe('isStale', () => {
  const now = new Date('2026-10-06T12:00:00.000Z').getTime();

  it('accepts a callback from a moment ago', () => {
    expect(isStale('2026-10-06T11:59:00.000Z', now)).toBe(false);
  });

  it('accepts one just inside twenty four hours, so a gateway retrying through an outage still lands', () => {
    expect(isStale('2026-10-05T12:00:01.000Z', now)).toBe(false);
  });

  it('refuses one just outside twenty four hours, so a captured request cannot be replayed days later · covers AC-4', () => {
    expect(isStale('2026-10-05T11:59:59.000Z', now)).toBe(true);
  });

  // Fails closed. An absent or unparseable timestamp is treated as stale rather
  // than waved through on a signature alone.
  it('treats a missing or unparseable timestamp as stale', () => {
    expect(isStale(undefined, now)).toBe(true);
    expect(isStale(null, now)).toBe(true);
    expect(isStale('whenever', now)).toBe(true);
    expect(isStale(1_759_000_000_000, now)).toBe(true);
  });
});

describe('SIGNATURE_HEADER', () => {
  it('is lowercase, because Next normalises header names', () => {
    expect(SIGNATURE_HEADER).toBe(SIGNATURE_HEADER.toLowerCase());
  });
});
