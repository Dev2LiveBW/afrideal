# 0006. People and roles: one home, one path for every account change

**Date**: 2026-10-08
**Status**: Proposed

## Summary

Today a role can only be set by running a script that copies the Sanity Studio people directory into Clerk, so nobody can add a staff member, change a role or suspend an account from the console. This spec makes the app database the one home for every person: their role, status and suspension live in the `users` table and are changed in the console, through one function that updates the database, then Clerk, then the audit log. The Studio keeps supplier and runner records and shows people read only. A super admin can invite staff by email, promote a buyer to staff, change staff roles and suspend anyone, and the sign in page stops listing real people.

## Context

Scope feature 30 (milestone M6, "Managing user accounts"). Workflow tier GA: accounts, roles and the personal data behind them, under Botswana's Data Protection Act 2018.

How it works on `main` (2026-10-08):

- Roles are read from the Clerk session (`sessionClaims.metadata`); `toSession()` in `lib/auth.ts` prefers the token's role over the `users` row's. Roles are written only by `scripts/sync-users-to-clerk.mjs`, which copies Sanity `user` documents into Clerk `publicMetadata`.
- A person who signs up through Clerk gets a `users` row on first sign in (`resolveProfile()`), with the role taken from Clerk metadata or `CUSTOMER`. One real person has done so on the live site (`u009`, 2026-10-06).
- `User.status` (`ACTIVE`, `SUSPENDED`) exists; `toSession()` returns `null` for a non active profile, so `guard()` would answer 401 and a page would bounce to sign in while Clerk still says signed in. Nothing sets the status today.
- `GET /api/users` is unauthenticated and returns every user (name, email, role) for the sign in page's demo cards, so `u009` is listed to anyone.
- Finance is limited to analytics, payables and settlements by two lists that must agree: `FINANCE_ALLOWED` in `middleware.ts` and `FINANCE_ALLOWED_PREFIXES` in `lib/roles.ts`.
- Clerk is a development instance (`sk_test_`).

Forces:

- **A role must have one home and one writer.** Spec 0005 (runner approval) and feature 27 (supplier onboarding) need to grant roles from the app; two editable copies would drift.
- **Clerk is a mirror, not a store.** The session token carries the role and refreshes within about a minute of a metadata change; a suspension must end live sessions at once.
- **The product owner edits suppliers in the Studio** and keeps doing so; only people move out of it.

## Requirements

**User stories**:
- As a super admin, I want to invite a staff member with a role by email, or promote an existing buyer, so that staff can sign in with the right access without anyone handling a password.
- As a super admin, I want to change a staff member's role or suspend any account, so that access matches who works here today.
- As a suspended person, I want to be told my account is suspended rather than bounced around sign in.
- As a visitor, I want the sign in page not to show other people's names and emails.

