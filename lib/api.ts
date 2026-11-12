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
  /** §7 - which pricing tiers this caller may be quoted. */
  customerType: CustomerType;
}

/**
 * Resolve the caller, optionally restricted to a set of roles.
 * Returns either `{ actor }` or `{ response }` - the caller returns the latter
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

/**
 * Whether an error's message was written for the person who caused it. Set
 * `expose = true` on the error (a state machine refusing a move, a missing
 * Sanity write token for staff); everything else is ours to read, not theirs.
 */
function isExposed(error: unknown): error is Error {
  return error instanceof Error && (error as { expose?: unknown }).expose === true;
}

/**
 * Wrap a handler so an unexpected throw becomes a 500 rather than a crash.
 *
 * The caller gets a reference, never the error's own text: that can carry a
 * database, Stripe or configuration detail. The detail is logged under the
 * same reference so it can be found.
 */
export function handled<A extends unknown[]>(
  fn: (...args: A) => Promise<NextResponse>,
): (...args: A) => Promise<NextResponse> {
  return async (...args: A) => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof Error && error.message === 'UNAUTHENTICATED') {
        return fail('You need to be signed in.', 401);
      }
      const reference = crypto.randomUUID().slice(0, 8);
      console.error(`[api] ${reference}`, error);
      if (isExposed(error)) return NextResponse.json({ error: error.message, reference }, { status: 500 });
      return NextResponse.json(
        { error: `Something went wrong on our side. Reference ${reference}.`, reference },
        { status: 500 },
      );
    }
  };
}
