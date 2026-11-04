import type { Page } from '@playwright/test';

import { addToCart, agreeAtCheckout, caption, clickAndSave, expect, expectHealthy, ready, signedInAs, test } from '../support/fixtures';

/**
 * B18 and B19: promo codes (spec 0011, docs/testing/e2e-journeys.md). Finance makes
 * a fresh code for each run, because a buyer can use a code once and the phone and
 * desktop runs share one buyer.
 */

const uniqueCode = (prefix: string, phone: boolean) =>
  `${prefix}${phone ? 'P' : 'D'}${Date.now().toString(36).toUpperCase()}`;

async function createCode(finance: Page, code: string) {
  await finance.goto('/admin/promo-codes');
  await ready(finance);
  await finance.getByRole('button', { name: 'Add a code' }).click();
  await finance.getByLabel('Code').fill(code);
  await finance.getByLabel('Percent off').fill('10');
  await finance.getByLabel('Maximum discount (BWP)').fill('50');
  await finance.getByLabel('Starts').fill('2026-01-01');
  await finance.getByLabel('Ends').fill('2036-01-01');
  await clickAndSave(finance.getByRole('button', { name: 'Create code' }));
  await expect(finance.getByRole('row', { name: new RegExp(code) })).toContainText('Live');
}

async function checkoutWithShea(page: Page) {
  await addToCart(page, 'p001', 1);
  await page.goto('/checkout');
  await expect(page.getByRole('heading', { name: 'Confirm and pay' })).toBeVisible();
  await ready(page);
  await page.getByRole('textbox', { name: 'Street address or plot number' }).fill('Plot 77, Broadhurst');
}

const totalToPay = (page: Page) => page.getByText('Total to pay').first().locator('xpath=following-sibling::*[1]');

async function applyCode(page: Page, code: string) {
  await page.getByRole('textbox', { name: 'Promo code' }).fill(code);
  await page.getByRole('button', { name: 'Apply' }).click();
}

test.describe('Promo codes', () => {
  test.use(signedInAs('thabo'));

  test('B18 finance makes a code and a buyer pays less with it @p1', async ({ page, as }, testInfo) => {
    // Two people's screens and the paid order page over Neon.
    test.slow();
    const code = uniqueCode('SAVE', testInfo.project.name === 'phone');
    const finance = await as('finance');

    await caption(finance, 'B18 · 1. Finance makes a code');
    await createCode(finance, code);

    await caption(page, 'B18 · 2. A wrong code is refused, and the right one lowers the total');
    await checkoutWithShea(page);
    await expect(totalToPay(page)).toHaveText('BWP 182.00');
    await applyCode(page, 'NOSUCHCODE');
    await expect(page.getByText('That code is not valid.')).toBeVisible();
    await applyCode(page, code);
    await expect(page.getByText(`Promo ${code}`)).toBeVisible();
    await expect(totalToPay(page)).toHaveText('BWP 168.30');

    await caption(page, 'B18 · 3. The buyer is charged the lower total');
    await agreeAtCheckout(page);
    await clickAndSave(page.getByRole('button', { name: 'Place order' }).filter({ visible: true }));
    await page.waitForURL(/.*mock-gateway.*/);
    await expect(page.getByText('BWP 168.30')).toBeVisible();
    await page.getByRole('textbox', { name: 'Card number' }).fill('4242424242424242');
    await page.getByRole('button', { name: 'Pay' }).click();
    await page.waitForURL(/\/orders\/o\d+\?placed=1/, { waitUntil: 'domcontentloaded' });

    await caption(page, 'B18 · 4. The order shows the discount');
    await expect(page.getByText(`Promo ${code}`)).toBeVisible();
    await expect(page.getByText('Total', { exact: true }).locator('xpath=following-sibling::*[1]')).toHaveText('BWP 168.30');
    await expectHealthy(page);

    await caption(finance, 'B18 · 5. Finance sees one paid use');
    await finance.reload();
    await expect(finance.getByRole('row', { name: new RegExp(code) }).getByRole('cell').nth(5)).toHaveText('1');
  });

  test('B19 a code switched off after it was applied stops the order until the buyer agrees @p1', async ({ page, as }, testInfo) => {
    test.slow();
    const code = uniqueCode('STOP', testInfo.project.name === 'phone');
    const finance = await as('finance');
    await createCode(finance, code);

    await caption(page, 'B19 · 1. The buyer applies the code');
    await checkoutWithShea(page);
    await applyCode(page, code);
    await expect(totalToPay(page)).toHaveText('BWP 168.30');

    await caption(finance, 'B19 · 2. Finance switches it off');
    await clickAndSave(finance.getByRole('button', { name: `Switch off ${code}` }));
    await expect(finance.getByRole('row', { name: new RegExp(code) })).toContainText('Switched off');

    await caption(page, 'B19 · 3. Placing the order shows the new total first');
    await agreeAtCheckout(page);
    await page.getByRole('button', { name: 'Place order' }).filter({ visible: true }).click();
    await expect(page.getByText(/Your total is now BWP 182\.00/)).toBeVisible();
    await expect(totalToPay(page)).toHaveText('BWP 182.00');

    await caption(page, 'B19 · 4. Pressing Place order again goes ahead at the full price');
    await clickAndSave(page.getByRole('button', { name: 'Place order' }).filter({ visible: true }));
    await page.waitForURL(/.*mock-gateway.*/);
    await expect(page.getByText('BWP 182.00')).toBeVisible();
  });
});
