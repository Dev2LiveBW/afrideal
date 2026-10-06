import { card, clickAndSave, expect, expectHealthy, signedInAs, test } from '../support/fixtures';

/** E. Supplier portal (docs/testing/e2e-journeys.md), as Naledi. */

test.use(signedInAs('naledi'));

test('E01 the dashboard shows Naledi her own business @p1', async ({ page }) => {
  await page.goto('/supplier/dashboard');
  await expectHealthy(page);
  await expect(page.getByText('Naledi Beauty Supplies').first()).toBeVisible();
  await expect(page.getByText('GlowUp Distributors')).toHaveCount(0);
});

test('E02 confirm, prepare and mark an order ready for collection @p1', async ({ page }) => {
  // The first order awaiting Naledi's confirmation (AFD-24842 and others are
  // seeded that way); picked from the screen so a retry finds a fresh one.
  await page.goto('/supplier/orders');
  const reference = await page
    .locator('section')
    .filter({ has: page.getByRole('button', { name: 'Confirm order' }) })
    .first()
    .getByRole('heading', { name: /^AFD-\d+$/ })
    .innerText();
  const order = card(page, reference);
  await expect(order).toContainText('Awaiting confirmation');

  for (const [button, status] of [
    ['Confirm order', 'Confirmed'],
    ['Start preparing', 'Preparing'],
    ['Mark ready for collection', 'Ready for collection'],
  ] as const) {
    await clickAndSave(order.getByRole('button', { name: button }));
    await expect(page.getByText(`Order moved to ${status}`, { exact: false }).first()).toBeVisible();
    await expect(order).toContainText(status);
  }
  await expect(order.getByRole('button')).toHaveCount(0);
});

test('E04 earnings list pending and settled invoices', async ({ page }) => {
  await page.goto('/supplier/earnings');
  await expectHealthy(page);
  await expect(page.getByText(/Settled/).first()).toBeVisible();
});
