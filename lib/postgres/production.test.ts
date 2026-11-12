import { describe, expect, it } from 'vitest';

import { PRODUCTION_ENDPOINT_ID, isProductionDatabase } from '@/lib/postgres/production.mjs';

// Synthetic connection strings: the hosts follow Neon's shapes, the credentials are made up.
const url = (host: string) => `postgresql://user:secret@${host}/neondb?sslmode=require`;

describe('isProductionDatabase', () => {
  it('recognises the production endpoint, direct and pooled', () => {
    expect(isProductionDatabase(url(`${PRODUCTION_ENDPOINT_ID}.c-7.us-east-2.aws.neon.tech`))).toBe(true);
    expect(isProductionDatabase(url(`${PRODUCTION_ENDPOINT_ID}-pooler.c-7.us-east-2.aws.neon.tech`))).toBe(true);
  });

  it('leaves any other branch alone', () => {
    expect(isProductionDatabase(url('ep-gentle-voice-b53rqowa-pooler.c-7.us-east-2.aws.neon.tech'))).toBe(false);
    expect(isProductionDatabase(url('localhost:5432'))).toBe(false);
  });

  it('does not match an endpoint that merely shares a prefix', () => {
    expect(isProductionDatabase(url(`${PRODUCTION_ENDPOINT_ID}x.c-7.us-east-2.aws.neon.tech`))).toBe(false);
  });

  it('treats a missing or malformed string as not production', () => {
    expect(isProductionDatabase(undefined)).toBe(false);
    expect(isProductionDatabase('not a url')).toBe(false);
  });
});
