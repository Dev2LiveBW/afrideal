# 0002 · Staging & production environments

**Date**: 2026-09-28 (updated 2026-09-30)
**Status**: In Progress

## Summary

Two Vercel projects serve the app. Staging is the existing `afrideal` project, renamed `afrideal-staging`: it stays connected to GitHub and deploys every push to `main` to `staging.afrideal.co.bw`. Production is a new `afrideal-production` project with no Git connection at all: a GitHub Actions workflow deploys it when you push a version tag (`v*`), because Vercel's Git integration only deploys branches, never tags. Each environment has its own data: production uses the Neon default branch, the Sanity project `bly84glb` and the Clerk production instance; staging uses a Neon `staging` branch, a new Sanity staging project and the Clerk development instance. Local development moves to its own Neon `dev` branch and the staging Sanity project, so no production secret sits on a laptop. Production stays dark until launch.

## Requirements

**User stories**:
- As a developer, I want a stable staging environment so that I can test payment webhooks and full flows safely.
- As a release manager, I want production deployments triggered by tags so that releases are deliberate and controlled.

**Acceptance criteria**:
- **AC-1**: A push to `main` deploys the staging project (`afrideal-staging`), served on `staging.afrideal.co.bw` once DNS is live and on its `vercel.app` address before that.
- **AC-2**: Pushing a version tag (`v*`) whose commit is on `main` and passed CI deploys exactly that commit to the production project (`afrideal-production`) through GitHub Actions. A tag on a commit that is not on `main`, or whose CI did not pass, fails the workflow without deploying.
- **AC-3**: Each environment uses its own data sources, per the environment map below: its own Neon branch, its own Clerk instance, its own Sanity project. Local development uses none of production's, and `npm run db:load` refuses to wipe production without `--production`.
- **AC-4**: Environment variables are set per Vercel project, and no secret value is shared between staging and production.
- **AC-5**: No preview deployments: staging builds only `main`, and production is not connected to Git.
- **AC-6**: `npm run verify` passes against the staging URL.
- **AC-7**: Production is dark until launch: Vercel deployment protection is on and no public domain is attached.

## Decision

**Chosen option**: Two Vercel projects, staging on Vercel's Git integration and production deployed from tags by GitHub Actions with the Vercel CLI. (Replaces the earlier Ignored Build Step design, which could never fire: Vercel does not build on tag pushes.)

**Environment map**:

| | Local dev | Staging | Production |
|---|---|---|---|
| Vercel project | none | `afrideal-staging` (the existing `afrideal`, renamed) | `afrideal-production` (new, no Git connection) |
| Deploys from | your machine | every push to `main` (Vercel Git integration) | a `v*` tag on `main` (`.github/workflows/deploy-production.yml`) |
| Domain | `localhost:3000` | `staging.afrideal.co.bw` | `afrideal.co.bw` (attached at launch) |
| Neon (project `afrideal`) | branch `dev` | branch `staging` | default branch |
| Sanity | staging project `afrideal-staging` / `production` | new project `afrideal-staging`, dataset `production` | `bly84glb` / `production` |
| Clerk | development instance | development instance | production instance |
| `CATALOGUE_SOURCE` / `DB_DRIVER` | your choice | `sanity` / `postgres` | `sanity` / `postgres` |

Local dev and staging share the Clerk development instance and the staging Sanity project. The Clerk users there are the eight demo accounts synced from the people directory, and `npm run verify` needs those accounts on staging, so sharing is deliberate. Production never shares anything with either, and no production secret is kept on a developer machine.

**Variables** (every variable the app, migrations and scripts read; set per Vercel project, available at build time as well as runtime, because `db:migrate` runs in the build and `NEXT_PUBLIC_*` values are baked into the bundle):

