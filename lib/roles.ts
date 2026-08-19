import type { Role } from '@/types';

/**
 * Role constants, safe to import from client components.
 *
 * These live apart from `lib/auth.ts` because that module reaches the
 * server-only JSON store. Importing a label from it inside a `'use client'`
 * file would drag `node:fs` into the browser bundle and fail the build.
 */

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin',
  OPERATIONS_ADMIN: 'Operations',
  FINANCE_ADMIN: 'Finance',
  SUPPLIER_OWNER: 'Supplier',
  RUNNER: 'Runner',
  CUSTOMER: 'Customer',
};

/** Where each role lands after signing in. */
export const LANDING_BY_ROLE: Record<Role, string> = {
  SUPER_ADMIN: '/admin/dashboard',
  OPERATIONS_ADMIN: '/admin/dashboard',
  FINANCE_ADMIN: '/admin/analytics',
  SUPPLIER_OWNER: '/supplier/dashboard',
  RUNNER: '/runner/dashboard',
  CUSTOMER: '/',
};

export function landingFor(role: Role): string {
  return LANDING_BY_ROLE[role] ?? '/';
}

/** Roles that see the admin console at all. */
export const ADMIN_ROLES: Role[] = ['SUPER_ADMIN', 'OPERATIONS_ADMIN', 'FINANCE_ADMIN'];

export const FINANCE_ALLOWED_PREFIXES = [
  '/admin/analytics',
  '/admin/escrow',
  '/admin/settlements',
];

export const OPS_DENIED_PREFIXES = ['/admin/settings', '/admin/finance', '/admin/settlements'];

/**
 * Finance is scoped to money surfaces only. Operations sees everything except
 * platform settings and the finance-only ledger. Super admin is unrestricted.
 * `middleware.ts` enforces the same rules on the Edge runtime.
 */
export function canAccessAdminPath(role: Role, pathname: string): boolean {
  if (role === 'SUPER_ADMIN') return true;
  if (role === 'FINANCE_ADMIN') return FINANCE_ALLOWED_PREFIXES.some((p) => pathname.startsWith(p));
  if (role === 'OPERATIONS_ADMIN') return !OPS_DENIED_PREFIXES.some((p) => pathname.startsWith(p));
  return false;
}
