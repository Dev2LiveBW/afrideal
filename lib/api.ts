import 'server-only';
import { NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import type { CustomerType, Role } from '@/types';

/** Shared response and guard helpers for the route handlers. */

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export interface Actor {
  id: string;
  name: string;
  role: Role;
  supplierId: string | null;
  runnerId: string | null;
  /** §7 — which pricing tiers this caller may be quoted. */
  customerType: CustomerType;
}

/**
 * Resolve the caller, optionally restricted to a set of roles.
 * Returns either `{ actor }` or `{ response }` — the caller returns the latter
 * straight through, which keeps the guard to one line at each call site.
 */
export async function guard(
  allowed?: Role[],
): Promise<{ actor: Actor; response?: never } | { actor?: never; response: NextResponse }> {
  const session = await auth();

  if (!session?.user) {
    return { response: fail('You need to be signed in.', 401) };
  }

  const actor: Actor = {
    id: session.user.id,
    name: session.user.name ?? 'Unknown',
    role: session.user.role,
    supplierId: session.user.supplier_id ?? null,
    runnerId: session.user.runner_id ?? null,
    customerType: session.user.customer_type ?? 'RETAIL',
  };

  if (allowed && !allowed.includes(actor.role)) {
    return { response: fail('Your role cannot perform that action.', 403) };
  }

  return { actor };
}

/** Wrap a handler so an unexpected throw becomes a 500 rather than a crash. */
export function handled<A extends unknown[]>(
  fn: (...args: A) => Promise<NextResponse>,
): (...args: A) => Promise<NextResponse> {
  return async (...args: A) => {
    try {
      return await fn(...args);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error';
      if (message === 'UNAUTHENTICATED') return fail('You need to be signed in.', 401);
      console.error('[api]', error);
      return fail(message, 500);
    }
  };
}
