# Product changes for data protection

**Date**: 2026-10-23 · **Status**: recommendations for `/architect` and
`/develop`; no code has been changed. **Not legal advice.**

What the app must do so the [obligations](obligations-checklist.md) hold.
Each item names where it lands today and the scope feature that should carry
it. Order is by launch risk: items 1 to 6 are launch blockers.

| # | Change | Lands in | Scope feature |
|---|---|---|---|
| 1 | Sign-up consents and the 18+ check | `app/sign-up/[[...sign-up]]/page.tsx`, Clerk dashboard, `users` row | 8 (sign in safety), 17 |
| 2 | Marketing opt-in flag and unsubscribe | `types/index.ts` `User`, `lib/notifications.ts`, welcome step | **11** (emails), **12** (SMS), 25 (welcome step) |
| 3 | Privacy, terms and cookie pages, linked everywhere data is collected | new `app/(store)/privacy`, `terms`, footer in `components/layout/StorefrontNav.tsx`, checkout | **17** (legal pages) |
| 4 | A buyer can download their data | new `GET /api/me/export`, Account → Privacy page | 25 (buyer account) |
| 5 | Retention periods and the clean-up job | new cron route beside spec 0005's | **28** (spec 0005 AC-8), 16 |
| 6 | A buyer can close their account (deletion) | new `DELETE /api/me` flow, Clerk user deletion, admin queue | 25, 30 (team user management) |
| 7 | The Botswana copy | a nightly backup job to storage in Botswana | 16 (error monitoring & backups) |
| 8 | Runner application notices and document handling | `/drive` (spec 0005) | **28** (spec 0005) |
| 9 | Rights requests queue for staff | admin console | 29 (team console gaps) |
| 10 | Audit of staff access to personal data | `lib/notifications.ts` `audit()` | 16 |

## 1. Sign-up consents

Today `app/sign-up/[[...sign-up]]/page.tsx` renders Clerk's `<SignUp />` with
nothing around it.

