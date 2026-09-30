# Verify: Staging & production environments · spec 0002 · updated 2026-09-28
_Steps derived from spec 0002 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [ ] Push to `main` → expect deployment on `afrideal-staging` project → AC-1
- [ ] Push a `v*` tag → expect deployment on `afrideal-production` project → AC-2
- [ ] Create a PR → expect NO preview deployment in Vercel → AC-5
- [ ] Inspect Vercel Environment Variables → expect staging to use staging secrets, production to use production secrets → AC-4
- [ ] Inspect Sanity projects, Clerk instances, and Neon branches → expect isolated environments → AC-3

## Commands
- [ ] `VERIFY_BASE=https://staging.afrideal.co.bw npm run verify` → expect tests pass green → AC-6

## Acceptance-criteria coverage
- AC-1 is covered by pushing to main.
- AC-2 is covered by pushing a tag.
- AC-3 is covered by inspecting environments.
- AC-4 is covered by inspecting variables.
- AC-5 is covered by PR deployment checks.
- AC-6 is covered by the verify script.
