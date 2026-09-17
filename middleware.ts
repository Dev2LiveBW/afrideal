import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import type { Role } from '@/types';

/**
 * Route protection per role, on Clerk sessions.
 *
 * Runs on the Edge runtime, so it reads the session token only - no
 * filesystem, no database, no call to Clerk's API. The role arrives in the
 * token's `metadata` claim once the Clerk dashboard is set to include
 * `{"metadata": "{{user.public_metadata}}"}` (Sessions → Customize session
 * token). Until that is done the claim is absent and this file gates on
 * signed-in-or-not only; the portal layouts (`app/(admin)/layout.tsx` and
 * siblings) apply the same role rules server-side, so nothing is exposed
 * either way - it just bounces one hop later.
 *
 * Kept deliberately in sync with `canAccessAdminPath` in lib/roles.ts; that
 * helper is the server-component equivalent for the same rules.
 */

const FINANCE_ALLOWED = ['/admin/analytics', '/admin/payables', '/admin/settlements'];
const OPS_DENIED = ['/admin/settings', '/admin/finance', '/admin/settlements'];

const LANDING: Record<Role, string> = {
  SUPER_ADMIN: '/admin/dashboard',
  OPERATIONS_ADMIN: '/admin/dashboard',
  FINANCE_ADMIN: '/admin/analytics',
  SUPPLIER_OWNER: '/supplier/dashboard',
  RUNNER: '/runner/dashboard',
  CUSTOMER: '/',
};

/*
 * Surfaces an anonymous shopper may use. The cart is deliberately public: it
 * lives in persisted client state, so a shopper fills it before they have any
 * reason to sign in, and checkout is where an account becomes necessary.
 * Bouncing them at /cart loses the basket they just built. /suppliers and
 * /categories are discovery surfaces in the same class as /browse; /rfq's
 * landing is a pitch page whose details step asks for sign-in itself; and
 * asking someone to sign in to read /how-it-works is the wrong way round.
 *
 * /login and /signup are the old NextAuth pages, kept as redirects to Clerk's
 * /sign-in and /sign-up so bookmarks and the `next` links inside the app keep
 * working.
 */
const isPublic = createRouteMatcher([
  '/',
  '/login(.*)',
  '/signup(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/browse(.*)',
  '/products(.*)',
  '/suppliers(.*)',
  '/categories(.*)',
  '/rfq(.*)',
  '/how-it-works(.*)',
  '/cart(.*)',
]);

/*
 * Route handlers guard themselves through `guard()` in lib/api.ts and answer
 * with a JSON 401 or 403 a client can read; a redirect to the sign-in page is
 * right for a navigation and wrong for fetch(). The matcher still covers /api
 * because Clerk needs to see the request to make `auth()` work inside it.
 */
const isApi = createRouteMatcher(['/api(.*)']);

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
  return true;
}

function roleOf(claims: CustomJwtSessionClaims | null): Role | null {
  const role = claims?.metadata?.role;
  return role && role in LANDING ? role : null;
}

export default clerkMiddleware(async (auth, req) => {
  if (isApi(req)) return NextResponse.next();

  const { userId, sessionClaims, redirectToSignIn } = await auth();
  const { pathname } = req.nextUrl;

  if (!userId) {
    if (isPublic(req)) return NextResponse.next();
    return redirectToSignIn({ returnBackUrl: req.url });
  }

  const role = roleOf(sessionClaims);
  if (role && !allowed(role, pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = LANDING[role] ?? '/';
    url.searchParams.set('denied', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Everything except Next internals and static files.
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Route handlers, so Clerk can resolve `auth()` inside them.
    '/(api|trpc)(.*)',
    '/__clerk/:path*',
  ],
};
