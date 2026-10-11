import { expect, expectHealthy, signedInAs, test } from '../support/fixtures';

/**
 * Bugs the journeys found, kept as tests marked `test.fail()`.
 *
 * Each one passes while the bug is there. Fix the bug and the test reports
 * "unexpectedly passed": delete its `test.fail()` line and it becomes an
 * ordinary guard. Listed in docs/testing/e2e-journeys.md, "Findings".
 */

test.use(signedInAs('thabo'));

test('K01 the order list shows no garbled characters and rows are under 120px', async ({ page }) => {
  await page.goto('/orders');
  await expectHealthy(page);
  const rows = page.locator('main ul > li');
  const count = await rows.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    const box = await rows.nth(i).boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.height).toBeLessThanOrEqual(120);
    }
  }
});

test('K02 the runner request list shows no garbled characters', async ({ page }) => {
  await page.goto('/requests');
  await expectHealthy(page);
});
