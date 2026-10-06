import { expectHealthy, signedInAs, test } from '../support/fixtures';

/**
 * Bugs the journeys found, kept as tests marked `test.fail()`.
 *
 * Each one passes while the bug is there. Fix the bug and the test reports
 * "unexpectedly passed": delete its `test.fail()` line and it becomes an
 * ordinary guard. Listed in docs/testing/e2e-journeys.md, "Findings".
 */

test.use(signedInAs('thabo'));

test('K01 the order list shows no garbled characters', async ({ page }) => {
  test.fail(true, 'app/(store)/orders/page.tsx prints "Â·" where a middle dot belongs.');
  await page.goto('/orders');
  await expectHealthy(page);
});

test('K02 the runner request list shows no garbled characters', async ({ page }) => {
  test.fail(true, 'app/(store)/requests/page.tsx prints "Â·" where a middle dot belongs.');
  await page.goto('/requests');
  await expectHealthy(page);
});
