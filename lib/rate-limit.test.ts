import { beforeEach, describe, expect, it } from 'vitest';

import { clientIp, memoryStore, rateLimit, setRateLimitStore, throttle } from '@/lib/rate-limit';

beforeEach(() => setRateLimitStore(memoryStore()));

describe('rateLimit', () => {
  it('lets requests through up to the limit, then refuses', () => {
    const now = 1_000_000;
    for (let i = 0; i < 3; i++) expect(rateLimit('k', 3, 60_000, now).ok).toBe(true);
    expect(rateLimit('k', 3, 60_000, now)).toEqual({ ok: false, retryAfterSeconds: 60 });
  });

  it('opens again once the window has passed', () => {
    const now = 1_000_000;
    for (let i = 0; i < 4; i++) rateLimit('k', 3, 60_000, now);
    expect(rateLimit('k', 3, 60_000, now + 60_000).ok).toBe(true);
  });

  it('says how long to wait, never less than a second', () => {
    const now = 1_000_000;
    for (let i = 0; i < 2; i++) rateLimit('k', 1, 60_000, now);
    const result = rateLimit('k', 1, 60_000, now + 59_900);
    expect(result).toEqual({ ok: false, retryAfterSeconds: 1 });
  });

  it('counts each key on its own', () => {
    const now = 1_000_000;
    rateLimit('a', 1, 60_000, now);
    expect(rateLimit('a', 1, 60_000, now).ok).toBe(false);
    expect(rateLimit('b', 1, 60_000, now).ok).toBe(true);
  });
});

describe('memoryStore', () => {
  it('drops expired windows once it is full, so it cannot grow without bound', () => {
    const store = memoryStore(2);
    store.hit('a', 1_000, 0);
    store.hit('b', 1_000, 0);
    store.hit('c', 1_000, 5_000);
    // 'a' expired and was dropped: hitting it again starts a fresh window at 1.
    expect(store.hit('a', 1_000, 5_000).count).toBe(1);
  });
});

describe('throttle', () => {
  it('answers 429 with Retry-After once a name is over its limit', async () => {
    // promoQuote allows 20 every ten minutes.
    for (let i = 0; i < 20; i++) expect(throttle('promoQuote', 'u1')).toBeNull();
    const refused = throttle('promoQuote', 'u1');
    expect(refused?.status).toBe(429);
    expect(Number(refused?.headers.get('Retry-After'))).toBeGreaterThan(0);
    expect((await refused?.json())?.error).toMatch(/Too many requests/);
  });

  it("keeps one user from using up another user's allowance", () => {
    for (let i = 0; i < 21; i++) throttle('promoQuote', 'u1');
    expect(throttle('promoQuote', 'u2')).toBeNull();
  });
});

describe('clientIp', () => {
  const request = (headers: Record<string, string>) => new Request('https://afrideal.test/api', { headers });

  it('takes the first hop of x-forwarded-for, which is the client', () => {
    expect(clientIp(request({ 'x-forwarded-for': '41.75.1.2, 10.0.0.1' }))).toBe('41.75.1.2');
  });

  it('falls back to x-real-ip, then to "unknown"', () => {
    expect(clientIp(request({ 'x-real-ip': '41.75.1.3' }))).toBe('41.75.1.3');
    expect(clientIp(request({}))).toBe('unknown');
  });
});
