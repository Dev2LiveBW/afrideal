import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { FINANCE_ALLOWED_PREFIXES, OPS_DENIED_PREFIXES, canAccessAdminPath } from '@/lib/roles';
import type { Role } from '@/types';

/*
 * Who reaches the promo codes page (spec 0011, AC-20). The rules live twice, here
 * for server components and in middleware.ts for the Edge runtime, so the last
 * test reads the middleware's lists and fails the moment the two drift apart.
 */

const PROMO = '/admin/promo-codes';

describe('canAccessAdminPath on promo codes · covers AC-20', () => {
  it.each<[Role, boolean]>([
    ['SUPER_ADMIN', true],
    ['FINANCE_ADMIN', true],
    ['OPERATIONS_ADMIN', false],
    ['SUPPLIER_OWNER', false],
    ['RUNNER', false],
    ['CUSTOMER', false],
  ])('%s may open it: %s', (role, allowed) => {
    expect(canAccessAdminPath(role, PROMO)).toBe(allowed);
  });

  it('covers a deeper path under the page too', () => {
    expect(canAccessAdminPath('FINANCE_ADMIN', `${PROMO}/prm001`)).toBe(true);
    expect(canAccessAdminPath('OPERATIONS_ADMIN', `${PROMO}/prm001`)).toBe(false);
  });

  it('leaves finance out of what it never had', () => {
    expect(canAccessAdminPath('FINANCE_ADMIN', '/admin/orders')).toBe(false);
  });

  it('leaves operations its own pages', () => {
    expect(canAccessAdminPath('OPERATIONS_ADMIN', '/admin/orders')).toBe(true);
  });
});

describe('the middleware keeps the same lists · covers AC-20', () => {
  const middleware = fs.readFileSync(path.join(process.cwd(), 'middleware.ts'), 'utf8');

  /** The quoted paths in one `const NAME = [...]` of middleware.ts. */
  const listIn = (name: string) => {
    const start = middleware.indexOf(`const ${name} = [`);
    const body = start < 0 ? '' : middleware.slice(start, middleware.indexOf(']', start));
    return [...body.matchAll(/'([^']+)'/g)].map((match) => match[1]).sort();
  };

  it('allows finance the same pages', () => {
    expect(listIn('FINANCE_ALLOWED')).toEqual([...FINANCE_ALLOWED_PREFIXES].sort());
  });

  it('denies operations the same pages', () => {
    expect(listIn('OPS_DENIED')).toEqual([...OPS_DENIED_PREFIXES].sort());
  });
});
