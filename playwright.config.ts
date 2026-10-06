import { defineConfig, devices } from '@playwright/test';

/**
 * End to end journeys (docs/testing/e2e-journeys.md).
 *
 * Run them with `npm run e2e`, not `npx playwright test`: the wrapper
 * (scripts/e2e.mjs) makes a throwaway Neon branch and hands its URL in as
 * E2E_DATABASE_URL, and this config starts a dev server on that branch. With
 * neither that nor an explicit E2E_BASE (a staging URL, later) it refuses to
 * run, so a stray run can never write orders into the live demo data.
 */

const PORT = 3300;
const branchUrl = process.env.E2E_DATABASE_URL;
const externalBase = process.env.E2E_BASE;
const demo = process.env.E2E_DEMO === '1';

/*
 * A production build by default: a dev server compiles each route on its
 * first visit and, under two workers, throws `__webpack_modules__` and
 * `useContext` errors mid journey (AGENTS.md, "Verifying UI"). The build adds
 * a few minutes up front and removes that whole class of false failure; it
 * also keeps compile pauses out of the demo videos. E2E_SERVER=dev skips the
 * build when you are iterating on one spec.
 */
const useDevServer = process.env.E2E_SERVER === 'dev';
const serverCommand = useDevServer
  ? `npx next dev -p ${PORT}`
  : `npx next build && npx next start -p ${PORT}`;

if (!branchUrl && !externalBase) {
  throw new Error(
    'Run the journeys with `npm run e2e` (a fresh Neon branch per run), ' +
      'or set E2E_BASE to a server whose data may be changed.',
  );
}

const baseURL = externalBase ?? `http://localhost:${PORT}`;

// The storefront is measured against the Alibaba app on a phone.
const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1440, height: 900 };

const phone = {
  ...devices['Desktop Chrome'],
  viewport: PHONE,
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  video: demo ? { mode: 'on' as const, size: PHONE } : ('retain-on-failure' as const),
};

const desktop = {
  ...devices['Desktop Chrome'],
  viewport: DESKTOP,
  video: demo ? { mode: 'on' as const, size: { width: 1280, height: 800 } } : ('retain-on-failure' as const),
};

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  // Every read is a round trip to Ohio (~275 ms from Botswana), and a dev
  // server also compiles each route on its first visit, so be patient.
  timeout: 180_000,
  // A save from Botswana chains several round trips to Ohio (the record, the
  // audit log, a notification, each its own locked transaction), so what a
  // save changes on screen can take well over 20 s to appear. Each save's
  // time is listed on its test in the report (e2e/support/fixtures.ts).
  expect: { timeout: 60_000 },
  fullyParallel: false,
  workers: demo ? 1 : 2,
  // One retry absorbs a dev server hiccup; the report still marks such a
  // test "flaky", so nothing is hidden.
  retries: 1,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
  ],

  use: {
    baseURL,
    navigationTimeout: 90_000,
    actionTimeout: 20_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: demo ? { slowMo: 450 } : {},
  },

  projects: [
    // Signs each demo account in once, by clicking its card (journey H02),
    // and saves the session for the journeys that act as that person.
    { name: 'setup', testMatch: /auth\.setup\.ts/, use: desktop },

    // Storefront journeys run at both sizes.
    { name: 'phone', testMatch: /(storefront|runner)\/.*\.spec\.ts/, use: phone, dependencies: ['setup'] },
    { name: 'desktop', testMatch: /(storefront|supplier|console|access|flows)\/.*\.spec\.ts/, use: desktop, dependencies: ['setup'] },
  ],

  webServer: branchUrl
    ? {
        command: serverCommand,
        url: `${baseURL}/`,
        // A Windows build runs in-process (next.config.mjs, workerThreads off).
        timeout: useDevServer ? 240_000 : 20 * 60_000,
        // Never attach to a server we did not start: it may be on live data.
        reuseExistingServer: false,
        stdout: 'ignore',
        stderr: 'pipe',
        env: {
          DATABASE_URL: branchUrl,
          DB_DRIVER: 'postgres',
          CATALOGUE_SOURCE: 'json',
          // Its own build folder, so it can run beside your `npm run dev`.
          NEXT_DIST_DIR: '.next-e2e',
        },
      }
    : undefined,
});
