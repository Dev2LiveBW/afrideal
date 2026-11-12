# Completion plan

_10 November 2026. From a full audit of branch `feat/buyer-account-extras` (six auditors over the scope epics, security, leftovers, tests and PRs; the critical findings were re-read in the code). Supersedes the order of work in [phase1-closeout-plan.md](phase1-closeout-plan.md); the feature list stays in [scope/index.md](scope/index.md)._

## Where the build stands

- **Health today:** typecheck clean, lint clean, 347 unit tests pass (3 skipped), no failing or `test.fail()` e2e markers. `npm audit` reports 11 dependency advisories (3 critical, 5 high).
- **Scope:** of the 33 numbered features, 9 are done (1, 3, 4, 5, 9, 10, 13, 20, 32), 5 are in progress (2, 24, 25, 28, 30) and 19 are planned. The 12 lettered features built before the workflow all stand.
- **The scope is stale in both directions.** Built but not ticked: refunds (14, mostly), cart and product phone bars (6, 7), supplier order privacy (31, mostly), courier quotes at checkout (spec 0008), the Studio move (D). Marked in progress with no code: 28 and 30 (design only), and 24 beyond its first version.
- **Not in the scope at all:** the security findings in phase 0, fake data in the admin console, the unbuilt half of spec 0007, and the data protection duties in `docs/compliance/`.
- **Distance:** about 14 to 18 weeks of sequential solo work for everything a developer can build alone, then the externally blocked items. Phase 0 is about a week and should not wait.

## Phase 0: stop the leaks (about 1 week, do first)

Confirmed in code. The first two are reachable without signing in.

- [x] `GET /api/users` has no guard and returns every user's name, email and role. Route deleted (the demo cards use `app/sign-in/demo-accounts.ts`).
- [x] `GET /api/supplier-offers`, `/api/suppliers`, `/api/suppliers/[id]`, `/api/pricing` (and its `POST` calculator), `/api/products` have no guard. Now: offers, suppliers and pricing for the team (a supplier reads their own); the public catalogue lists active products only and a public product carries no supplier cost.
- [x] A buyer can name their own price on a quote. Now only staff may set the price; `ACCEPT_QUOTE` takes the team's pick or the cheapest live answer; one request becomes one order under the `rfqs` write lock; a buyer never receives the supplier's quoted price; `RESPOND` only from a supplier carrying the product on an open request; runners cannot read requests.
- [x] A buyer's own order API returns margins, supplier costs, supplier records, payables and staff notes. Now `orderDetailForCustomer` / `orderForCustomer` (`lib/order-privacy.ts`) on every buyer response, checkout's included.
- [x] RUNNER and FINANCE_ADMIN read every order; runners read every quote; suppliers read every sourcing request. Now orders and quotes answer buyers, suppliers and the team; runner requests answer buyers, runners and the team, and a runner sees only the pool offered to them.
- [x] Supplier order view is an allow list (`SUPPLIER_ORDER_FIELDS`): no customer price, payment, promo, staff notes or timeline notes (the locker PIN). Their lines lose the buyer's unit price in the API and the supplier portal page. The buyer's name and street address stay until decision 2.
- [x] Demo sign in: a production build shows the cards only with `DEMO_SIGNIN=1` on a `sk_test_` key; the passwords are out of the client bundle. **The Vercel demo deployment needs `DEMO_SIGNIN=1` set to keep its cards.**
- [x] Profile claim by email only on an email Clerk reports verified, never over another Clerk account; role from `publicMetadata` only, anything else is a customer.
- [x] State and ownership gates: `CONFIRM_DELIVERY` only in transit, ready for collection or delivered; buyers removed from `PATCH /api/payables/:id`; a runner records jobs as themselves and claims only jobs and requests `offeredTo` them; a supplier cannot mark their own leg collected or delivered.
- [ ] Underpaid orders: hold for finance instead of raising supplier legs. blocked: decision 8 (spec 0003 leaves who chases an under or overpayment open). The callback now passes its signed currency, so a wrong currency is flagged (AC-11).
- [x] Refunds refuse an order with no confirmed payment and cap every provider at what was paid.
- [x] A 500 answers with a reference and logs the detail; only errors marked `expose` (state machine refusals, the missing Sanity write token) show their text.
- [x] Every admin page checks the sub role itself (`requireAdminPage`, `lib/admin-access.ts`).
- [x] Rate limiting on checkout, quote and runner requests, addresses, saved items, promo checks and payment callbacks (`lib/rate-limit.ts`, in memory per server instance); at most 25 open unpaid orders per buyer, read from the store. A shared store (Upstash or Vercel firewall) waits on an account: plug it in through `setRateLimitStore`.
- [x] Security headers: HSTS, frame denial, nosniff, referrer and permissions policy. The CSP ships as report only; switching it to enforcing after a browser pass of every portal is a launch check (phase 7, feature 22).
- [x] Role by route negative checks: `scripts/verify.mjs` section 17, plus quote checks in section 15.
- [x] `npm audit`: the non-breaking fixes are applied (`undici`, `source-map-js`, a `zod` patch inside the Neon packages, `drizzle-kit`, the TypeScript ESLint parser; lockfile only). What is left needs a major upgrade: `zod` 4 in the app, the vitest chain (test tooling only), and Next (next item).
- [ ] **Upgrade Next 14.2.35 to 15.5.x or later (size L).** 14.2.35 is the last 14.x release, and its advisories are fixed only in 15.5.x and later: several critical, many high (server actions DoS and SSRF, middleware bypass, cache poisoning, RSC deserialisation DoS). Two critical ones are in the image optimizer, which this app turns off (`images.unoptimized: true`), and one only hits Windows-hosted servers; the rest apply. The upgrade brings `@clerk/nextjs` 7 and React 19 with it (AGENTS.md: Clerk 7 needs Next 15), and async `params`, `cookies()` and `headers()` across the app. A launch blocker; its own branch.

