import { resolve } from 'node:path';

import { defineConfig } from 'vitest/config';

/**
 * Unit tests for the pure logic in `lib/`.
 *
 * Deliberately narrow. The route handlers are already covered end to end by
 * `npm run verify`, which drives the real HTTP API with real Clerk sessions, and
 * the browser journeys by `npm run e2e`. What neither can reach is the arithmetic
 * and the branch edges inside a module: a production guard that must refuse an env
 * override, a three part expiry rule, a constant time comparison. That is what
 * lives here.
 *
 * `vitest@2` rather than the current major, because vitest 3 and up pull a Vite
 * that needs `@types/node` 20.19 or newer and this project pins 20.17.12 for the
 * Next 14 build. Bumping a pinned type package just to add a test runner is the
 * wrong trade.
 */
export default defineConfig({
  test: {
    // Node, not jsdom: nothing here renders. Component tests would need
    // @testing-library and a DOM environment, which this scope does not include.
    environment: 'node',
    include: ['lib/**/*.test.ts'],
    alias: {
      // `server-only` throws when imported outside a React Server Component, and
      // every module under test imports it. This stub lets the logic be exercised
      // directly without pretending to be a server component.
      'server-only': resolve(__dirname, 'test/stubs/server-only.ts'),
    },
  },
  resolve: {
    // Mirrors tsconfig's `"@/*": ["./*"]`, so an import reads the same in a test
    // as it does in the app.
    alias: {
      '@': resolve(__dirname, '.'),
    },
  },
});
