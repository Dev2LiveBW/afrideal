import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';

import type { PaymentProvider } from '@/types';

/**
 * Signing and checking payment callbacks (spec 0003).
 *
 * The callback route is the only unauthenticated write path in the application:
 * it carries no session, and a signature is the whole of its security. Everything
 * here is therefore deliberately strict.
 */

/** Header the signature travels in. Lowercase because Next normalises header names. */
export const SIGNATURE_HEADER = 'x-afrideal-signature';

/**
 * How old a callback may be before we refuse it.
 *
 * Long enough that a gateway retrying through an outage still lands, short enough
 * that a captured request cannot be replayed days later.
 */
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * A mock secret for local work only.
 *
 * Secrets are per provider so a leaked mock secret cannot forge a real
 * confirmation. The mock is already refused when NODE_ENV is production, so this
 * fallback can never sign anything that matters; it exists so `npm run verify`
 * and a dev server work without anyone editing `.env.local`.
 */
const DEV_MOCK_SECRET = 'afrideal-dev-mock-secret';

export class MissingPaymentSecretError extends Error {
  constructor(provider: PaymentProvider) {
    super(
      `No signing secret for ${provider}. Set PAYMENT_SECRET_${provider} before taking payments through it.`,
    );
    this.name = 'MissingPaymentSecretError';
  }
}

function secretFor(provider: PaymentProvider): string {
  const configured = process.env[`PAYMENT_SECRET_${provider}`];
  if (configured) return configured;

  if (provider === 'MOCK' && process.env.NODE_ENV !== 'production') return DEV_MOCK_SECRET;

  // A real provider with no secret must stop the request, not fall back to
  // something guessable. Signing with a default would make every callback forgeable.
  throw new MissingPaymentSecretError(provider);
}

/**
 * Sign a callback body.
 *
 * Takes the exact string that will be sent, because the receiver hashes the raw
 * bytes it received. Re-serialising an object on either side would change key
 * order or spacing and break every signature.
 */
export function signCallback(provider: PaymentProvider, rawBody: string): string {
  return createHmac('sha256', secretFor(provider)).update(rawBody, 'utf8').digest('hex');
}

export type SignatureCheck = { ok: true } | { ok: false; reason: 'MISSING' | 'MISMATCH' };

/**
 * Check a callback's signature against the raw request body.
 *
 * `rawBody` must be the untouched text of the request, read before any JSON
 * parse. Parsing and re-stringifying changes the bytes, so the hash would never
 * match even for a genuine callback.
 */
export function verifyCallback(
  provider: PaymentProvider,
  rawBody: string,
  provided: string | null,
): SignatureCheck {
  if (!provided) return { ok: false, reason: 'MISSING' };

  const expected = signCallback(provider, rawBody);

  // Compare in constant time so the comparison itself cannot be used to guess a
  // valid signature one byte at a time. timingSafeEqual needs equal lengths, so a
  // length difference is reported as a plain mismatch.
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(provided, 'utf8');
  if (a.length !== b.length) return { ok: false, reason: 'MISMATCH' };

  return timingSafeEqual(a, b) ? { ok: true } : { ok: false, reason: 'MISMATCH' };
}

/** Whether a callback is too old to act on. A missing or unparseable time is stale. */
export function isStale(occurredAt: unknown, now = Date.now()): boolean {
  if (typeof occurredAt !== 'string') return true;
  const at = new Date(occurredAt).getTime();
  if (Number.isNaN(at)) return true;
  return now - at > MAX_AGE_MS;
}
