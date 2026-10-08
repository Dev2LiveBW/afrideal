# 0005. Runner sign up and service area

**Date**: 2026-10-08
**Status**: Proposed

## Summary

Today runners exist only because someone added them to the seed, and every new job alerts every online runner wherever they are. This spec lets a person apply to drive for AfriDeal from their phone: they sign up like anyone, fill in a runner application with their vehicle, the towns they work in and photos of their documents, and wait. Operations reviews the documents and approves or rejects with a reason; approval makes them a runner through the people path in spec 0006. From then on a runner sees and is alerted about jobs collected in their towns, and a job nobody takes within 30 minutes opens to every runner.

## Context

Scope feature 28 (milestone M5, "runner sign up and service area"). The runner profile with ratings and photo proof of delivery, also in feature 28, are a later milestone by the product owner's choice. Workflow tier GA: the application holds identity documents, which are personal data under Botswana's Data Protection Act 2018.

How it works on `main` (2026-10-08):

- `Runner` rows (`r001` to `r003`) come from the seed and the Studio; a runner has one `city` and no service area.
- `openJobForLeg()` (`lib/shipments.ts`) notifies every online runner of every new job; the jobs pool lists every unassigned job to every runner.
- A job's pickup is the supplier's town (`pickup_address` is `"<supplier city> depot"`); there is no geocoding.
- The app has no file storage in use. `neon.ts` declares a private `uploads` bucket that nothing uses yet.
- The app has no scheduled jobs.

Forces:

- **Identity documents need private storage and a retention limit.** Holding them in a public CDN, or forever, is not defensible under the DPA.
- **A role is granted only through spec 0006's `applyPersonChange()`.** Every person lives in the app database (0006); the Studio keeps records only, so approval writes nothing to Sanity.
- **Botswana addresses have a town and little else.** Matching on anything finer than a town would need data buyers and suppliers do not give.

## Requirements

**User stories**:
- As someone who wants to drive, I want to apply from my phone with my documents and the towns I work in, so that I can start taking jobs once approved.
- As an operations admin, I want to review an application's documents and approve or reject it with a reason, so that only vetted people deliver.
- As a runner, I want to see and be alerted about jobs in my towns only, and change my towns myself, so that I am not offered pickups I cannot reach.

**Acceptance criteria**:
- **AC-1**: A signed in buyer can open `/drive` and apply: name (prefilled from their account), a Botswana mobile number (`+267` and 8 digits starting with 7), vehicle (`FOOT`, `BICYCLE`, `MOTORBIKE`, `CAR`, `BAKKIE`), plate (2 to 12 characters, required for a motorbike, car or bakkie), one or more towns from the `service_towns` setting, and documents: Omang or passport always; driver's licence and vehicle registration for a motorbike, car or bakkie. One file per document, JPEG, PNG or PDF, at most 10 MB; it goes straight to the private bucket, and the server checks the file's real type from its first bytes before accepting the application. The application is `SUBMITTED`. A person with an open application gets 409 on a second.
- **AC-2**: The applicant sees their application's status at `/drive/status`, can withdraw it while `SUBMITTED`, and after a rejection sees the reason and can resubmit (a new round). Earlier rounds' details are kept; their documents are deleted when the new round is submitted, so only one set of identity documents exists at a time. `/drive` shows a runner a link to their dashboard, and shows suppliers and staff that runner applications are for buyer accounts.
- **AC-3**: Operations and super admins see an applications queue at `/admin/runners/applications`, open any document only through a signed link that expires within 5 minutes, and approve or reject. Rejecting needs a reason (`DOCUMENT_UNCLEAR`, `LICENCE_EXPIRED`, `DETAILS_MISMATCH`, `OTHER`) and, for `OTHER`, a note.
- **AC-4**: Approving creates the `Runner` (towns, vehicle, plate, phone, `city` = first town, offline, zero figures) and makes the person a runner through spec 0006's `applyPersonChange()` with `GRANT_ROLE` (`role: RUNNER`, `runner_id`), which updates the `users` row and Clerk. Approval is idempotent: two staff approving at once, or a retry after a failure part way, end with one runner and one role grant. The applicant is notified, and from their next request `/drive` and the store send them to `/runner/dashboard`.
- **AC-5**: A runner sees, and can accept, an unassigned job only when its `pickup_town` is one of their towns, or once it has been unassigned for 30 minutes (counted from `unassigned_at`, so a job a runner hands back starts its clock again), after which every runner sees it. The accept endpoint applies the same rule (409 otherwise). A job with no `pickup_town` is visible to all. New job alerts go only to online, active runners whose towns include the pickup town; no alert is sent when a job widens.
- **AC-6**: A runner changes their towns from their runner profile at any time (at least one), effective at once and audited.
- **AC-7**: A super admin edits the `service_towns` list in `/admin/settings`. Removing a town that is some runner's only town is refused (409).
- **AC-8**: Documents of a rejected or withdrawn application are deleted 90 days after the decision; an approved runner's documents are kept while they are a runner and deleted one year after they are suspended. A daily scheduled run deletes due files from the bucket, clears their keys and records the deletion; it also deletes uploads under `runner-applications/` that no application references and that are more than 24 hours old. It is idempotent.
- **AC-9**: Only the applicant (their own) and operations and super admins (any) can read an application or open its documents; suppliers, runners and other buyers get 404. Nothing about an application is public.
- **AC-10**: Submitting, withdrawing, approving, rejecting, changing towns, viewing a document as staff and deleting documents are written to the audit log with the actor.
- **AC-11**: `npm run verify` covers the application rules (required documents by vehicle, one open application, file type and size), approval granting the runner role, rejection and resubmission, document link authorisation and expiry, job visibility by town and after 30 minutes, the towns list guard, and the retention run. An e2e journey records a buyer applying on a phone and operations approving them.

