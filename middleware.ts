import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

import type { Role } from '@/types';

/**
 * Route protection per role.
 *
 * Runs on the Edge runtime, so it reads the JWT only — no filesystem, no
 * database. The claims it needs (`role`) are stamped onto the token by the jwt
 * callback in lib/auth.ts.
 *
 * Kept deliberately in sync with `canAccessAdminPath` in lib/auth.ts; that
 * helper is the server-component equivalent for the same rules.
 */

const FINANCE_ALLOWED = ['/admin/analytics', '/admin/escrow', '/admin/settlements'];
const OPS_DENIED = ['/admin/settings', '/admin/finance', '/admin/settlements'];

const LANDING: Record<Role, string> = {
  SUPER_ADMIN: '/admin/dashboard',
  OPERATIONS_ADMIN: '/admin/dashboard',
  FINANCE_ADMIN: '/admin/analytics',
  SUPPLIER_OWNER: '/supplier/dashboard',
  RUNNER: '/runner/dashboard',
  CUSTOMER: '/',
};

function startsWithAny(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => pathname.startsWith(prefix));
}

function allowed(role: Role, pathname: string): boolean {
  if (pathname.startsWith('/admin')) {
    if (role === 'SUPER_ADMIN') return true;
    if (role === 'FINANCE_ADMIN') return startsWithAny(pathname, FINANCE_ALLOWED);
    if (role === 'OPERATIONS_ADMIN') return !startsWithAny(pathname, OPS_DENIED);
    return false;
  }

  if (pathname.startsWith('/supplier')) return role === 'SUPPLIER_OWNER' || role === 'SUPER_ADMIN';
  if (pathname.startsWith('/runner')) return role === 'RUNNER' || role === 'SUPER_ADMIN';

  // Customer surfaces. Staff may look, which makes demoing far less fiddly.
  if (startsWithAny(pathname, ['/cart', '/checkout', '/orders'])) return true;

  return true;
}

export default withAuth(
  function proxy(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    if (!token) return NextResponse.next();

    const role = token.role as Role;

    if (!allowed(role, pathname)) {
      const url = req.nextUrl.clone();
      url.pathname = LANDING[role] ?? '/';
      url.searchParams.set('denied', pathname);
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  },
  {
    pages: { signIn: '/login' },
    callbacks: {
      /**
       * `true` lets the request through to the handler above; `false` bounces to
       * the sign-in page. Public surfaces return true unconditionally so an
       * anonymous shopper can browse the whole catalogue before being asked for
       * anything.
       */
      authorized({ req, token }) {
        const { pathname } = req.nextUrl;

        /*
         * The cart is deliberately public. It lives in persisted client state,
         * so a shopper fills it before they have any reason to sign in, and
         * checkout is the point where an account actually becomes necessary.
         * Bouncing them at /cart loses the basket they just built.
         */
        const isPublic =
          pathname === '/' ||
          pathname.startsWith('/login') ||
          pathname.startsWith('/browse') ||
          pathname.startsWith('/products') ||
          pathname.startsWith('/cart');

        if (isPublic) return true;

        return token != null;
      },
    },
  },
);

export const config = {
  matcher: [
    /*
     * Pages only. Every /api route is excluded on purpose:
     *
     *  - matching /api/auth would deadlock the sign-in round trip, and
     *  - withAuth answers a refusal with a 302 to the sign-in page, which is
     *    right for a navigation and wrong for fetch(). The route handlers guard
     *    themselves through `guard()` in lib/api.ts and answer with a JSON 401
     *    or 403 that a client can actually read.
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg$|.*\\.png$).*)',
  ],
};
