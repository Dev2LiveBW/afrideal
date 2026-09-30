# Rationale: Staging & production environments

## Context

The platform is preparing for Slice 1, which introduces card payment gateways. Payment providers require stable, public callback domains to send webhooks. We need a staging environment to test these flows safely without touching real money, and a production environment ready to receive real traffic. Both environments must be completely isolated so test data never bleeds into production. The choice of deployment triggers and secret management affects our operational complexity and deployment safety.

## Options considered

### Option 1: Two Vercel projects with GitHub integration (Chosen)

Vercel natively connects to the GitHub repository. We provision two Vercel projects. The staging project (`afrideal-staging`) builds the `main` branch. The production project (`afrideal-production`) uses an "Ignored Build Step" bash script to check for git tags and cancels the build otherwise. Secrets are entered manually in the Vercel dashboard.

**Pros**:
- Uses Vercel's built in CD pipeline with zero external CI actions required.
- Manual secret management avoids the complexity of third party secret managers.
- Clean separation of domains and environment variables across two Vercel projects.

**Cons**:
- Deploying production based on tags requires a custom bash script for the Ignored Build Step since Vercel natively treats a specific branch as production.
- Manual secret rotation is tedious if keys change frequently.

### Option 2: GitHub Actions with Vercel CLI

Disable Vercel's native GitHub integration and drive deployments completely from GitHub Actions. The action runs `vercel --prod` when a tag is pushed.

**Pros**:
- Precise control over deployment triggers directly in the GitHub workflow file.

**Cons**:
- Requires managing Vercel deployment tokens and project IDs in GitHub secrets.
- Re implements deployment status tracking that Vercel already provides natively.

### Option 3: Third party Secret Manager (e.g., Doppler)

Store all Neon, Clerk, and Sanity keys in Doppler and inject them during Vercel builds.

**Pros**:
- Centralized secret management with audit logs and automatic rotation.

**Cons**:
- Overkill for a small team.
- Introduces another point of failure and a new tool to learn.