## Options considered

### Option 1: Apply after a normal sign up, towns as the service area, documents in the private Neon bucket

A buyer applies from `/drive`; the application is its own collection; approval goes through 0006's people path; jobs match on the pickup town; documents live in the `uploads` bucket behind signed links; Vercel Cron enforces retention.

**Pros**: no second sign up path; nobody is a runner before vetting; matching uses data that already exists; the storage is private by construction and already declared.

**Cons**: a first use of Neon storage and of a scheduled job; a town is coarse (a Gaborone runner may be offered a pickup across the city).

### Option 2: A dedicated runner sign up page

`/join/runner` creates the Clerk account and the application in one go.

**Pros**: one screen for a new runner.

**Cons**: a second sign up flow to keep in step with Clerk; a person half way through is neither buyer nor runner.

### Option 3: Radius service area

The runner sets a home point and a distance; jobs match by distance.

**Pros**: precise.

**Cons**: needs geocoding for every supplier and buyer address, which the app does not have, and Botswana addresses often do not geocode cleanly.

## Decision

**Chosen option**: Option 1: apply after a normal sign up, towns as the service area, documents in the private Neon bucket.

The bucket is reached through a small `lib/storage.ts` (signed upload URL, signed read URL, delete), so the provider stays a detail.

## Rationale

Each choice follows a force in Context. Applying after sign up keeps one way into an account and means no unvetted person ever holds the runner role; the role is granted at approval through 0006's single path. Towns match the data addresses actually carry (the pickup is always a supplier's town), so matching works on day one with no geocoding. The private bucket with short signed links and a hard retention schedule is what makes holding Omang copies defensible; a public CDN or keeping them forever is not.

The 30 minute widening is the product owner's call: a job is never stranded because its town has no runner online, at the cost of occasionally offering a far pickup. It is decided on read from the job's age, so it needs no background job.

## Feature design

**Data model sketch** (confirmed with the product owner 2026-10-08):

