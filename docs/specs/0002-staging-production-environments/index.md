# 0002 · Staging & production environments

**Date**: 2026-09-28
**Status**: In Progress

## Summary

This decision defines how we host and deploy our environments on Vercel. Staging automatically deploys from the `main` branch to `staging.afrideal.co.bw` on its own Vercel project, while production deploys from tags to `afrideal.co.bw` on a second Vercel project. Each environment uses fully isolated database branches, CMS projects, and authentication instances, configured manually in Vercel to keep infrastructure simple.

## Requirements

**User stories**:
- As a developer, I want a stable staging environment so that I can test payment webhooks and full flows safely.
- As a release manager, I want production deployments triggered by tags so that releases are deliberate and controlled.

**Acceptance criteria**:
- **AC-1**: Staging environment on `staging.afrideal.co.bw` deploys automatically from the `main` branch.
- **AC-2**: Production environment on `afrideal.co.bw` deploys automatically when a version tag (e.g., `v*`) is pushed.
- **AC-3**: Each environment connects to completely isolated data sources: a separate Neon Postgres branch, a separate Clerk instance, and a separate Sanity project.
- **AC-4**: Environment specific secrets (connection strings, API keys) are configured per environment in Vercel.
- **AC-5**: No ephemeral Pull Request preview environments are provisioned.
- **AC-6**: `npm run verify` passes successfully against the staging URL.

## Decision

**Chosen option**: Option 1: Two Vercel projects with GitHub integration

We will provision two separate Vercel projects attached to the same repository. The `afrideal-staging` project will deploy `main` to `staging.afrideal.co.bw`. The `afrideal-production` project will deploy tags to `afrideal.co.bw` by configuring an Ignored Build Step script (`if [[ "$VERCEL_GIT_COMMIT_REF" == v* ]]; then exit 1; else exit 0; fi`) that cancels non tag builds. Secrets for Neon, Clerk, and Sanity will be entered manually into the Vercel dashboards. PR preview deployments will be disabled on both projects. 

Database migrations (`npm run db:migrate`) will be injected into the Vercel build command (`npm run db:migrate && npm run build`) to ensure the schema is up to date before deployment. Initial seeding for staging will be a one off local execution of `npm run db:load` pointing to the staging connection string. Sanity CORS origins, Clerk origins, and webhook URLs must be whitelisted manually in their respective dashboards.

## Proposed stack

| Layer | Choice | Reason |
|---|---|---|
| Hosting | Two Vercel projects | Completely isolates environment variables, deployment domains, and build triggers (`main` vs tags). |
| Database isolation | Neon branches | Native serverless branching allows instant staging databases without duplicate infrastructure costs. |
| Auth isolation | Clerk instances | Development vs Production Clerk instances provide clean separation of user pools and API keys. |
| CMS isolation | Sanity projects | Separate Sanity projects prevent schema drift, which could happen if datasets share one Studio deployment. |
| Secret management | Vercel UI | Manual entry in the dashboard is the simplest approach for a small team, avoiding external tool sprawl. |
| Database migrations | Vercel build command | Running `npm run db:migrate && npm run build` guarantees the database is ready before the application starts. |

## Consequences

**Positive**:
- Payment gateways get a stable, public URL for webhooks on staging before any real money is involved.
- Zero risk of test data bleeding into the production catalogue or database.
- Deployment remains simple without relying on external secret managers or complex GitHub Actions.

**Negative / tradeoffs**:
- Custom bash logic in the Vercel dashboard for tag based deployments can be opaque and hard to debug if builds fail to trigger.
- Developers must manually copy secrets into Vercel whenever a key is rotated.
- Running migrations during the Vercel build step risks failure if the build container network drops connections to Neon.

**Neutral**:
- Production will remain dark (inaccessible to users) until the DNS and launch checks are completed in later slices.

## Follow-up

- [ ] Connect with the client to configure DNS records pointing `afrideal.co.bw` and `staging.afrideal.co.bw` to Vercel's nameservers.
