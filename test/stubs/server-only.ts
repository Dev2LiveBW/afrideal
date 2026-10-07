/**
 * Stands in for the real `server-only` package during unit tests.
 *
 * `server-only` exists to throw at build time if a module is imported into a
 * client bundle. Every module under test here imports it, so without this stub
 * the test run would fail on the import rather than on anything meaningful.
 * Aliased in vitest.config.ts; it never reaches the app build.
 */
export {};
