# 0001 · Coding standards & CI

**Status**: Assumed
**Date**: 2026-09-23
**Authorized by**: Dev2LiveBW, during /develop

## Owed decision
Which tools make every PR prove itself: the CI host, the secret scanner, what
the verify job runs against (store and auth instance), and whether to add a
formatter.

## Assumption built on
- **CI host:** GitHub Actions (the repo lives at `github.com/Dev2LiveBW/afrideal`).
  One workflow, `.github/workflows/ci.yml`, runs on every pull request and on
  pushes to `main`.
- **Checks job:** `npm ci`, `npm run typecheck`, `npm run lint`, `npm run build`.
- **Verify job:** builds and starts the app with `CATALOGUE_SOURCE=json` and
  `DB_DRIVER=json`, so it needs no Neon or Sanity access, then runs
  `npm run verify` against it. Sessions come from the **Clerk development
  instance**; its keys live in GitHub repository secrets
  (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`). The demo accounts
  must already exist there (`scripts/sync-users-to-clerk.mjs`).
- **Secret scan:** Gitleaks, as its own job, scanning the pushed commits.
- **Formatter:** none for now. Adding one would reformat the whole codebase in
  one commit; revisit on its own.

## Code area
`.github/workflows/ci.yml`, `.gitignore`, the scratch Python files in the repo
root (removed).

## Requirements
- AC-1: CI goes red on a deliberate lint error.
- AC-2: CI is green on `main`.
- AC-3: no `scratch_*.py`, `fix_btn*.py` (or `update_btn*.py`) left in the app root.
- AC-4: a committed secret fails the Gitleaks job.

## Ratify
This decision was recorded by /develop, not deliberated. Run `/architect coding standards & CI`
to deliberate and ratify it. Until then it stays flagged as an owed decision; it does not block marking the feature `done`.
