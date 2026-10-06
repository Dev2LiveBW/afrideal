import { expect, expectHealthy, signedInAs, test } from '../support/fixtures';

/** F. Runner portal (docs/testing/e2e-journeys.md), as Kagiso, at phone width. */

test.use(signedInAs('kagiso'));

test('F01 go offline and back online, and it sticks @p1', async ({ page }) => {
  const toggle = page.getByRole('button', { name: /You're (online|offline)/ });

  /** Flip the switch once the page is interactive, and check the save went through. */
  async function flip(expected: 'true' | 'false') {
    await page.waitForLoadState('networkidle');
    const saved = page.waitForResponse((r) => r.url().includes('/api/runners/') && r.request().method() === 'PATCH', {
      timeout: 90_000,
    });
    await toggle.click();
    expect((await saved).status(), 'the status change is saved').toBe(200);
    await expect(toggle).toHaveAttribute('aria-pressed', expected);
  }

  await page.goto('/runner/dashboard');
  await expectHealthy(page);
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');

  try {
    await flip('false');
    await page.reload();
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  } finally {
    // Kagiso must end online whatever happened, or the delivery journeys
    // that need him lose their job alerts.
    if ((await toggle.getAttribute('aria-pressed')) === 'false') await flip('true');
  }
  await expect(page.getByText('Accepting job alerts nearby')).toBeVisible();
});

test('F03 earnings load', async ({ page }) => {
  await page.goto('/runner/earnings');
  await expectHealthy(page);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});
