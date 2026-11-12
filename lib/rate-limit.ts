import { NextResponse } from 'next/server';

/**
 * Request throttling for write routes and payment callbacks.
 *
 * A fixed window per key: at most `limit` requests every `windowMs`. The store
 * behind it is an interface so a shared one (Upstash Redis, or Vercel's
 * firewall in front of the app) can replace the in-memory default once an
 * account exists for it. In memory, each server instance counts on its own,
 * so on Vercel the real ceiling is `limit` times the instances running: it
 * stops one client hammering an endpoint, not a distributed attack. The
 * per-buyer caps that read the database (open unpaid orders, in
 * app/api/orders) hold across instances.
 */

export interface RateLimitStore {
  /** Count one request against `key`; the count so far in its window, and when the window ends. */
  hit(key: string, windowMs: number, now: number): { count: number; resetAt: number };
}

export function memoryStore(maxKeys = 10_000): RateLimitStore {
  const buckets = new Map<string, { count: number; resetAt: number }>();
  return {
    hit(key, windowMs, now) {
      let bucket = buckets.get(key);
      if (!bucket || bucket.resetAt <= now) {
        // Drop expired windows before the map grows without bound.
        if (buckets.size >= maxKeys) {
          for (const [stale, entry] of buckets) if (entry.resetAt <= now) buckets.delete(stale);
        }
        bucket = { count: 0, resetAt: now + windowMs };
        buckets.set(key, bucket);
      }
      bucket.count += 1;
      return { count: bucket.count, resetAt: bucket.resetAt };
    },
  };
}

let store: RateLimitStore = memoryStore();

/** Swap the store (a shared one in production, a fresh one in tests). */
export function setRateLimitStore(next: RateLimitStore) {
  store = next;
}

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSeconds: number };

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): RateLimitResult {
  const { count, resetAt } = store.hit(key, windowMs, now);
  if (count <= limit) return { ok: true };
  return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)) };
}

/**
 * The calling client's address, as the platform's proxy reports it. Only the
 * first hop of `x-forwarded-for` is the client; the rest are proxies.
 */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim() || 'unknown';
  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

/** The limits each route uses, in one place so they can be read and tuned together. */
export const LIMITS = {
  /**
   * Checkout. Far beyond what a person does, low enough to stop a script filling
   * the orders table. `npm run verify` places 30 to 40 orders as one buyer
   * within two minutes in CI, so the ceiling sits above that.
   */
  placeOrder: { limit: 60, windowMs: 10 * 60_000 },
  /** Quotation and runner requests notify every invited supplier, runner and staff member. */
  requestQuote: { limit: 10, windowMs: 60 * 60_000 },
  requestRunner: { limit: 10, windowMs: 60 * 60_000 },
  /** Promo code checks: enough to fix a typo, too few to guess codes. */
  promoQuote: { limit: 20, windowMs: 10 * 60_000 },
  /** Address book and saved items. */
  accountWrite: { limit: 60, windowMs: 10 * 60_000 },
  /** Payment callbacks, per sending address. A gateway's retries stay well under this. */
  paymentCallback: { limit: 120, windowMs: 60_000 },
} as const;

/**
 * Throttle one request. Returns the 429 to send, or null to carry on.
 *
 * `who` is the signed-in user's id where there is one, else the client's
 * address, so one buyer cannot exhaust another's allowance from a shared address.
 */
export function throttle(name: keyof typeof LIMITS, who: string): NextResponse | null {
  const { limit, windowMs } = LIMITS[name];
  const result = rateLimit(`${name}:${who}`, limit, windowMs);
  if (result.ok) return null;
  return NextResponse.json(
    { error: 'Too many requests. Please wait a moment and try again.' },
    { status: 429, headers: { 'Retry-After': String(result.retryAfterSeconds) } },
  );
}