## Phase 1: housekeeping (1 to 2 days)

- [ ] Merge PR 17, then PR 18 (stacked on it), then PR 12. Fast forward local `main` (49 behind).
- [ ] Decide PR 8 (runner fee per job, a money rule) and PR 7 (demo videos): rebase or close. Both conflict.
- [ ] Delete superseded branches and worktrees: `scratch/categories-rail`, `claude/distracted-driscoll-63d0b8`, `claude/epic-shtern-967bc1`, `origin/feat/storefront-iteration-2`, `origin/claude/mobile-first-pricing-tiers-4t40pp`.
- [ ] CI: add `npm test`; add `npm run audit`; add the pages the audit misses (account, promo codes, categories, suppliers, rfq, terms).
- [ ] `scripts/db-load.mjs` refuses the production endpoint without `--production` (spec 0002 AC 3).
- [ ] Reconcile the scope: tick what is built (D, 6, 7, 14, 31 in part), mark 28 and 30 as designed only, enrol spec 0008 and the rest of spec 0007, rewrite feature 9 and the delivery intro for the courier model and any to any. Fix AGENTS.md's stale Studio note.

## Phase 2: honest money (about 2 weeks)

- [ ] **33 Suppliers are paid their cost.** The payable is the full sale price today (`lib/payments/confirm.ts:629`); earnings pages show a flat 12% commission. Spec, then change the payable, earnings, refunds credit notes, verify.
- [ ] **14 Refunds.** Real partial refunds (running total, a partly refunded state, prorated payable), amounts in the order's currency, a Stripe test mode refund check. Dispute "resolved for customer" must actually refund.
- [ ] **15 Payment reconciliation.** Not started. Spec, `lib/reconcile.ts`, an admin page matching payments against the gateway's records.
- [ ] Unit tests for `lib/payables.ts`, `lib/refunds.ts`, id minting in `lib/db.ts`, `lib/runner-requests.ts`, `lib/pricing-engine.ts`.

## Phase 3: the quote chain (1 to 2 weeks)

- [ ] **24 / spec 0004**, all five milestones. Today only the API exists: no buyer screen to see or accept a quote, no team screen to pick one, and the supplier quote inbox shows two invented requests per supplier and saves nothing (`app/(supplier)/_lib/quotes.ts:73`, `QuotesClient.tsx:90`).

## Phase 4: people, onboarding and the console (about 4 weeks, in this order)

- [ ] **30 Team user management** (spec 0006): one write path for people, suspension, the Users page, invitations. 28 and 29 depend on it.
- [ ] **28 Runner onboarding and profile** (spec 0005): storage, `/drive`, the applications queue, 30 minute widening, the real delivery photo, proof of delivery.
- [ ] **29 Team console gaps:** customers, runner detail and suspend, audit log screen, flag and escalate, supplier override, CSV export, alert feed.
- [ ] **27 Supplier onboarding and self service:** sign up, documents, decline a quote, product switch, storefront settings, earnings CSV.
- [ ] **31** finish once the owner says what a supplier may see.

## Phase 5: alerts (3 to 4 days)

- [ ] **11 and 12.** Nothing sends an email or SMS today; `notify()` only writes rows. One channel interface, Resend and Africa's Talking adapters in test mode, a log adapter by default, templates, alert preferences respected. Going live waits on the client's domain and sender name.

## Phase 6: remove what is fake or Botswana only (1 to 1.5 weeks)

- [ ] Admin Settings shows invented commission figures and "connected" gateways and saves nothing; the dashboard's System Health lists Firebase and Cloud Run with fixed latencies. Make them real or remove them.
- [ ] Delete the prototypes: `app/v5`, `app/legacy/v4`, `components/v4`, `components/v5`; delete `hello.ts` and trim `neon.ts`; drop the dead `/admin/settlements` and `/admin/finance` route entries.
- [ ] Footer: remove public links to the portals, fix payment marks and "Gaborone, Botswana".
- [ ] Delivery fee: the cart and cart sheet hard code 45 pula and disagree with checkout; the doorstep fee is 45 for every lane.
- [ ] Any to any leftovers: margin alerts assume Botswana (`lib/pricing-tiers.ts:441`); manual reroute drops the cross border uplift (`api/supplier-orders/[id]/route.ts:74`); a missing delivery country silently becomes Botswana; an unknown currency silently charges 1:1; collection points are a hard coded array; buyer and supplier facing "BWP" strings.
- [ ] **Spec 0007 remainder:** every rate is 1:1 (`lib/pricing-formula.mjs:41`), so a rand buyer pays the pula number. Daily rate, buffer, admin editing, sales VAT setting, Eswatini.
- [ ] **26 Browse extras; 25** welcome step and mini cart; **6 and 7** phone guards at 390px.