| Variable | Secret | Local dev | Staging | Production |
|---|---|---|---|---|
| `DATABASE_URL` (used by the app, `db:migrate` and `db:load`) | yes | Neon `dev` | Neon `staging` | Neon default branch |
| `CATALOGUE_SOURCE` / `DB_DRIVER` | no | your choice | `sanity` / `postgres` | `sanity` / `postgres` |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | no | staging project id | staging project id | `bly84glb` |
| `NEXT_PUBLIC_SANITY_DATASET` | no | `production` | `production` | `production` |
| `SANITY_API_VERSION` | no | optional, code default | optional, code default | optional, code default |
| `SANITY_API_WRITE_TOKEN` | yes | staging Editor token | staging Editor token | `bly84glb` Editor token (production only, never on a laptop) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` | secret key yes | development instance | development instance | production instance |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` / `_SIGN_UP_URL` | no | `/sign-in` / `/sign-up` | same | same |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` / `_SIGN_UP_FALLBACK_REDIRECT_URL` | no | `/after-sign-in` | same | same |

**Clerk instances.** Both instances need the session token claim `{"metadata": "{{user.public_metadata}}"}` (Sessions, Customize session token) or middleware role gating fails. The development instance already has it and already holds the eight demo accounts (CI's verify job uses them). The production instance gets the claim when it is created; its first real staff accounts are created at launch (feature 23), not in this feature.

**Deployment protection** is off on staging (so `npm run verify` and payment webhooks can reach it) and on for production until launch.

**Migration rule.** Every migration must work with the previous release's code (add first, remove in a later release), because the database is migrated just before the new code goes live and staging runs ahead of production.

**Staging project** (`afrideal-staging`):
- Production branch in Vercel's settings: `main`. Only `main` builds; every other branch is switched off with `git.deploymentEnabled` in `vercel.json`. Production has no Git connection, so this file never affects it.
- Build command: `npm run db:migrate && npm run build`, so the staging branch schema is migrated before each build.
- Function region `cle1` or `iad1` (next to Neon in `aws-us-east-2`).

**Production workflow** (`.github/workflows/deploy-production.yml`), on `push: tags: ['v*']`. Settings: Node 22; `permissions: contents: read, checks: read`; `concurrency: { group: deploy-production, cancel-in-progress: false }` so releases never overlap or cut each other off; the Vercel CLI installed at a pinned version (`npm i -g vercel@<exact version>`, chosen at build time). Steps:
1. `actions/checkout` with `fetch-depth: 0`, then `git fetch origin main`; fail unless `git merge-base --is-ancestor "$GITHUB_SHA" origin/main`.
2. Fail unless the `CI` workflow has a successful run for the tagged commit (`gh api repos/{owner}/{repo}/commits/$GITHUB_SHA/check-runs`, every CI job `success`).
3. `npm ci`.
4. `vercel pull --yes --environment=production` (writes the production variables to `.vercel/.env.production.local`).
5. `vercel build --prod`.
6. Load the pulled variables with `set -a; . .vercel/.env.production.local; set +a`, then `npm run db:migrate` against the production branch. This runs only after a successful build, so a failed build never leaves the schema ahead of the served code.
7. `vercel deploy --prebuilt --prod`.

GitHub secrets for it: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` (the production project's). The job runs in a GitHub environment named `production`, so you can add a required reviewer later without changing the workflow.

**Load guard.** `scripts/db-load.mjs` wipes its target before loading. It refuses to run when the host in `DATABASE_URL` is the production endpoint (the Neon default branch) unless it is called with `--production`. The production endpoint hostname is committed as a constant in `lib/postgres/` (a hostname only, no credentials, so it is not a secret). `npm run seed` inherits the guard through `db:load`.

**Seeding**:
- Neon `staging` and `dev` branches are created from the default branch, then loaded once with `npm run db:load` against each branch's connection string.
- The staging Sanity project gets a one time copy of `bly84glb/production` (`sanity dataset export`, then `sanity dataset import`). You can refresh it the same way later.
- Production's default branch is loaded with clean data at launch (feature 23), not now.

**Implementation skills**: `neon-postgres-branches` (branch creation and reset), `clerk-nextjs-patterns` (production instance keys and domains).

## Proposed stack

| Layer | Choice | Reason |
|---|---|---|
| Hosting | Two Vercel projects | Separate variables, domains and triggers per environment. |
| Staging deploys | Vercel Git integration, `main` only | Native, no workflow to maintain. |
| Production deploys | GitHub Actions + Vercel CLI on `v*` tags | Vercel builds branches only; the CLI deploys exactly the tagged commit. |
| Database isolation | Neon branches in project `afrideal` | Instant copies, one project to manage and transfer. |
| Auth isolation | Clerk development vs production instance | The two instances Clerk provides per application. |
| CMS isolation | Separate Sanity projects | No schema drift between environments' Studios. |
| Secrets | Vercel project settings, GitHub secrets for the deploy token | Simplest for a small team. |
| Migrations | Inside each deploy (staging build command, production workflow step) | The schema is current before new code serves traffic. |

## Build plan

Tracer Bullet: prove the whole staging thread first (data, host, deploy, verify), then stand production up behind it. **(you)** marks a dashboard step only you can do, because it enters secrets or creates accounts. Everything else `/develop` can do or drive.

1. Add the load guard to `scripts/db-load.mjs` (refuse the production endpoint without `--production`, per *Load guard*), satisfies **AC-3**
2. Create Neon branches `staging` and `dev` from the default branch; load each with `npm run db:load`; point your local `.env.local` at `dev` by running `neon link` again (never edit those lines by hand), satisfies **AC-3**
3. **(you)** Create the Sanity project `afrideal-staging`; copy `bly84glb/production` into it with `sanity dataset export` and `sanity dataset import`; add `http://localhost:3000`, the staging `vercel.app` address and `https://staging.afrideal.co.bw` to its CORS list; create an Editor token for it; switch your `.env.local` Sanity id and write token to the staging project, satisfies **AC-3**, **AC-4**
4. **(you)** Rename the Vercel project `afrideal` to `afrideal-staging`; set its production branch to `main`, build command to `npm run db:migrate && npm run build`, function region `cle1` or `iad1`, deployment protection off; replace its variables with the staging column of the *Variables* table, satisfies **AC-1**, **AC-4**
5. Add `vercel.json` so only `main` builds (check the current `git.deploymentEnabled` branch map syntax against Vercel's docs first), push to `main`, and confirm the staging deployment, satisfies **AC-1**, **AC-5**
6. Run `VERIFY_BASE=<staging URL> npm run verify`; add the staging origin to Clerk's allowed origins if it rejects requests, satisfies **AC-6**
7. **(you)** Create the Clerk production instance for `afrideal.co.bw`, set its `metadata` session token claim, and note the DNS records it asks for; create a `bly84glb` Editor token; create the `afrideal-production` Vercel project without a Git connection, deployment protection on, variables from the production column; add `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` to GitHub secrets, satisfies **AC-3**, **AC-4**, **AC-7**
8. Write `.github/workflows/deploy-production.yml` exactly as specified above (settings, ancestry and CI checks, build before migrate), satisfies **AC-2**
9. Push a first tag (`v0.1.0`) on a green `main` commit and confirm one protected production deployment of that commit; push a throwaway tag on a commit off `main` and confirm the workflow refuses it, satisfies **AC-2**, **AC-7**

## Consequences

**Positive**:
- Payment gateways get a stable staging URL for webhooks before any real money moves.
- Production deploys exactly the tagged commit, and only a commit already on `main`.
- Local verify runs and staging tests can no longer touch production data.

**Negative / tradeoffs**:
- A second deploy path: the production workflow must be kept working alongside Vercel's native staging deploys.
- `VERCEL_TOKEN` in GitHub secrets can deploy to your Vercel account; scope it to the team and rotate it if exposed.
- Secrets are copied into two dashboards by hand; rotating a key means updating both places.
- The staging catalogue is a copy and drifts from production until you refresh it.
- Clerk sign in on production only works once DNS for `afrideal.co.bw` is live; until then the dark production deploy cannot sign anyone in.
- Migrations that run inside a deploy fail the deploy if Neon drops the connection; the migration helpers already retry.

**Neutral**:
- Local dev and staging share the Clerk development instance and its demo accounts.

## Follow-up

- [ ] Client: add DNS records for `staging.afrideal.co.bw` (Vercel) and `afrideal.co.bw` (Vercel plus Clerk's production records).
- [ ] Transfer the Neon project `afrideal` to the company owned org before production goes live (feature 23, Production go live). Branches move with the project.
- [ ] At launch: load clean data into the Neon default branch, attach `afrideal.co.bw`, turn deployment protection off (feature 23).

## Rationale

See [rationale.md](rationale.md).
