import path from 'node:path';

import { ALL_DEMO_ACCOUNTS, type DemoAccount } from '@/app/sign-in/demo-accounts';

/**
 * The eight demo accounts, by the short names the journeys use
 * (docs/testing/e2e-journeys.md, "Before you start").
 */
export const PEOPLE = {
  admin: 'admin@afrideal.co.bw',
  ops: 'ops@afrideal.co.bw',
  finance: 'finance@afrideal.co.bw',
  naledi: 'supplier@naledi.co.bw',
  glowup: 'supplier@glowup.co.za',
  kagiso: 'runner@afrideal.co.bw',
  thabo: 'thabo@gmail.com',
  kefilwe: 'kefilwe@gmail.com',
} as const;

export type Person = keyof typeof PEOPLE;

export function account(person: Person): DemoAccount {
  const found = ALL_DEMO_ACCOUNTS.find((a) => a.email === PEOPLE[person]);
  if (!found) throw new Error(`No demo card for ${person} (${PEOPLE[person]})`);
  return found;
}

/** Where each role lands after sign in (middleware.ts, LANDING). */
export const LANDING: Record<DemoAccount['role'], string> = {
  SUPER_ADMIN: '/admin/dashboard',
  OPERATIONS_ADMIN: '/admin/dashboard',
  FINANCE_ADMIN: '/admin/analytics',
  SUPPLIER_OWNER: '/supplier/dashboard',
  RUNNER: '/runner/dashboard',
  CUSTOMER: '/',
};

/** The saved session for one person, written by e2e/auth.setup.ts. */
export function sessionFile(person: Person): string {
  return path.join(__dirname, '..', '.auth', `${person}.json`);
}
