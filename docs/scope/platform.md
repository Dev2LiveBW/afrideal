# Epic: Platform

The ground everything stands on: stack, data, sign in, the catalogue admin, environments, CI, monitoring, and the launch itself. Back to [index.md](index.md).

## Already built

### A. Stack & scaffold · existing
Next.js 14 App Router, React 18, TypeScript, Tailwind; route groups per role (`(store)`, `(admin)`, `(supplier)`, `(runner)`, `(auth)`). code in `app/`, `components/`, `lib/`

### B. Transactional store on Postgres · existing
Every collection Sanity does not own lives in Neon Postgres as document tables behind `lib/db.ts`; atomic ids, per collection write lock, JSON store kept as the rollback. verify 110/110 and audit 41/41 on 2026-09-20. code in `lib/db.ts`, `lib/postgres/`, `drizzle/`

### C. Sign in & roles · existing
Clerk sign in with eight demo accounts; roles from Clerk public metadata, synced from the Sanity people directory; middleware and `guard()` gate portals and APIs. code in `lib/auth.ts`, `middleware.ts`, `app/sign-in/`, `scripts/sync-users-to-clerk.mjs`

### D. Catalogue admin (Sanity Studio) · in-progress
The product owner's admin for products, images, categories, brands, suppliers and offers; the app reads it with `CATALOGUE_SOURCE=sanity`. The Studio is moving into this repo as `studio/`, and that copy still lacks the product, category, brand and runner schemas. code in `lib/sanity/`, `studio/` (working copy still `Tshego/studio/`)
- [ ] Finish moving the Studio into this repo: `/develop catalogue admin`

## Foundations

### 1. Coding standards & CI · in-progress
Capture conventions, then make every PR prove itself: typecheck, lint, build, verify against a real server, and a secret scan. Clear the repo of scratch files and the stale sibling clone while here.
**Done when:** root `AGENTS.md` reflects the real stack; CI goes red on a deliberate lint error and green on `main`; no `scratch_*.py` or `fix_btn*.py` left in the app root.
spec [0001](../specs/0001-coding-standards-ci.md) (assumed decision, spec 0001) · code in `.github/workflows/ci.yml`
- [x] Capture conventions + tooling choices: `/audit`
- [x] Install the tooling: `/develop tooling`
- [ ] Prove it on GitHub: add the two Clerk secrets, push, see CI red on a lint error and green on `main`
- [ ] Ratify the tooling choices (optional): `/architect coding standards & CI`

### 2. Staging & production environments · needs a decision
Two hosted environments with separate secrets and databases, staging deploying from `main` and production from tags, on `afrideal.co.bw`. The payment gateway needs a stable callback domain, so this comes before slice 1.
**Done when:** a staging URL the client can open runs against its own Postgres branch; production is set up but dark; secrets differ per environment; `npm run verify` passes against staging.
- [ ] Design it (spec): `/architect staging & production environments`

## Slice 2: The buy decision on a phone

### 8. Sign in safety & phone screens · needs a decision
Buyers sign in on a phone without friction, and attackers cannot hammer it: rate limited sign in, password reset, security headers, and the sign in and create account screens at the benchmark's phone layout.
**Done when:** repeated failed sign ins are throttled; a buyer can reset a password by email; HSTS, frame and referrer headers and a starting CSP are live with no console errors on any route; the sign in form sits above the fold at 390px.
- [ ] Design it (spec): `/architect sign in safety & phone screens`

## Slice 6: Run it safely

### 16. Error monitoring & backups · needs a decision
Know about failures before buyers report them, and be able to get the data back. Error reporting on server and client per environment, an alert on any failure in orders or the payment webhook, daily backups, and one restore rehearsed.
**Done when:** a thrown test error shows up tagged with its release; an alert reaches the developer; a restore into a scratch database has been done and timed.
- [ ] Design it (spec): `/architect error monitoring & backups`

## Slice 8: Launch

### 22. Launch checks
The proof before real money: an Android device pass on a mid range phone over slow 4G, an automated end to end run from sign in to a paid order in CI, and the product owner's signed UAT script for the merchant of record model.
**Done when:** the device checklist is complete with screenshots and findings ticketed; the end to end run is green in CI; a signed UAT script is in `docs/uat/`.
- [ ] Build it: `/develop launch checks`

### 23. Production go live · needs a decision
Switch on the real thing: live gateway keys, live DNS, Company owned repo, host and Neon project, a one page runbook, and a real small order placed and refunded.
**Done when:** the repo, Neon project and host belong to the Company; the runbook covers deploy, rollback, restore, stuck payment, manual settlement and pausing checkout; a real BWP 10 order and its refund appear in the gateway dashboard and the reconciliation page.
- [ ] Design it (spec): `/architect production go live`

## Deferred
Out of scope for the current build pass, kept so the plan stays honest.
- **Removing the JSON store adapter**: once staging has run on Postgres through launch
- **Neon Auth, the uploads bucket and the hello function**: declared in `neon.ts`, unused; remove or adopt later
