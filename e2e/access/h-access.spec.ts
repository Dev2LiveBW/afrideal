import { expect, signedInAs, test } from '../support/fixtures';

/**
 * H. Who can see what (docs/testing/e2e-journeys.md). No videos for these:
 * they are safety checks, not things to show off.
 */

test.describe('H01. Signed out', () => {
  for (const route of ['/orders', '/requests', '/supplier/dashboard', '/runner/jobs', '/admin/dashboard']) {
    test(`H01 ${route} sends a signed-out visitor to sign in @p1`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/sign-in/);
    });
  }
});

test.describe('H03. A customer stays out of the portals', () => {
  test.use(signedInAs('thabo'));

  for (const route of ['/admin/dashboard', '/admin/payables', '/supplier/dashboard', '/runner/jobs']) {
    test(`H03 Thabo cannot open ${route} @p1`, async ({ page }) => {
      await page.goto(route);
      await expect(page).not.toHaveURL(new RegExp(`${route}$`));
      await expect(page.getByRole('heading', { name: /Platform dashboard|Supplier payables|Jobs/ })).toHaveCount(0);
    });
  }
});

test.describe('H04. Finance sees only payables and analytics', () => {
  test.use(signedInAs('finance'));

  for (const route of ['/admin/orders', '/admin/suppliers', '/admin/settings', '/admin/pricing', '/admin/disputes']) {
    test(`H04 Finance is turned away from ${route} @p1`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/\/admin\/analytics\?denied=/);
    });
  }

  test('H04 Finance can open payables @p1', async ({ page }) => {
    await page.goto('/admin/payables');
    await expect(page.getByRole('heading', { name: 'Supplier payables', level: 1 }).first()).toBeVisible();
  });
});

test.describe('H05. Operations cannot change settings', () => {
  test.use(signedInAs('ops'));

  test('H05 Operations is turned away from settings @p1', async ({ page }) => {
    await page.goto('/admin/settings');
    await expect(page).toHaveURL(/\/admin\/dashboard\?denied=/);
  });
});

test.describe('H06. One supplier never sees another', () => {
  test.use(signedInAs('glowup'));

  test("H06 GlowUp sees none of Naledi's orders @p1", async ({ page }) => {
    await page.goto('/supplier/orders');
    await expect(page.getByRole('heading', { name: 'Your orders', level: 1 })).toBeVisible();
    // AFD-24850 (o041) is Thabo's order routed only to Naledi.
    await expect(page.getByText('AFD-24850')).toHaveCount(0);
    await expect(page.getByText('Naledi Beauty Supplies')).toHaveCount(0);
  });

  test("H06 GlowUp cannot move Naledi's order through the API @p1", async ({ page }) => {
    // Sent from inside GlowUp's open portal, as the app itself would, so
    // Clerk's short lived session token is fresh: this must be refused as
    // "not yours" (403), not "not signed in" (401).
    await page.goto('/supplier/orders');
    // sup045 is Naledi's leg of o041 (data/supplier-orders.json).
    const status = await page.evaluate(async () => {
      const response = await fetch('/api/supplier-orders/sup045', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CONFIRMED' }),
      });
      return response.status;
    });
    expect(status).toBe(403);
  });
});

test.describe('H07. One customer never sees another', () => {
  test.use(signedInAs('kefilwe'));

  test("H07 Kefilwe cannot open Thabo's order @p1", async ({ page }) => {
    await page.goto('/orders/o041');
    await expect(page.getByRole('heading', { name: 'AFD-24850' })).toHaveCount(0);
    await expect(page.getByText('Plot 5412, Extension 12')).toHaveCount(0);
  });
});
