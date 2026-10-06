import { expectHealthy, signedInAs, test } from '../support/fixtures';

/**
 * Bugs the journeys found, kept as tests (docs/testing/e2e-journeys.md,
 * "Findings").
 *
 * A bug that is still open is marked `test.fail()`: the test passes while the
 * bug is there and reports "unexpectedly passed" once it is fixed, the cue to
 * delete the marker. Without the marker the test is an ordinary guard against
 * the bug coming back.
 */

test.use(signedInAs('thabo'));

// Fixed 2026-10-06: the middle dots were stored double-encoded and printed as "Â·".
test('K01 the order list shows no garbled characters', async ({ page }) => {
  await page.goto('/orders');
  await expectHealthy(page);
});

test('K02 the runner request list shows no garbled characters', async ({ page }) => {
  await page.goto('/requests');
  await expectHealthy(page);
});
