# 0001 · Coding standards & CI

**Date**: 2026-09-28
**Status**: Accepted

## Summary

This decision defines how code standards and quality checks run automatically on every pull request and main branch push. We chose GitHub Actions with three parallel jobs: typecheck and lint and build, API route verification on local test stores, and secret scanning with Gitleaks. Running tests against local JSON stores avoids external database costs and network flakiness. We decided to keep ESLint without adding Prettier for now, which prevents massive code reformatting churn during active feature development.

## Context

AfriDeal is an active multi portal marketplace where multiple parts of the system interact daily. Without continuous integration automation, broken Next.js builds, invalid TypeScript types, or exposed API credentials can slip into production without notice.

Several forces shape this decision:
First, network latency between Botswana and cloud data centers in the United States makes running tests against remote databases slow and occasionally unreliable.
Second, financial and personal customer data requires strict security controls to prevent secret exposure.
Third, rapid development of foundational features means full repository formatting rules would create large merge conflicts and noisy git blame history across dozens of files.

## Requirements

**User stories**:
* As a developer, I want automated quality checks on every pull request so that build issues, type errors, lint regressions, and exposed secrets are caught before merging.
* As a project owner, I want the test suite to run against a self contained local environment so that pipeline runs are fast, predictable, and free of cloud infrastructure bills.

**Acceptance criteria**:
* **AC-1**: Continuous integration runs automatically on every pull request and push to the `main` branch.
* **AC-2**: The checks job fails when TypeScript errors, ESLint warnings or errors, or build failures exist, using Node 22 with npm dependency caching.
* **AC-3**: The verify job seeds sample data via `npm run seed`, starts the Next.js server via `npm start`, polls `http://localhost:3000/` until responsive, and runs `npm run verify` against `http://localhost:3000` using local JSON stores and Clerk development keys.
* **AC-4**: The secrets job uses Gitleaks to inspect the commit range (`base..head` on pull requests, `before..sha` on pushes) and fails if credentials, private keys, or API tokens are found.
* **AC-5**: No temporary scratch files such as `scratch_*.py` or `fix_btn*.py` remain in the repository.

## Options considered

### Option 1: GitHub Actions with Gitleaks and local mock verification (Chosen)

A GitHub Actions pipeline with three separate jobs running on Node 22. The checks job runs `npm run typecheck`, `npm run lint`, and `npm run build`. The verify job seeds data via `npm run seed`, starts `npm start`, polls port 3000 with curl until ready, and runs `npm run verify` with `CATALOGUE_SOURCE=json` and `DB_DRIVER=json`. The secrets job runs the Gitleaks binary across the commit range. Concurrency grouping cancels older runs to protect Clerk accounts from state collisions. Code formatting stays with ESLint.

**Pros**:
* Built directly into GitHub with no extra service subscription needed
* Completely isolated from external cloud databases, so tests are fast and repeatable
* Gitleaks catches secrets locally in the runner before code merges
* Dedicated polling prevents port binding race conditions

**Cons**:
* Requires configuring Clerk development keys as repository secrets on GitHub

### Option 2: Cloud integrated pipeline with live Neon branch and Sanity dataset

Run verify against ephemeral branches on Neon Postgres and an isolated Sanity test dataset.

**Pros**:
* Tests against exact production database engines and network drivers

**Cons**:
* Higher latency from slow network hops to cloud data centers
* Extra complexity managing database branch lifecycles in pipeline scripts
* Risk of flaky test failures from third party API rate limits

### Option 3: Immediate Prettier adoption across all files

Add Prettier alongside ESLint and format every file in the codebase in a single large commit.

**Pros**:
* Uniform whitespace and formatting rules across every component and library file

**Cons**:
* Creates an enormous git diff across more than one hundred files
* Makes git blame and history tracking harder during the early MVP phase

## Decision

**Chosen option**: Option 1: GitHub Actions with Gitleaks and local mock verification

We run continuous integration through `.github/workflows/ci.yml` using GitHub Actions on Node 22. Every pull request runs three jobs: build checks, local API verification with `CATALOGUE_SOURCE=json` and `DB_DRIVER=json`, and Gitleaks secret scanning. The verify server builds production code, launches in the background, and polls with curl for up to 120 seconds before testing starts. We keep ESLint for code quality and defer introducing Prettier until after foundational features are delivered.

## Rationale

GitHub Actions is already native to the project repository at `github.com/Dev2LiveBW/afrideal`. Running the verification suite against local JSON stores guarantees that test runs stay fast, deterministic, and independent of external cloud connectivity. Because developer workstations in Botswana encounter elevated network latency to US East data centers, decoupling routine continuous integration from remote Neon connections prevents timeouts. Gitleaks provides fast commit inspection without external SaaS token dependencies. Polling the production server prevents race conditions where tests start before the port opens. Concurrency cancellation prevents multiple PR runs from colliding on shared Clerk demo accounts. Postponing Prettier avoids disruptive formatting diffs while core business features are actively built.

## Standard definition

**Canonical pattern**:
```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

env:
  CATALOGUE_SOURCE: json
  DB_DRIVER: json
  NEXT_PUBLIC_SANITY_PROJECT_ID: bly84glb
  NEXT_PUBLIC_SANITY_DATASET: production
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: ${{ secrets.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY }}
  CLERK_SECRET_KEY: ${{ secrets.CLERK_SECRET_KEY }}
  NEXT_TELEMETRY_DISABLED: 1
```

**Replaces**:
* Manual command verification before pushing to main
* Unscanned commit pushes that risk leaking API credentials
* Testing pull requests against shared cloud development databases

**Enforcement**:
Enforced automatically by GitHub Actions on every pull request and push to the `main` branch.

**Rollout**:
Active immediately in `.github/workflows/ci.yml`.

**Exceptions**:
None. Every pull request and push to `main` must pass all three jobs.

## Build plan

1. Configure `.github/workflows/ci.yml` with checks, verify, and secrets jobs, satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**
2. Remove any remaining scratch scripts from the repository, satisfies **AC-5**
3. Configure repository secrets `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` on GitHub, satisfies **AC-3**
4. Push a commit to verify that deliberate lint failures turn CI red and clean commits pass green, satisfies **AC-1**, **AC-2**

## Consequences

**Positive**:
* Regressions in TypeScript types, ESLint rules, and production builds are caught before merge
* Zero cloud database bills or external rate limits for test runs
* Committed secrets and private keys are detected and blocked automatically
* Concurrency controls avoid Clerk demo state collisions across simultaneous runs

**Negative / tradeoffs**:
* Continuous integration requires the two Clerk development keys to be configured in GitHub repository secrets
* Code formatting remains semi manual until Prettier is adopted

**Neutral**:
* The eight demo user accounts must exist in the Clerk development instance to allow verify tests to generate authentication tokens

## Follow-up

* [x] Add `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` to GitHub repository secrets
* [x] Verify that CI turns green on `main` once secrets are populated
* [ ] Revisit Prettier adoption after foundational marketplace features are complete
