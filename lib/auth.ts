import 'server-only';
import { cache } from 'react';
import { auth as clerkAuth, currentUser } from '@clerk/nextjs/server';

import type { AfriDealMetadata } from '@/types/clerk';
import type { CustomerType, Role, User } from '@/types';

/**
 * Role constants live in `lib/roles.ts` so client components can read them
 * without pulling the server-only JSON store into the browser bundle. They are
 * re-exported here for convenience on the server.
 */
export {
  ADMIN_ROLES,
  FINANCE_ALLOWED_PREFIXES,
  LANDING_BY_ROLE,
  OPS_DENIED_PREFIXES,
  ROLE_LABELS,
  canAccessAdminPath,
  landingFor,
} from '@/lib/roles';

/**
 * Sessions come from Clerk; profiles come from the `users` collection.
 *
 * Clerk owns identity - credentials, sign-in, sign-up, password reset, rate
 * limiting. What it does not know is who a person *is* to AfriDeal, so each
 * Clerk user maps to a row in `users`: found by `clerk_user_id`, then by
 * e-mail, and created on first sight as a CUSTOMER when neither matches. That
 * last case is how a shopper who signed up through Clerk's own form gets a
 * profile without a webhook.
 *
 * Authorisation fields (`role`, `supplier_id`, `runner_id`, `customer_type`)
 * are read from the Clerk user's `publicMetadata` when present, because that
 * is the only copy middleware can see in the session token. The profile row
 * carries the same values as a fallback and for display. Keep them in step
 * with `scripts/sync-users-to-clerk.mjs`.
 *
 * The session shape below is unchanged from the NextAuth days on purpose:
 * every page and route handler reads `session.user.<field>` and none of them
 * had to change.
 */

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar: string;
  supplier_id: string | null;
  runner_id: string | null;
  /** §7 - decides which pricing tiers this buyer can be quoted. */
  customer_type: CustomerType;
}

export interface Session {
  user: SessionUser;
  /** Clerk's id for the signed-in account, for anything that talks to Clerk. */
  clerkUserId: string;
}

const ROLES: readonly Role[] = [
  'SUPER_ADMIN',
  'OPERATIONS_ADMIN',
  'FINANCE_ADMIN',
  'SUPPLIER_OWNER',
  'RUNNER',
  'CUSTOMER',
];

const CUSTOMER_TYPES: readonly CustomerType[] = ['GUEST', 'RETAIL', 'BUSINESS', 'RESELLER', 'INSTITUTIONAL'];

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

function isCustomerType(value: unknown): value is CustomerType {
  return typeof value === 'string' && (CUSTOMER_TYPES as readonly string[]).includes(value);
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}

/**
 * The profile row for a Clerk account, creating one on first sight.
 *
 * Lookup order matters: `clerk_user_id` is exact; e-mail is how the eight
 * seeded profiles get claimed the first time their owner signs in through
 * Clerk (and is stamped so the next lookup is exact).
 */
async function resolveProfile(
  clerkUserId: string,
  email: string,
  displayName: string,
  metadata: AfriDealMetadata,
): Promise<User> {
  const { readAll, update, insert, nextId } = await import('@/lib/db');
  const users = await readAll('users');

  const byClerkId = users.find((row) => row.clerk_user_id === clerkUserId);
  if (byClerkId) return byClerkId;

  const byEmail = email ? users.find((row) => row.email.toLowerCase() === email) : undefined;
  if (byEmail) {
    return (await update('users', byEmail.id, { clerk_user_id: clerkUserId })) ?? byEmail;
  }

  const name = displayName || (email ? email.split('@')[0]! : 'New customer');
  return insert('users', {
    id: await nextId('users', 'u'),
    name,
    email,
    role: isRole(metadata.role) ? metadata.role : 'CUSTOMER',
    avatar: initials(name),
    status: 'ACTIVE',
    customer_type: isCustomerType(metadata.customer_type) ? metadata.customer_type : 'RETAIL',
    clerk_user_id: clerkUserId,
  });
}

/**
 * Server-side session helper. Null when nobody is signed in.
 *
 * Wrapped in React's `cache` so the layout, the page and every component under
 * them share one lookup per request instead of each calling Clerk.
 */
export const auth = cache(async (): Promise<Session | null> => {
  const { userId } = await clerkAuth();
  if (!userId) return null;

  const account = await currentUser();
  if (!account) return null;

  const metadata = (account.publicMetadata ?? {}) as AfriDealMetadata;
  const email = (account.primaryEmailAddress?.emailAddress ?? '').trim().toLowerCase();
  const displayName = [account.firstName, account.lastName].filter(Boolean).join(' ').trim();

  const profile = await resolveProfile(userId, email, displayName, metadata);
  if (profile.status !== 'ACTIVE') return null;

  return {
    clerkUserId: userId,
    user: {
      id: profile.id,
      name: profile.name,
      email: profile.email || email,
      role: isRole(metadata.role) ? metadata.role : profile.role,
      avatar: profile.avatar || initials(profile.name),
      supplier_id: metadata.supplier_id ?? profile.supplier_id ?? null,
      runner_id: metadata.runner_id ?? profile.runner_id ?? null,
      customer_type: isCustomerType(metadata.customer_type)
        ? metadata.customer_type
        : (profile.customer_type ?? 'RETAIL'),
    },
  };
});

/** Session, or throw - for API routes that must have a signed-in user. */
export async function requireSession(): Promise<Session> {
  const session = await auth();
  if (!session?.user) throw new Error('UNAUTHENTICATED');
  return session;
}

/** Strip anything private before a user record crosses the wire. */
export function toPublicUser(user: User) {
  const { password: _password, clerk_user_id: _clerkUserId, ...rest } = user;
  return rest;
}