- **Terms and privacy (required).** Turn on Clerk's legal acceptance in the
  Clerk dashboard (Legal: require express consent to the terms and privacy
  policy, pointing at `/terms` and `/privacy`). The prebuilt form then shows
  the checkbox and Clerk records when it was accepted (`legal_accepted_at` on
  the user); a custom flow passes `legalAccepted` to `signUp` (Clerk docs,
  "legal acceptance"). Put "I am 18 or older" in the same sentence
  ([wording](consent-wording.md#1-sign-up-required)).
- **Hosting abroad (required, Botswana s 78(1)(a)).** Clerk's prebuilt form
  has one legal checkbox, so this second consent needs either a custom
  sign-up flow or a required step on `/after-sign-in` before the account is
  usable. Recommendation: the `/after-sign-in` step, shared with the welcome
  step in item 2, so the Clerk form stays prebuilt. Until it is ticked, the
  user can reach only that step and sign out.
- **Record.** Add to `User` in `types/index.ts` (the `users` table is a jsonb
  document, so no migration is needed; `lib/postgres/schema.ts` stays as is):

  ```ts
  /** Consents the person gave or refused, newest last. */
  consents?: ConsentRecord[];
  ```

  with `ConsentRecord` holding `purpose`, `given`, `wording_version`,
  `source`, `at`, `withdrawn_at` as listed in
  [consent wording §6](consent-wording.md#6-what-to-record-for-each-consent).
  Never overwrite a record; append.
- Seeded demo accounts (`app/sign-in/demo-accounts.ts`) get synthetic consent
  records so `npm run verify` and the e2e journeys pass the new gate.

## 2. Marketing opt-in flag and unsubscribe

There is no marketing today; build the gate before the first message.

- **Flag**: derive "may market on channel X" from the latest `consents` entry
  for `MARKETING_EMAIL`, `MARKETING_SMS`, `MARKETING_WHATSAPP`. Default: no.
- **Ask once**, on the welcome step after sign-up (scope feature 25 lists "a
  welcome step after sign up"), with the three unticked boxes. Record a "no"
  too, so the question is not asked again (POPIA s 69(2)(a)).
- **Two kinds of message.** `lib/notifications.ts` `notify()` is where in-app,
  email and SMS are meant to fan out (its header says so). Give every message
  a `kind` of transactional or marketing; marketing sends check the flag and
  are dropped (and logged) without it. Scope features **11** (order and
  payment emails) and **12** (SMS alerts) are transactional and need no
  opt-in, but their specs must say so and keep offers out of them.
- **Unsubscribe**: a signed one-click link in every marketing email (no sign-in
  needed), "STOP" handling for SMS and WhatsApp in the feature 12 provider's
  inbound webhook, and the per-channel switches on Account → Privacy. Each
  writes a `withdrawn_at`.
- Every marketing message carries the footer in
  [consent wording §3](consent-wording.md#3-every-marketing-message).

## 3. Legal pages and links

Scope feature **17** ("Terms of sale, a privacy policy under the Data
Protection Act 2018, and a returns policy ... plus a short cookie notice")
should be updated: the law is now **Act 18 of 2024 and the three other
countries' Acts**, and the privacy policy is the
[draft notice](privacy-notice-draft.md).

- Pages: `/privacy`, `/terms`, `/returns` in `app/(store)/`.
- Links:
  - the storefront footer, `StorefrontFooter` in
    `components/layout/StorefrontNav.tsx` (its `Platform` column today has
    only portal and sign-in links): add Privacy, Terms, Returns;
  - the mobile menu in the same file;
  - `/sign-up` (via Clerk's legal setting, item 1);
  - checkout, `app/(store)/checkout/CheckoutClient.tsx`, beside the pay
    button: "By placing this order you agree to the Terms of Sale. See how we
    use your information: Privacy Notice.";
  - `/drive` (item 8) and the supplier sign-up (scope feature 27);
  - every email and SMS footer (features 11, 12).
- **Cookie notice**: the app sets Clerk's session cookies (strictly necessary)
  and keeps the cart in `localStorage` (`app/(store)/cart/CartClient.tsx`) and
  a nudge flag in `sessionStorage`
  (`components/storefront/home/SignInNudge.tsx`). None track people, so a
  short, non-blocking notice ("We use only the cookies needed to sign you in
  and keep your cart") is enough. Adding analytics later means revisiting
  this.

## 4. Download my data

Botswana gives a right to a copy (s 42(3)) and to portability "in a
structured, commonly used and machine-readable format" (s 47).

- `GET /api/me/export`: signed in only, returns one JSON file of everything
  held about the caller: the `users` row (consents included), their orders
  with order items, payments (reference, amount, status, never card data),
  addresses, RFQs and responses, runner requests, notifications, disputes,
  and, for a runner, their application's details and the list of documents
  (not the files; offer those through the existing signed links).
- Link from a new **Account → Privacy** page (`app/(store)/account/privacy`);
  today the Account tab in `MobileTabBar` goes to `/login` or `/orders`, so
  scope feature 25 should add the account page.
- Write an `audit()` entry for each export.

## 5. Retention periods and the clean-up job

None of the four Acts fixes periods; each says keep data no longer than the
purpose needs, then delete or de-identify it irreversibly (Botswana s 23,
POPIA s 14, Lesotho s 19, Eswatini s 13). Proposed schedule:

| Data | Collection | Keep | Then |
|---|---|---|---|
| Buyer account | `users`, Clerk user | While open | Delete within 30 days of closure (item 6) |
| Paid orders, order items, payments, refunds, payables, settlements | `orders`, `order-items`, `payments`, `supplier-orders`, `supplier-payables`, `settlements` | **7 years** after the order (**to confirm** with the accountant: tax law in each country sets the floor; South Africa's Tax Administration Act gives 5 years, Botswana's period is to be checked) | De-identify the buyer (name, phone, address replaced) after account closure; delete at the end |
| Orders that never took payment | `orders` with no `payment_reference` and status `CANCELLED` or expired | 12 months | Delete |
| Runner application documents | `uploads` bucket | Spec 0005 AC-8: 90 days after rejection or withdrawal; while a runner and 1 year after suspension | Delete files and clear keys (already designed) |
| Runner applications (details, not documents) | `runner-applications` | 2 years after the decision | Delete |
| Notifications | `notifications` | 12 months | Delete |
| RFQs and runner requests not turned into orders | `rfqs`, `rfq-responses`, `runner-requests` | 2 years | Delete |
| Audit log | `audit-log` | 7 years (it is evidence of who did what with money and data) | Delete |
| Consent records | `users.consents` | While the consent stands, plus 3 years | Delete the entry |
| Disputes | `disputes` | With the order | With the order |
| Request logs | Vercel | The shortest the plan allows | Provider deletes |

- **The job**: spec 0005 already introduces Vercel Cron, `CRON_SECRET` and
  `/api/cron/document-retention` (scope feature **28**). Extend that pattern
  into one daily `/api/cron/retention` that runs each rule above, is
  idempotent, and writes one `audit()` entry per run with counts. Build it
  with spec 0005's step 6 so there is one cron route to watch, not two.
- Neon keeps deleted rows in its history window for point-in-time restore;
  that is acceptable if the privacy notice's "we delete within 30 days" is at
  least that long.

## 6. Close my account

- **Ask**: a "Close my account" button on Account → Privacy, with a plain
  warning ("Your orders stay on record for tax for 7 years, without your
  name"). Also accept requests by email, SMS or WhatsApp to the DPO (POPIA
  Reg 3.4).
- **Do**, within 30 days and in one idempotent server path (like spec 0006's
  `applyPersonChange()`):
  1. refuse while an order is pending payment, in delivery or in dispute;
     tell the person when it can go through;
  2. de-identify their orders, addresses and runner requests (replace name,
     phone, address and email with a placeholder; keep amounts and dates);
  3. delete notifications, RFQs not linked to orders, and the `users` row;
  4. delete the Clerk user through the Clerk backend API (the roles sync in
     `scripts/sync-users-to-clerk.mjs` must not recreate a buyer it no longer
     finds);
  5. a runner: also run spec 0005's suspension path, which starts the
     1-year document clock;
  6. write an `audit()` entry that records the request, not the deleted data.
- **Correction** needs no new flow for buyers (they edit their details), but
  the DPO must be able to correct any field from the console and tell the
  person within 14 days (Eswatini s 20(5)).

## 7. The Botswana copy

Botswana s 74 requires a copy of transferred data to stay in Botswana. Scope
feature **16** (error monitoring & backups) should include:

- a nightly job that dumps the `afrideal` schema (`pg_dump`, with
  `lib/postgres/network.mjs` called first, as AGENTS.md requires of any script
  that connects), plus the Clerk user list, encrypts it with a key AfriDeal
  holds, and uploads it to storage in a Botswana data centre;
- 30 days of copies kept, older ones deleted;
- a quarterly restore test into a throwaway Neon branch, recorded;
- the Botswana host signed up as a processor
  ([processing agreements](processing-agreements.md#future-providers)).

The job must not run from a developer's laptop: schedule it on Vercel or on
the Botswana host itself.

## 8. Runner applications (scope feature 28, spec 0005)

Spec 0005 already does the hard parts: a private bucket, 5-minute signed
links, staff views audited, a retention run. Add:

- the notice and the "documents are mine" box above the uploads
  ([consent wording §5](consent-wording.md#5-runner-application-drive-spec-0005));
- the privacy notice link on `/drive` and `/drive/status`;
- the impact assessment (checklist row 11) before it ships;
- update spec 0005's "Botswana's Data Protection Act 2018" references to Act
  18 of 2024, and its phone rule (`+267` only) to the any-country rule of spec
  0009;
- no face matching or other biometric processing of the ID photo without a
  fresh legal look (it would make the data sensitive in Botswana, South Africa
  and Eswatini).

## 9. Rights requests queue

Scope feature **29** (team console gaps): an admin page listing open requests
(access, correction, deletion, objection, marketing stop) with who asked, when,
the channel, and a **14-day** due date (the shortest clock, Eswatini s 20(5);
Botswana's one month and South Africa's 30 days are met inside it). Closing a
request records what was done.

## 10. Audit of access

`lib/notifications.ts` already writes `audit()` entries. Add entries for:
staff opening a buyer's order or profile in the admin console, exports
(item 4), closures (item 6), consent changes (item 2), and the retention run
(item 5). They are the evidence for a breach investigation (the
[runbook](breach-runbook.md)).

## Also update (docs, not code)

- `docs/scope/index.md`, `AGENTS.md` ("Workflow tier GA ... Botswana's Data
  Protection Act 2018") and scope feature 17: cite Act 18 of 2024 and the
  four-country law. A `/sync` pass after this lands can do it.
- Spec 0009 open questions 1 and 2: point them at this folder.