**Acceptance criteria**:
- **AC-1**: `/admin/users` lists every account with name, email, role, status, the date they joined and a link to their supplier (`/admin/suppliers/[id]`) or runner (`/admin/runners`) record, searchable by name and email and filterable by role and status, with a second tab of staff invitations. Super admin, operations and finance can open it (finance gains `/admin/users` in both allow lists). Only a super admin can change anything; any write by another role returns 403.
- **AC-2**: A super admin invites a staff member (name, email, one of `SUPER_ADMIN`, `OPERATIONS_ADMIN`, `FINANCE_ADMIN`). Clerk sends the invitation and a `StaffInvitation` is `PENDING`. When a person whose **verified** primary email matches signs in for the first time, their `users` row gets that role, Clerk metadata is set, and the invitation is `ACCEPTED`. A sign in with a different email is an ordinary buyer. A pending invitation can be revoked; one not accepted in 30 days reads as expired. Inviting an email that already has an account returns 409 with "Use Promote instead".
- **AC-3**: A super admin can promote an existing buyer (`CUSTOMER`) to a staff role, and change a staff member's role among the three staff roles. The new role applies within about a minute (Clerk's token refresh); the person is not signed out.
- **AC-4**: No other role change is possible from the console: to or from `SUPPLIER_OWNER` or `RUNNER`, or from staff back to `CUSTOMER`, returns 422. Those roles come only from supplier onboarding (feature 27) and runner approval (spec 0005).
- **AC-5**: A super admin can suspend any account with a reason, and reactivate it. Suspending sets `status: SUSPENDED`, bans the Clerk account and ends its sessions; reactivating lifts the ban. The database decides: a suspended person gets 403 from every API and the "This account is suspended" screen on every page (with AfriDeal's support email), even if Clerk has not caught up. Their orders and history are kept.
- **AC-6**: Suspending a runner also takes them offline, returns their `ASSIGNED` jobs to the pool, and notifies operations of any job they have already picked up. Suspending a supplier person does not change the supplier's catalogue (feature 27 owns supplier status).
- **AC-7**: Nobody can change their own role or suspend themselves, and the last active super admin cannot be suspended or demoted (409). Two super admins acting at once cannot both succeed in removing the last one.
- **AC-8**: If Clerk cannot be updated, the database change stands, the person shows "Clerk not updated" with a Retry that pushes the person's current database state to Clerk, and gating still follows the database.
- **AC-9**: The sign in page's demo cards list only accounts flagged `demo: true`; the public endpoint returns only their id, name, role and avatar. No real account is ever listed and no email is returned.
- **AC-10**: Every invitation, acceptance, promotion, role change, suspension and reactivation is written to the audit log with actor, before and after, and reason.
- **AC-11**: `npm run verify` covers the role guards on every write, the 422 for disallowed role changes, the self and last super admin safeguards, a suspended session getting 403, the runner suspension side effects, and the demo endpoint. Invitations in verify use Clerk test addresses that send no email.

## Options considered

### Option 1: The app database is every person's home; the Studio shows people read only

`users` holds role, status and suspension for everyone; `lib/people.ts` is the only writer; Clerk mirrors it. The Studio keeps supplier and runner records and its `user` documents become a read only view (and the demo seed).

**Pros**: one copy of every role; no webhook, no Sanity write token, no sync loops; one function to test.

**Cons**: the product owner no longer edits people in the Studio; the Studio view can lag the console.

### Option 2: Split by kind (staff in the console, supplier and runner people in the Studio)

The product owner's first choice. A Studio publish reaches the app through a signed webhook; a console change writes Sanity first.

**Pros**: supplier and runner people stay editable next to their records.

**Cons**: a webhook loop and out of order deliveries, a Sanity write token in production, runner data in three places, a way to grant roles from the Studio that skips vetting, and people created in the Studio signing in as buyers.

### Option 3: Both edit everyone, last write wins

**Pros**: maximum freedom. **Cons**: two editable copies of a role, which scope feature 30 forbids.

## Decision

**Chosen option**: Option 1: the app database is every person's home; the Studio shows people read only.

Every change goes through `applyPersonChange()` in `lib/people.ts`: check, then the `users` row, then side effects, then Clerk, then audit. The console, first sign in (invitation claim) and spec 0005's runner approval all call it.

## Rationale

The product owner first chose the split (option 2), then chose option 1 once the cross check showed where the risk sat: almost every serious finding (the loop, the vetting bypass, the three copies of runner data, people who sign in as buyers) came from making the Studio a second place that writes people. Option 1 keeps what the Studio is good at, supplier records and the catalogue, and removes the second writer. It is also the only way the scope's "single source of truth" holds without a synchronisation protocol to maintain.

Making the database decide (rather than the token) is what makes suspension and AC-8 safe: `lib/auth.ts` already loads the `users` row on every request, so reading status and role from it costs nothing and cannot be stale.

## Feature design

**Data model sketch** (confirmed with the product owner 2026-10-08, simplified after the cross check):

| Entity | Fields (new in **bold**) | Notes |
|---|---|---|
| `User` (exists, `users`) | `role`, `status`, `clerk_user_id`, **`demo`** (boolean, default false; true on the eight demo accounts), **`suspended_at`**, **`suspended_by`**, **`suspension_reason`** (nullable), **`clerk_synced_at`**, **`clerk_sync_error`** (nullable), **`joined_at`** | The one home of every person |
| **`StaffInvitation`** (new, `staff-invitations`) | `id` `inv001`, `email` (lowercased), `name`, `role` (a staff role), `clerk_invitation_id`, `status` (`PENDING`, `ACCEPTED`, `REVOKED`; expired is derived after 30 days), `invited_by`, `invited_at`, `accepted_at`, `accepted_user_id` (nullable) | |
| Sanity `user` document (exists) | unchanged | Read only in the Studio from now on, with a "managed in the AfriDeal console" note; still the source of the eight demo accounts for seeding |
| Clerk account | `publicMetadata` (role, supplier_id, runner_id, customer_type), banned flag | Mirror only |

**The write path**:

```ts
type PersonChange =
  | { kind: 'SET_ROLE'; role: StaffRole }                       // staff to staff, or CUSTOMER to staff (promote)
  | { kind: 'GRANT_ROLE'; role: 'RUNNER' | 'SUPPLIER_OWNER';    // spec 0005 approval, feature 27 onboarding only
      runner_id?: string; supplier_id?: string }
  | { kind: 'SUSPEND'; reason: string }
  | { kind: 'REACTIVATE' }
  | { kind: 'CLAIM_INVITATION'; invitationId: string }           // lib/auth.ts on first sign in
  | { kind: 'SYNC_CLERK' };                                      // Retry: push the row as it is now

applyPersonChange(personId, change, actor): Promise<{ person: User; warning: string | null }>
```

```
0. check   authority by actor and kind; safeguards; allowed transition.
1. row     mutate('users') re-reads the row and, for safeguards, every super admin
           inside the same lock, so two concurrent demotions cannot both pass.
2. effects SUSPEND of a runner: runners.online = false; ASSIGNED jobs back to
           UNASSIGNED (unassigned_at = now); PICKED_UP jobs notify operations;
           the runner application's documents_delete_after = now + 365 days (0005).
           REACTIVATE of a runner clears documents_delete_after.
3. clerk   Push the row's current state: metadata from the row; ban if SUSPENDED,
           unban if ACTIVE; on SUSPEND also revoke sessions. Success sets
           clerk_synced_at and clears clerk_sync_error; failure records it and
           returns a warning (AC-8). Pushing state rather than replaying a command
           means a Retry after suspend then reactivate cannot re-ban.
4. audit   STAFF_INVITED, INVITATION_ACCEPTED, PERSON_PROMOTED, PERSON_ROLE_CHANGED,
           PERSON_ROLE_GRANTED, PERSON_SUSPENDED, PERSON_REACTIVATED.
```

Changes to one person are serialised by the `users` lock, and step 3 reads the row after step 1 committed, so Clerk always ends at the last write. `GRANT_ROLE` is idempotent: granting a role the person already holds with the same link is a no op.

**Changes to `lib/auth.ts`**:
- `toSession()` takes the role from the `users` row, not the token (the token stays the fast path's lookup key), and returns the session with `suspended: true` instead of `null`.
- `guard()` answers 403 "This account is suspended" for a suspended session; the store, supplier, runner and console layouts render the suspended screen.
- `resolveProfile()` no longer writes a role from metadata: on first sign in it creates the row as `CUSTOMER` and, if a `PENDING` invitation under 30 days old matches the verified primary email, calls `applyPersonChange(..., { kind: 'CLAIM_INVITATION' })`.

**API surface**:

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/api/admin/people` | GET | `q?`, `role?`, `status?` | people (no Clerk ids) | super, ops, finance | 403 |
| `/api/admin/people/[id]` | PATCH `SET_ROLE` | `role` (staff role) | `{ person, warning }` | super admin | 403, 409 self or last super admin, 422 disallowed change |
| `/api/admin/people/[id]` | PATCH `SUSPEND` | `reason` (5 to 500 chars) | `{ person, warning }` | super admin | 403, 409 self or last super admin |
| `/api/admin/people/[id]` | PATCH `REACTIVATE` | | `{ person, warning }` | super admin | 403 |
| `/api/admin/people/[id]` | PATCH `RETRY_CLERK` | | `{ person, warning }` | super admin | 403 |
| `/api/admin/invitations` | GET | | invitations with derived expiry | super, ops, finance | 403 |
| `/api/admin/invitations` | POST | `name`, `email`, `role` | invitation | super admin | 409 account exists (use Promote) or pending invite, 422 |
| `/api/admin/invitations/[id]` | DELETE | | `REVOKED` (also revoked in Clerk) | super admin | 409 not pending |
| `/api/users` (exists) | GET | | demo accounts only: id, name, role, avatar | public | |

The Clerk calls (`updateUserMetadata`, `banUser`, `unbanUser`, session revoke, invitation create and revoke) are `@clerk/backend` 6.x methods; confirm the exact names against the installed version at build time.

**Value sourcing**:

| Action | Value | Source |
|---|---|---|
| Accept invitation | match | the Clerk user's verified primary email, lowercased, against `PENDING` invitations under 30 days old |
| Accept invitation | name | the invitation's `name`, else the Clerk name |
| Any change | actor | `guard()` actor; `system:sign-in` for a claim; `system:approvals` for spec 0005 |
| Suspended screen | contact | the `support_email` setting (seeded `support@afrideal.co.bw`) |
| Last super admin | count | `users` with role `SUPER_ADMIN` and status `ACTIVE`, read inside the lock |
| Demo cards | which accounts | `users` rows where `demo === true`, set by the seed for the eight demo emails |
| Joined | date | `joined_at`: the seed date, first sign in for new accounts, `created_at` of the row for the one off backfill |
| Runner suspension | jobs | `shipments` where `runner_id` matches and status `ASSIGNED` or `PICKED_UP` |

**Key invariants**:
- Only `applyPersonChange()` writes `role`, `status`, `runner_id`, `supplier_id` or Clerk metadata. The sync script is limited to the eight `demo: true` accounts on the development instance.
- At least one active super admin, always.
- The database decides role and status on every request.
- No public endpoint returns an email or a non demo account.

**Security model**:
- Super admin: all writes. Operations and finance: read the people and invitations lists. Everyone else: 403.
- Suspended accounts: 403 on APIs, the suspended screen on pages, banned in Clerk, sessions ended.
- Invitations bind to a verified email only; a different email gets no role.
- DPA 2018: names and emails visible only to staff; audit keeps before and after.

**Configuration required**:
- `support_email` setting (seeded). No new secrets: the Clerk secret key is already set, and no Sanity write token or webhook is needed.

**Critical test scenarios**:
- Invite Lesego as operations; Lesego signs in with that verified email and lands in the console; signing in with another email gives a buyer, verifies **AC-2**
- Promote Kefilwe to finance; within a minute finance pages open and she is not signed out, verifies **AC-3**
- Suspend a buyer with a live session; the next call is 403 even with Clerk unreachable, verifies **AC-5**, **AC-8**
- Suspend Kagiso with one assigned and one picked up job; the first returns to the pool, operations is told of the second, verifies **AC-6**
- Two super admins each demote the other at once when there are two: exactly one succeeds, verifies **AC-7**
- Demo endpoint returns 8 rows without emails and not `u009`, verifies **AC-9**

## Build plan

Tracer Bullet: first thread is one suspension, end to end, through the one write path; then thicken.

1. Data: new `users` fields (seed sets `demo` and `joined_at`; one off production backfill for `joined_at`); `staff-invitations` collection, table, migration; `support_email` setting. Satisfies **AC-1**, **AC-9**
2. Thread: `lib/people.ts` with `SUSPEND`, `REACTIVATE`, `SYNC_CLERK`; `lib/auth.ts` reads role and status from the row and returns `suspended`; `guard()` 403 and the suspended screen; `/admin/users` list with Suspend; finance allow lists. Satisfies **AC-1**, **AC-5**, **AC-8**, **AC-10**
3. Runner suspension effects. Satisfies **AC-6**
4. Demo endpoint returns only demo accounts. Satisfies **AC-9**
5. Staff roles: `SET_ROLE` (promote and change) with the 422 and safeguards; invitations through Clerk and `CLAIM_INVITATION` in `resolveProfile()`; the invitations tab. Satisfies **AC-2**, **AC-3**, **AC-4**, **AC-7**
6. Studio: `user` documents read only with the "managed in the console" note; sync script limited to demo accounts. Satisfies **AC-4**
7. verify checks and an e2e journey (super admin suspends and reactivates a buyer); AGENTS.md "Who signs people in" updated through `/sync`. Satisfies **AC-11**

## Consequences

**Positive**:
- Staff can be added, promoted and removed without a developer, and suspension works immediately.
- Spec 0005 and feature 27 grant roles through one sanctioned function.
- The sign in page stops exposing real people.

**Negative / tradeoffs**:
- The product owner can no longer edit people in the Studio; supplier and runner records stay editable there.
- A role change takes up to a minute to reach the session token (the database already decides access, so this only affects the fast path).
- Clerk stays a development instance for now; invitations carry Clerk's development banner until the move to production (plan §5).

**Neutral**:
- AGENTS.md's rule "roles are written only by the sync script" becomes "only `applyPersonChange()` writes roles".

## Follow-up

- [ ] Move Clerk to a production instance before launch (plan §5).
- [ ] Feature 27 (supplier onboarding) grants `SUPPLIER_OWNER` through `applyPersonChange()`.