## Phase 7: launch platform (about 3 weeks of code, plus waiting)

- [ ] **2** code half: `vercel.json`, `deploy-production.yml`, the load guard, the tag refusal test.
- [ ] **8** sign in screens at phone width, lockout settings, consent step.
- [ ] **16** error monitoring, nightly backup, restore rehearsal, retention clean up.
- [ ] **17** privacy, returns and terms pages, footer links, cookie notice (pages built from the drafts, marked draft until approved).
- [ ] Data rights from `docs/compliance/`: consent records, data export, close my account, a rights request queue, audit entries for staff access.
- [ ] **18** sitemap, robots with portals disallowed, product structured data, share cards.
- [ ] **19** English, Setswana and Sesotho: the framework and English externalised; translations are external.
- [ ] **22** e2e in CI; device checklist; UAT script.

## Waiting on someone else

A coding agent cannot finish these. Build up to the point where each is a configuration change.

| Item | From |
|---|---|
| Live card gateway (Stripe live or DPO Pay), Orange Money, PayGate | Client: merchant approval and documents |
| Production domain, DNS, Clerk production instance | Client |
| Vercel, Neon, Sanity, Clerk dashboard steps; Neon project to a company org | Product owner |
| Email sending domain and SMS sender name | Client |
| Legal copy, lawyer sign off, a named data protection officer, regulator registrations (Eswatini, South Africa) | Client and lawyer |
| Botswana hosting for the backup copy; monitoring account | Product owner |
| Setswana and Sesotho translations | Translators |
| Real catalogue, photographs, delivery fees, runner rates, real exchange rate rule (**21**) | Client |
| Alibaba recordings: product page, cart, after sign up | Product owner |
| Android device run and UAT signature (**22**), go live (**23**) | Product owner |

## Decisions owed by the product owner

1. Does spec 0004 replace the first version of quote to order?
2. What may a supplier see on an order: customer name, address, neither?
3. Do partial refunds reduce the supplier's payable?
4. PR 8: does each delivery pay its own runner fee?
5. May Operations open payables, and may Finance edit pricing? The code and the demo cards disagree.
6. Do the consoles stay in pula only?
7. Was the production database loaded from the seed? If so the demo accounts must be purged before launch.
8. When a payment arrives short (or in the wrong currency), do the supplier legs wait for finance, or go ahead flagged as today (spec 0003 AC-11 and its open follow up)?

## The /goal prompt

```
/goal Every checkbox in docs/completion-plan.md phases 0 to 7 is ticked, or carries a one line note "blocked: <who and what>" matching the plan's "Waiting on someone else" or "Decisions owed" lists, AND on the final commit `npm run typecheck`, `npm run lint`, `npm test` and `npm run verify` all pass, AND docs/scope/ matches the code.

How to work:
- Read AGENTS.md, lib/AGENTS.md and docs/completion-plan.md first. Work the phases in order; phase 0 before anything else. Inside a phase take items top to bottom.
- One item at a time: read the code, write or update the spec in docs/specs/ where the plan says a spec is owed, build, add unit tests and a scripts/verify.mjs check (a negative access check for every security fix), run typecheck, lint, test and verify, then tick the box in the plan and update docs/scope/. Do not tick a box on code you have not run.
- Follow the standing rules: any to any (no new Botswana, pula or BW/ZA assumptions), the Alibaba benchmark for storefront UI (read docs/design/alibaba-benchmark.md first; if a screen is in its "Not yet observed" list, mark the item blocked rather than guess), all writes through mutate(), route handlers through guard(), money booked in pula through toPula().
- Branch from main per phase (feat/completion-phase-N). Commit each finished item locally with a conventional message. Never push, merge, open or close a PR, delete a branch, deploy, or run `npm run seed`, `db:load` or `db:migrate` against anything but a throwaway Neon branch. Never touch .env.local, live Stripe keys, the Clerk or Vercel dashboards, or Sanity production data. Phase 1's merges and branch deletions are the owner's: leave them unticked with "blocked: owner to merge".
- When an item needs a product owner decision, do not guess: build the part that does not depend on the answer, note "blocked: decision N", and move on. Same for anything needing an account, a domain, legal copy, translations or real content: build to the point where it is a configuration change, add the variables to .env.example, note the blocker.
- If a check fails, fix the cause; never weaken a test, skip a check, or mark a known failure as expected to get past it.
- Keep a short running log at the foot of docs/completion-plan.md: date, item, commit, anything a reviewer should look at.
```
