import type { NextAuthOptions } from 'next-auth';
import { getServerSession } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

import type { User } from '@/types';

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
 * Credentials auth over the local JSON user store.
 *
 * Passwords are stored in plain text in /data/users.json. That is deliberate
 * for a demo whose whole point is one-click login as any of eight seeded roles,
 * and it is the single thing that must change before this touches real users:
 * hash on write, compare with a constant-time check here.
 */

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt', maxAge: 60 * 60 * 8 },
  pages: { signIn: '/login', error: '/login' },
  providers: [
    CredentialsProvider({
      name: 'AfriDeal',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;

        // Imported lazily so this module carries no static dependency on the
        // server-only store, which keeps it importable from client components.
        const { readAll } = await import('@/lib/db');
        const users = await readAll('users');
        const email = credentials.email.trim().toLowerCase();
        const user = users.find((candidate) => candidate.email.toLowerCase() === email);

        if (!user || user.password !== credentials.password) return null;
        if (user.status !== 'ACTIVE') return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          supplier_id: user.supplier_id ?? null,
          runner_id: user.runner_id ?? null,
          customer_type: user.customer_type ?? 'RETAIL',
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.avatar = user.avatar;
        token.supplier_id = user.supplier_id ?? null;
        token.runner_id = user.runner_id ?? null;
        token.customer_type = user.customer_type ?? 'RETAIL';
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.avatar = token.avatar;
        session.user.supplier_id = token.supplier_id;
        session.user.runner_id = token.runner_id;
        session.user.customer_type = token.customer_type ?? 'RETAIL';
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET ?? 'afrideal-mvp-demo-secret',
};

/** Server-side session helper. */
export function auth() {
  return getServerSession(authOptions);
}

/** Session, or throw — for API routes that must have a signed-in user. */
export async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new Error('UNAUTHENTICATED');
  return session;
}

/** Strip the password before a user record crosses the wire. */
export function toPublicUser(user: User) {
  const { password: _password, ...rest } = user;
  return rest;
}
