# Rationale: Staging & production environments

## Context

The platform is preparing for Slice 1, which introduces card payment gateways. Payment providers require stable, public callback domains to send webhooks. We need a staging environment to test these flows safely without touching real money, and a production environment ready to receive real traffic. Both environments must be completely isolated so test data never bleeds into production. The choice of deployment triggers and secret management affects our operational complexity and deployment safety.

**Update 2026-09-30.** The first version of this spec chose Option 1 below. Before building it, `/develop` found that Vercel's Git integration deploys branch pushes only; a tag push never creates a deployment, so the Ignored Build Step that was meant to pass tags would have cancelled every build and production would never deploy. Vercel's own guide for tag based releases recommends GitHub Actions instead. The spec now chooses Option 2, and the same update settles which data sources serve each environment and when the Neon project moves to the company org.

## Options considered

### Option 1: Two Vercel projects, both on the Git integration, tags filtered by an Ignored Build Step (rejected on 2026-09-30)

Both projects connect to the repository. The production project runs an Ignored Build Step script that cancels every build whose ref does not start with `v`.

**Pros**:
- No workflow file; Vercel's own pipeline does everything.

**Cons**:
- Does not work. Vercel never builds on a tag push, so `VERCEL_GIT_COMMIT_REF` is always a branch name and the script cancels every production build.

### Option 2: Staging on the Git integration, production from tags through GitHub Actions and the Vercel CLI (chosen)

The staging project keeps Vercel's Git integration and builds `main`. The production project has no Git connection; a workflow on `v*` tags checks out the tagged commit, migrates the production branch, and runs `vercel build --prod` then `vercel deploy --prebuilt --prod`.

**Pros**:
- Deploys exactly the tagged commit, and can refuse tags that are not on `main`.
- Staging keeps Vercel's native deploys and status checks with nothing to maintain.
- The production job can sit behind a GitHub environment with a required reviewer later.

**Cons**:
- Needs `VERCEL_TOKEN`, `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` in GitHub secrets.
- Two deploy paths to understand instead of one.

### Option 3: Production through a Vercel Deploy Hook called from GitHub Actions

Disable Git deploys on production and have a tag workflow POST to a Deploy Hook URL.

**Pros**:
- No Vercel token in GitHub, only a hook URL.

**Cons**:
- A Deploy Hook builds the head of a branch, not the tagged commit, so a release can ship code that was merged after the tag.

### Option 4: Third party secret manager (e.g. Doppler)

Store all Neon, Clerk and Sanity keys in Doppler and inject them during builds.

**Pros**:
- Central secrets with audit logs and rotation.

**Cons**:
- Overkill for a small team, and one more service to depend on.

## Rationale

Option 2 is the only design that both works and ships exactly what was tagged. Keeping staging on the Git integration means the frequent path (every merge) has nothing custom in it; only the rare, deliberate path (a release) runs through a workflow.

Data sources follow where the real data already is. The product owner edits the live catalogue in Sanity `bly84glb`, so it stays production and staging gets a copy. The Neon default branch becomes production, with `staging` and `dev` as children, so a local `npm run verify` (which writes to the store) can never touch production. Staging shares the Clerk development instance with local dev because `npm run verify` needs the synced demo accounts there; production gets its own instance.

The Neon project moves to the company owned org before production goes live, not before staging. Branches move with the project, so nothing built now is lost, and staging does not have to wait for the client's org to exist.

## References

- Vercel, "Can you deploy based on tags/releases on Vercel?" (knowledge base guide): https://vercel.com/guides/can-you-deploy-based-on-tags-releases-on-vercel
- Vercel, Git integrations: https://vercel.com/docs/git-integrations
- Vercel CLI, deploying from the CLI (`vercel deploy --prebuilt`): https://vercel.com/docs/cli/deploying-from-cli
- Vercel, Git configuration (`git.deploymentEnabled`): https://vercel.com/docs/project-configuration/git-configuration