| Entity | Key | Fields (new in **bold**) | Relationships |
|---|---|---|---|
| **`RunnerApplication`** (new, `runner-applications`) | `ra001` | `user_id`, `name`, `phone`, `vehicle`, `plate` (nullable), `towns` (string list, at least 1), `documents` (list of `{ kind: ID / LICENCE / VEHICLE_REG, object_key (nullable once deleted), content_type, size, uploaded_at }`), `status` (`SUBMITTED`, `APPROVED`, `REJECTED`, `WITHDRAWN`), `round` (1, 2…), `previous_id` (nullable: the round it replaces), `reason` (nullable), `reason_note` (nullable), `decided_by`, `decided_at` (nullable), `submitted_at`, `runner_id` (nullable), `documents_delete_after` (nullable date), `documents_deleted_at` (nullable) | many to 1 `User`; 0..1 `Runner` |
| `Runner` (exists, `runners`) | `r001` | **`towns`** (string list), **`application_id`** (nullable for seeded runners) | 1 to 1 `User` |
| `Shipment` (exists, `shipments`) | `sh001` | **`pickup_town`** (the supplier's `city` matched case insensitively to a `service_towns` entry, written by `openJobForLeg()`; backfilled from `pickup_address`; null when no town matches), **`unassigned_at`** (set when the job opens and whenever it returns to `UNASSIGNED`) | |
| `Setting` (exists, `settings`) | **`service_towns`** | `value: { towns: string[] }`, seeded with Gaborone, Francistown, Maun, Lobatse, Palapye, Serowe, Mahalapye, Kasane, Selebi Phikwe, Molepolole, Mogoditshane, Tlokweng, Jwaneng, Kanye | |

Object keys: `runner-applications/<user id>/<random>-<kind>.<ext>`; the database never stores a URL.

**State transitions**:

```
RunnerApplication
SUBMITTED --applicant withdraws--> WITHDRAWN
SUBMITTED --ops approves--> APPROVED   (Runner created, role granted via 0006)
SUBMITTED --ops rejects (reason)--> REJECTED
REJECTED --applicant resubmits--> new application, round + 1, previous_id set, SUBMITTED
```

**Approval write order** (idempotent, like spec 0003's confirmation):

```
1. claim   mutate('runner-applications'): if SUBMITTED, set APPROVED, decided_by, and a
           reserved runner id; if already APPROVED, keep its runner id (a retry or a
           second approver); anything else is refused.
2. runner  insert the Runner under that id; insert() refuses an existing id, so a
           retry skips it.
3. role    applyPersonChange(user_id, { kind: 'GRANT_ROLE', role: 'RUNNER', runner_id })
           (spec 0006), itself a no op when already granted.
4. after   notify the applicant and audit, only for the call that won step 1.
```

**API surface**:

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/api/runner-applications/uploads` | POST | `kind`, `content_type`, `size` | signed upload URL, `object_key` | signed in | 409 open application exists, 422 type or size |
| `/api/runner-applications` | POST | name, phone, vehicle, plate?, towns, documents (keys), `previous_id?` | application | signed in, not already a runner | 409 open application, 422 missing document, unknown town, or a key not under this user's prefix or not uploaded |
| `/api/runner-applications/mine` | GET | | the caller's applications | signed in | |
| `/api/runner-applications/[id]` | PATCH `WITHDRAW` | | application | the applicant | 409 not `SUBMITTED` |
| `/api/runner-applications` | GET | `status?` | queue | ops, super admin | 403 |
| `/api/runner-applications/[id]/documents/[kind]` | GET | | 302 to a signed read URL (5 minutes) | applicant or ops, super admin | 404 others, 410 deleted |
| `/api/runner-applications/[id]` | PATCH `APPROVE` / `REJECT` | `reason`, `reason_note` | application | ops, super admin | 409 decided differently already, 422 reason missing |
| `/api/shipments/[id]` (exists) | PATCH accept | | job | runner | 409 outside their towns before the 30 minutes |
| `/api/runners/me/towns` | PUT | `towns` | runner | the runner | 422 empty or unknown town |
| `/api/settings/service-towns` | PUT | `towns` | setting | super admin | 409 removes a runner's only town |
| `/api/cron/document-retention` | GET | | `{ deleted }` | `Authorization: Bearer CRON_SECRET` | 401 |

**Value sourcing**:

| Action | Value | Source |
|---|---|---|
| Apply | towns offered | `settings.service_towns` |
| Apply | which documents are required | `vehicle`: ID always; LICENCE and VEHICLE_REG for MOTORBIKE, CAR, BAKKIE |
| Apply | a key belongs to this applicant | the key prefix is the caller's user id, minted by the upload endpoint; submit checks the prefix and that the object exists in the bucket |
| Approve | Runner fields | the application; `city` = `towns[0]`; `initials` from the name; `online: false`; figures 0 |
| Approve | role | spec 0006 `applyPersonChange()` with actor `system:approvals` on behalf of the approver |
| Approve | `documents_delete_after` | null while a runner; set to suspension date + 365 days by spec 0006's suspend path for a runner |
| Reject or withdraw | `documents_delete_after` | `decided_at` + 90 days |
| Job visibility | pickup town | `shipment.pickup_town` |
| Job visibility | widening | `now − shipment.unassigned_at >= 30 minutes` and status `UNASSIGNED` |
| Alerts | who | online runners whose `towns` include `pickup_town` (case insensitive) and whose `users.status` is `ACTIVE` |
| Resubmit | previous documents | deleted from the bucket when the new round is submitted; `documents_deleted_at` set on the old round |

**Key invariants**:
- At most one `SUBMITTED` application per user.
- Nobody has the `RUNNER` role without an `APPROVED` application, except the seeded runners.
- No document is ever reachable by a URL that lasts longer than 5 minutes, and no URL is stored.
- Every runner has at least one town, and every town a runner relies on stays in `service_towns`.

**Security model**:
- Applicant: own applications and documents only. Operations and super admin: all applications. Finance, suppliers, runners: none (404).
- Uploads: signed upload URLs scoped to one key, content type and size; the server checks the object exists and matches before accepting the application.
- Cron route: bearer secret; idempotent.
- DPA 2018: identity documents in a private bucket, read only through short signed links, deleted on the schedule in AC-8; every read of a document by staff is audited (`RUNNER_DOCUMENT_VIEWED`).

**Configuration required**:
- The `uploads` bucket's credentials, as `neon link` / `neon deploy` write them into the environment (names per Neon's storage docs at build time).
- `CRON_SECRET`: the bearer secret Vercel Cron sends.
- `vercel.json`: a daily cron for `/api/cron/document-retention`.

**Critical test scenarios**:
- Happy path: Mpho signs up, applies with a car, Omang, licence and registration for Gaborone; Keabetswe approves; Mpho lands on the runner dashboard and sees a Gaborone job, verifies **AC-1**, **AC-3**, **AC-4**, **AC-5**
- Missing licence for a motorbike returns 422, verifies **AC-1**
- Rejection with `DOCUMENT_UNCLEAR`, then a second round accepted, verifies **AC-2**
- A Francistown job is invisible to a Gaborone runner until 30 minutes have passed, verifies **AC-5**
- A runner opening another applicant's document gets 404; a staff link stops working after 5 minutes, verifies **AC-9**, **AC-3**
- The retention run deletes a 91 day old rejected application's files and is a no op when run again, verifies **AC-8**

## Build plan

Tracer Bullet: one applicant approved and taking a job in their town, then the branches. Builds on spec 0006 task 2 (`applyPersonChange()`).

1. Data: `runner-applications` collection and migration; `towns` and `application_id` on runners (seed: towns = `[city]`); `pickup_town` on shipments (written by `openJobForLeg()`, backfilled); `service_towns` setting. Satisfies **AC-1**, **AC-5**
2. Storage: `lib/storage.ts` over the `uploads` bucket (signed upload, signed read, delete). Satisfies **AC-1**, **AC-3**
3. Thread: `/drive` application form on a phone with uploads; the console queue with document links; approve through `applyPersonChange()`; runner jobs filtered by town with the 30 minute widening; town scoped alerts. Satisfies **AC-1**, **AC-3**, **AC-4**, **AC-5**
4. Thicken: reject with reasons, withdraw, resubmit rounds, `/drive/status`. Satisfies **AC-2**, **AC-3**
5. Runner towns in the runner profile; `service_towns` in console settings with the guard. Satisfies **AC-6**, **AC-7**
6. Retention: the cron route and `vercel.json`; deletion dates set on decision and on suspension. Satisfies **AC-8**
7. Authorisation, audit and verify checks; the e2e journey (apply on a phone, approve). Satisfies **AC-9**, **AC-10**, **AC-11**

## Consequences

**Positive**:
- Runners can join without a developer, and jobs reach the people who can actually collect them.
- Identity documents have a defined, enforced lifetime.

**Negative / tradeoffs**:
- A town is coarse; a Gaborone runner can be offered a pickup across the city.
- After 30 minutes a job opens to every runner, so a runner can be offered a pickup far from their towns.
- First use of Neon storage and of a scheduled job: two new moving parts, and the retention run must be watched.
- Approval depends on spec 0006 being built first.

**Neutral**:
- Seeded runners keep working: their towns are their current city.
- The runner profile with ratings and delivery photos is a separate milestone.

## Follow-up

- [ ] Runner profile, ratings and photo proof of delivery (rest of scope feature 28).
- [ ] Consider alerting operations when a job reaches the 30 minute widening and still has no taker, once there is real volume.
