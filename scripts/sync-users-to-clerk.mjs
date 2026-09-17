/**
 * Push the people directory into Clerk.
 *
 *   node scripts/sync-users-to-clerk.mjs            # create or update every account
 *   node scripts/sync-users-to-clerk.mjs --dry-run  # say what would change
 *
 * The Sanity Studio is where the product owner adds and edits users, so it is
 * the source of truth for who exists and with which role. This script makes
 * Clerk agree: for every `user` document it finds the Clerk account by e-mail
 * (creating it if missing), sets the name, and writes the authorisation
 * fields the app reads from `publicMetadata` - role, supplier_id, runner_id,
 * customer_type. It also stamps `clerk_user_id` onto the matching profile row
 * in data/users.json so the app's lookup is exact from the first request.
 *
 * Passwords: the eight demo accounts get the passwords documented in the
 * README (and in app/sign-in/demo-accounts.ts) on the development instance,
 * with Clerk's breach check skipped because they are deliberately memorable.
 * Anyone else is created without a password and signs in with an e-mail code
 * or sets one through "Forgot password". Never run this against a production
 * instance with the demo map in place.
 *
 * Needs CLERK_SECRET_KEY in .env.local. Reads Sanity anonymously (the dataset
 * is public); with SANITY_API_WRITE_TOKEN set it also writes `clerkUserId`
 * back onto each Sanity user document.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import nextEnv from '@next/env';
import { createClerkClient } from '@clerk/backend';
import { createClient } from '@sanity/client';

const ROOT = process.cwd();
nextEnv.loadEnvConfig(ROOT);

const DRY_RUN = process.argv.includes('--dry-run');

const secretKey = process.env.CLERK_SECRET_KEY;
if (!secretKey) {
  console.error('CLERK_SECRET_KEY is not set. Run `clerk init` or copy it from the Clerk dashboard into .env.local.');
  process.exit(1);
}
if (!secretKey.startsWith('sk_test_') && !DRY_RUN) {
  console.error('Refusing to run against a non-development Clerk instance (secret key is not sk_test_*).');
  process.exit(1);
}

/** Demo passwords, development instance only. Keep in step with README §Demo accounts. */
const DEMO_PASSWORDS = {
  'admin@afrideal.co.bw': 'Admin@2026',
  'ops@afrideal.co.bw': 'Ops@2026',
  'finance@afrideal.co.bw': 'Finance@2026',
  'supplier@naledi.co.bw': 'Supplier@2026',
  'supplier@glowup.co.za': 'Supplier@2026',
  'runner@afrideal.co.bw': 'Runner@2026',
  'thabo@gmail.com': 'Customer@2026',
  'kefilwe@gmail.com': 'Customer@2026',
};

const clerk = createClerkClient({ secretKey });

const sanity = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? 'bly84glb',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: process.env.SANITY_API_VERSION ?? '2025-08-15',
  useCdn: false,
  perspective: 'published',
  token: process.env.SANITY_API_WRITE_TOKEN,
});

const stripPrefix = (id) => (id ? id.replace(/^(user|supplier|runner)-/, '') : null);

// ── Read the directory ─────────────────────────────────────────────────────────

const directory = await sanity.fetch(`*[_type == "user"] | order(name asc) {
  _id, name, email, role, status, avatar, clerkUserId,
  "supplier_id": supplier._ref,
  "runner_id": *[_type == "runner" && account._ref == ^._id][0]._id
}`);

const usersPath = path.join(ROOT, 'data', 'users.json');
const profiles = JSON.parse(readFileSync(usersPath, 'utf8'));
const profileByEmail = new Map(profiles.map((row) => [row.email.toLowerCase(), row]));

function splitName(name) {
  const parts = name.trim().split(/\s+/);
  return { firstName: parts[0] ?? '', lastName: parts.slice(1).join(' ') };
}

