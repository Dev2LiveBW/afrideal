/**
 * Run the Playwright journeys against a throwaway Neon branch.
 *
 *   npm run e2e                         # every journey
 *   npm run e2e -- e2e/storefront       # one folder (any Playwright args pass through)
 *   npm run e2e -- --grep @p1           # only the P1 journeys
 *   npm run e2e:demo -- e2e/flows/z01   # slowed down, video on, for the demo recordings
 *   npm run e2e -- --keep               # keep the branch afterwards, to inspect it
 *
 * Each run:
 *   1. deletes any `e2e-*` branch a crashed run left behind,
 *   2. branches `production` into `e2e-<timestamp>`,
 *   3. reloads that branch from data/*.json (so every run starts from the seed),
 *   4. runs Playwright, which starts its own dev server on port 3300 pointed at
 *      the branch (CATALOGUE_SOURCE=json, so Sanity is never written to either),
 *   5. deletes the branch.
 *
 * The production branch is never written to. Needs the Neon CLI signed in
 * (`neon auth`) with access to the afrideal project. The journeys themselves
 * are described in docs/testing/e2e-journeys.md.
 */

import { execFileSync, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT_ID = 'noisy-sky-21749196';
const PARENT = 'production';
const PREFIX = 'e2e-';

// The journeys docs/testing/e2e-journeys.md marks for a demo video. H02 (the
// eight sign-ins) is recorded by the setup project on every demo run.
const VIDEO_JOURNEYS = '(A0[1-4]|B0[1246]|B05|C01|D01|E0[124]|F0[12]|G0[1-35-8]|Z01) ';

const args = process.argv.slice(2);
const keep = args.includes('--keep');
const demo = args.includes('--demo');
const playwrightArgs = args.filter((a) => a !== '--keep' && a !== '--demo');
// A demo run records only the video journeys, unless told otherwise.
if (demo && !playwrightArgs.some((a) => a.startsWith('--grep') || a.startsWith('e2e'))) {
  playwrightArgs.push('--grep', VIDEO_JOURNEYS);
}

function neon(...cmd) {
  const out = execFileSync('neon', [...cmd, '--project-id', PROJECT_ID, '--output', 'json'], {
    cwd: ROOT_DIR,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  return JSON.parse(out);
}

function deleteBranch(id, name) {
  try {
    neon('branches', 'delete', id);
    console.log(`e2e: deleted branch ${name}`);
  } catch {
    console.warn(`e2e: could not delete branch ${name} (${id}); delete it in the Neon console`);
  }
}

function stamp() {
  return new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
}


let status = 1;
try {
  const env = {
    ...process.env,
    DATABASE_URL: 'json',
    DB_DRIVER: 'json',
    CATALOGUE_SOURCE: 'json',
    E2E_DATABASE_URL: 'json',
    ...(demo ? { E2E_DEMO: '1' } : {}),
  };

  // 4. The journeys.
  const cli = path.join(ROOT_DIR, 'node_modules', '@playwright', 'test', 'cli.js');
  const run = spawnSync(process.execPath, [cli, 'test', ...playwrightArgs], { cwd: ROOT_DIR, env, stdio: 'inherit' });
  status = run.status ?? 1;
} finally {
  console.log(`e2e: finished json run`);
}

process.exit(status);
