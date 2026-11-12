import type { Role } from '@/types';

/**
 * The eight seeded accounts, for the one-click demo cards.
 *
 * No passwords: this file reaches the browser, and the cards sign in with a
 * one-time ticket the server issues (`demoSignInTicket`). The passwords
 * `scripts/sync-users-to-clerk.mjs` sets stay in that script.
 */

export interface DemoAccount {
  email: string;
  name: string;
  role: Role;
  avatar: string;
  /** What this account is for, in the demo. */
  blurb: string;
}

export const DEMO_GROUPS: { heading: string; caption: string; accounts: DemoAccount[] }[] = [
  {
    heading: 'Platform',
    caption: 'Operations console',
    accounts: [
      {
        email: 'admin@afrideal.co.bw',
        name: 'AfriDeal Admin',
        role: 'SUPER_ADMIN',
        avatar: 'AA',
        blurb: 'Unrestricted. Every console surface.',
      },
      {
        email: 'ops@afrideal.co.bw',
        name: 'Keabetswe Molapo',
        role: 'OPERATIONS_ADMIN',
        avatar: 'KM',
        blurb: 'Everything except settings and the ledger.',
      },
      {
        email: 'finance@afrideal.co.bw',
        name: 'Finance Admin',
        role: 'FINANCE_ADMIN',
        avatar: 'FA',
        blurb: 'Supplier payables, settlements and analytics only.',
      },
    ],
  },
  {
    heading: 'Suppliers',
    caption: 'Scoped to their own data',
    accounts: [
      {
        email: 'supplier@naledi.co.bw',
        name: 'Naledi Beauty Supplies',
        role: 'SUPPLIER_OWNER',
        avatar: 'NB',
        blurb: 'Verified, Gaborone. 92/100 reliability.',
      },
      {
        email: 'supplier@glowup.co.za',
        name: 'GlowUp Distributors',
        role: 'SUPPLIER_OWNER',
        avatar: 'GU',
        blurb: 'Verified, Johannesburg. Cheaper, ranks lower.',
      },
    ],
  },
  {
    heading: 'Logistics',
    caption: 'Mobile-first',
    accounts: [
      {
        email: 'runner@afrideal.co.bw',
        name: 'Kagiso Sithole',
        role: 'RUNNER',
        avatar: 'KS',
        blurb: '312 deliveries. Currently online.',
      },
    ],
  },
  {
    heading: 'Customers',
    caption: 'Storefront and order tracking',
    accounts: [
      {
        email: 'thabo@gmail.com',
        name: 'Thabo Modise',
        role: 'CUSTOMER',
        avatar: 'TM',
        blurb: 'Seven orders, one in dispute.',
      },
      {
        email: 'kefilwe@gmail.com',
        name: 'Kefilwe Dithebe',
        role: 'CUSTOMER',
        avatar: 'KD',
        blurb: 'Six orders across three suppliers.',
      },
    ],
  },
];

export const ALL_DEMO_ACCOUNTS = DEMO_GROUPS.flatMap((group) => group.accounts);