function metadataFor(entry, profile) {
  const metadata = {
    role: entry.role,
    supplier_id: stripPrefix(entry.supplier_id) ?? profile?.supplier_id ?? null,
    runner_id: stripPrefix(entry.runner_id) ?? profile?.runner_id ?? null,
    customer_type: profile?.customer_type ?? (entry.role === 'CUSTOMER' ? 'RETAIL' : undefined),
  };
  if (profile?.id) metadata.user_id = profile.id;
  return Object.fromEntries(Object.entries(metadata).filter(([, value]) => value !== undefined));
}

function sameMetadata(a, b) {
  return JSON.stringify(a ?? {}) === JSON.stringify(b ?? {});
}

// ── Sync ───────────────────────────────────────────────────────────────────────

const rows = [];
let profilesChanged = false;

for (const entry of directory) {
  const email = (entry.email ?? '').trim().toLowerCase();
  if (!email) {
    rows.push({ name: entry.name, email: '—', action: 'skipped: no e-mail' });
    continue;
  }

  const profile = profileByEmail.get(email);
  const metadata = metadataFor(entry, profile);
  const { firstName, lastName } = splitName(entry.name ?? email);

  const { data: existing } = await clerk.users.getUserList({ emailAddress: [email], limit: 1 });
  let account = existing[0] ?? null;
  let action;

  if (!account) {
    const password = DEMO_PASSWORDS[email];
    action = password ? 'created (demo password)' : 'created (no password; e-mail code)';
    if (!DRY_RUN) {
      account = await clerk.users.createUser({
        emailAddress: [email],
        firstName,
        lastName,
        publicMetadata: metadata,
        ...(profile?.id ? { externalId: profile.id } : {}),
        ...(password ? { password, skipPasswordChecks: true } : { skipPasswordRequirement: true }),
      });
    }
  } else {
    const nameChanged = account.firstName !== firstName || account.lastName !== lastName;
    const metadataChanged = !sameMetadata(account.publicMetadata, metadata);
    action = nameChanged || metadataChanged ? 'updated' : 'unchanged';
    if (!DRY_RUN && nameChanged) await clerk.users.updateUser(account.id, { firstName, lastName });
    if (!DRY_RUN && metadataChanged) await clerk.users.updateUserMetadata(account.id, { publicMetadata: metadata });
  }

  const clerkUserId = account?.id ?? '(dry run)';

  // Stamp the profile row so the app's lookup is exact; create one if the
  // directory has someone the JSON store has never seen.
  if (!DRY_RUN && account) {
    if (profile) {
      if (profile.clerk_user_id !== account.id) {
        profile.clerk_user_id = account.id;
        profilesChanged = true;
      }
    } else {
      const nextNumber =
        profiles.reduce((max, row) => Math.max(max, Number.parseInt(row.id.slice(1), 10) || 0), 0) + 1;
      profiles.push({
        id: `u${String(nextNumber).padStart(3, '0')}`,
        name: entry.name ?? email,
        email,
        role: entry.role ?? 'CUSTOMER',
        avatar: entry.avatar ?? '',
        status: entry.status ?? 'ACTIVE',
        ...(metadata.supplier_id ? { supplier_id: metadata.supplier_id } : {}),
        ...(metadata.runner_id ? { runner_id: metadata.runner_id } : {}),
        ...(metadata.customer_type ? { customer_type: metadata.customer_type } : {}),
        clerk_user_id: account.id,
      });
      profilesChanged = true;
    }

    if (process.env.SANITY_API_WRITE_TOKEN && entry.clerkUserId !== account.id) {
      await sanity.patch(entry._id).set({ clerkUserId: account.id }).commit();
    }
  }

  rows.push({ name: entry.name, email, role: metadata.role, clerk: clerkUserId, action });
}

if (profilesChanged && !DRY_RUN) {
  writeFileSync(usersPath, `${JSON.stringify(profiles, null, 2)}\n`);
}

console.table(rows);
console.log(
  DRY_RUN
    ? 'Dry run - nothing written.'
    : `${rows.length} directory entries synced${profilesChanged ? '; data/users.json updated' : ''}.`,
);
