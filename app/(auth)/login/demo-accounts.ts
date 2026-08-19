import type { Role } from '@/types';

/**
 * The eight seeded accounts, for the one-click demo cards.
 *
 * These passwords are in `data/users.json` in plain text and are documented in
 * the README. Nothing is being leaked by putting them here: the whole point of
 * this build is that anyone watching a demo can jump between roles without
 * typing. Real credentials would never live in a client bundle.
 */

export interface DemoAccount {
  email: string;
  password: string;
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
        password: 'Admin@2026',
        name: 'AfriDeal Admin',
        role: 'SUPER_ADMIN',
        avatar: 'AA',
        blurb: 'Unrestricted. Every console surface.',
      },
      {
        email: 'ops@afrideal.co.bw',
        password: 'Ops@2026',
        name: 'Keabetswe Molapo',
        role: 'OPERATIONS_ADMIN',
        avatar: 'KM',
        blurb: 'Everything except settings and the ledger.',
      },
      {
        email: 'finance@afrideal.co.bw',
        password: 'Finance@2026',
        name: 'Finance Admin',
        role: 'FINANCE_ADMIN',
        avatar: 'FA',
        blurb: 'Escrow, settlements and analytics only.',
      },
    ],
  },
  {
    heading: 'Suppliers',
    caption: 'Scoped to their own data',
    accounts: [
      {
        email: 'supplier@naledi.co.bw',
        password: 'Supplier@2026',
        name: 'Naledi Beauty Supplies',
        role: 'SUPPLIER_OWNER',
        avatar: 'NB',
        blurb: 'Verified, Gaborone. 92/100 reliability.',
      },
      {
        email: 'supplier@glowup.co.za',
        password: 'Supplier@2026',
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
        password: 'Runner@2026',
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
        password: 'Customer@2026',
        name: 'Thabo Modise',
        role: 'CUSTOMER',
        avatar: 'TM',
        blurb: 'Seven orders, one in dispute.',
      },
      {
        email: 'kefilwe@gmail.com',
        password: 'Customer@2026',
        name: 'Kefilwe Dithebe',
        role: 'CUSTOMER',
        avatar: 'KD',
        blurb: 'Six orders across three suppliers.',
      },
    ],
  },
];

export const ALL_DEMO_ACCOUNTS = DEMO_GROUPS.flatMap((group) => group.accounts);
