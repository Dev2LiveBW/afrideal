import { clickAndSave, expect, expectHealthy, runLabel, signedInAs, test } from '../support/fixtures';

/** G. Team console (docs/testing/e2e-journeys.md). */

test.describe('Operations (Keabetswe)', () => {
  test.use(signedInAs('ops'));

  test('G01 the orders list filters by status @p1', async ({ page }) => {
    await page.goto('/admin/orders');
    await expectHealthy(page);
    await page.getByRole('button', { name: /^In transit \(\d+\)$/ }).click();
    const rows = page.getByRole('row').filter({ has: page.getByRole('link', { name: /^AFD-/ }) });
    await expect(rows.first()).toBeVisible();
    for (const row of await rows.all()) await expect(row).toContainText('In transit');
  });

  test('G02 a staff note on an order survives a reload', async ({ page }) => {
    const note = runLabel('Customer asked for a morning drop');
    await page.goto('/admin/orders/o001');
    // One staff note per order, edited in place.
    const box = page.getByRole('textbox', { name: 'Internal note, staff only' });
    await box.fill(note);
    await clickAndSave(page.getByRole('button', { name: 'Save note' }));
    await expect(page.getByText('Internal note saved')).toBeVisible();
    await page.reload();
    await expect(page.getByRole('textbox', { name: 'Internal note, staff only' })).toHaveValue(note);
  });

  /*
   * The journeys below change seeded records. Each picks its target from the
   * screen (the first pending supplier, the first open dispute) rather than a
   * fixed id, so a retry after a network blip finds a fresh one instead of
   * the record the first attempt already changed.
   */

  /** The first supplier still awaiting a decision, by name. */
  async function firstPendingSupplier(page: import('@playwright/test').Page): Promise<string> {
    const row = page.getByRole('row').filter({ has: page.getByRole('button', { name: 'Approve' }) }).first();
    return (await row.getByRole('link').first().innerText()).split('\n').find((line) => line.trim().length > 2)!.trim();
  }

  test('G03 approve a pending supplier @p1', async ({ page }) => {
    // Seeded pending: Setlhoa Office Group and Tsholofelo Fresh Produce.
    await page.goto('/admin/suppliers');
    const name = await firstPendingSupplier(page);
    const row = page.getByRole('row', { name: new RegExp(name) });
    await row.getByRole('button', { name: 'Approve' }).click();
    await clickAndSave(page.getByRole('dialog').getByRole('button', { name: 'Approve supplier' }));
    await page.reload();
    await expect(page.getByRole('row', { name: new RegExp(name) })).toContainText('Verified');
  });

  test('G04 reject a pending application', async ({ page }) => {
    await page.goto('/admin/suppliers');
    const name = await firstPendingSupplier(page);
    await page.getByRole('row', { name: new RegExp(name) }).getByRole('button', { name: 'Reject' }).click();
    await clickAndSave(page.getByRole('dialog').getByRole('button', { name: 'Reject application' }));
    await page.reload();
    await expect(page.getByRole('row', { name: new RegExp(name) })).toContainText('Rejected');
  });

  test('G05 work an open dispute to a resolution @p1', async ({ page }) => {
    // Seeded open: dp002 on AFD-24823.
    await page.goto('/admin/disputes');
    await page.getByRole('button', { name: /^Open \(\d+\)$/ }).click();
    // The innermost box holding both an order link and a Review button.
    const reference = await page
      .locator('li, article, section, tr, div')
      .filter({ has: page.getByRole('button', { name: 'Review' }) })
      .filter({ has: page.getByRole('link', { name: /^AFD-\d+$/ }) })
      .last()
      .getByRole('link', { name: /^AFD-\d+$/ })
      .first()
      .innerText();
    const dispute = () =>
      page
        .locator('li, article, section, tr, div')
        .filter({ has: page.getByRole('link', { name: reference }) })
        .filter({ has: page.getByRole('button', { name: 'Favour customer' }) })
        .last();

    await dispute().getByRole('button', { name: 'Review' }).click();
    await clickAndSave(page.getByRole('dialog').getByRole('button', { name: 'Mark under review' }));
    await page.getByRole('button', { name: /^All \(\d+\)$/ }).click();
    await expect(dispute().getByRole('button', { name: 'Review' })).toHaveCount(0);

    await dispute().getByRole('button', { name: 'Favour customer' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('textbox', { name: 'Resolution note, optional' }).fill('Photos show the wrong item was sent.');
    await clickAndSave(dialog.getByRole('button', { name: 'Resolve dispute' }));
    await page.getByRole('button', { name: /^Resolved \(\d+\)$/ }).click();
    await expect(page.getByRole('link', { name: reference })).toBeVisible();
  });

  test('G10 the runner roster lists Kagiso', async ({ page }) => {
    await page.goto('/admin/runners');
    await expectHealthy(page);
    await expect(page.getByText('Kagiso Sithole').first()).toBeVisible();
  });
});

test.describe('Finance', () => {
  test.use(signedInAs('finance'));

  test('G06 settle a supplier invoice @p1', async ({ page }) => {
    // The first outstanding invoice (39 are seeded outstanding).
    await page.goto('/admin/payables');
    const box = page.getByRole('checkbox', { name: /^Select AFD-\d+$/ }).first();
    const reference = (await box.getAttribute('aria-label'))!.replace('Select ', '');
    await box.check();
    await page.getByRole('button', { name: 'Settle', exact: true }).click();
    await clickAndSave(page.getByRole('dialog').getByRole('button', { name: 'Settle invoices' }));

    await page.reload();
    await page.getByRole('button', { name: /^All \(\d+\)$/ }).click();
    await expect(page.getByRole('row', { name: new RegExp(`${reference}\\b`) }).first()).toContainText('Settled');
  });

  test('G07 analytics shows the APR revenue share @p1', async ({ page }) => {
    await page.goto('/admin/analytics');
    await expectHealthy(page);
    await expect(page.getByRole('heading', { name: /GMV trend/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Annual Platform Report - revenue share/ })).toBeVisible();
  });
});

test.describe('Super admin', () => {
  test.use(signedInAs('admin'));

  test('G08 the pricing page and calculator load', async ({ page }) => {
    await page.goto('/admin/pricing');
    await expectHealthy(page);
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  });

  test('G09 settings load', async ({ page }) => {
    await page.goto('/admin/settings');
    await expectHealthy(page);
    await expect(page).toHaveURL(/\/admin\/settings$/);
  });
});
