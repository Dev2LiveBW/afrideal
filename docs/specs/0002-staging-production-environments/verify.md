# Verify: Staging & production environments · spec 0002 · updated 2026-09-30
_Steps derived from spec 0002 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [ ] Push to `main` → a deployment appears on `afrideal-staging` and serves the new commit → AC-1
- [ ] Push `v0.1.0` on a commit that is on `main` → the "Deploy production" workflow passes and `afrideal-production` shows one deployment of exactly that commit → AC-2
- [ ] Push a throwaway `v*` tag on a commit that is not on `main` → the workflow fails at the ancestry check and no production deployment appears → AC-2
- [ ] Compare the Neon branch, Sanity project id and Clerk publishable key in each Vercel project's variables with the environment map → each matches its column and none repeats across staging and production → AC-3, AC-4
- [ ] Check your `.env.local` → `DATABASE_URL` points at the Neon `dev` branch, not the default branch → AC-3
- [ ] Open a pull request → no Vercel preview deployment appears on either project → AC-5
- [ ] Open the production deployment URL signed out of Vercel → deployment protection blocks it, and no public domain is attached → AC-7

- [ ] Push a `v*` tag on a `main` commit whose CI failed or has not finished → the workflow fails at the CI check and nothing deploys → AC-2

## Commands
- [ ] `VERIFY_BASE=<staging URL> npm run verify` → all checks pass → AC-6
- [ ] `DATABASE_URL=<production URL> npm run db:load` → refuses and exits non zero without touching data; with `--production` it would proceed (do not run that) → AC-3

## Acceptance-criteria coverage
- AC-1 by the push to `main`. AC-2 by the two tag pushes. AC-3 by the variable comparison and the `.env.local` check. AC-4 by the variable comparison. AC-5 by the pull request check. AC-6 by the verify command. AC-7 by the protection check.
