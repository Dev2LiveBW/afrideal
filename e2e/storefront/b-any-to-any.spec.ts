import { addToCart, caption, clickAndSave, expect, expectHealthy, ready, signedInAs, test } from '../support/fixtures';

/**
 * B12 and B13: any buyer, any country (spec 0009, docs/testing/e2e-journeys.md).
 * Runs at phone and desktop width; each run makes its own order.
 */

/** The order summary panel at checkout. */
function orderSummary(page: import('@playwright/test').Page) {
  return page.getByRole('heading', { name: 'Order summary' }).locator('xpath=..');
}

test.describe('B12. A buyer in Lesotho', () => {
  test.use(signedInAs('kefilwe'));

  test('B12 a buyer in Maseru pays in rand with Lesotho\'s payment methods @p1', async ({ page }) => {
    // 1. "Deliver to" holds a country and a town; Maseru is under Lesotho.
    await page.goto('/');
    await ready(page);
    await caption(page, 'B12 · 1. Deliver to Maseru, Lesotho');
    const deliverTo = page.locator('button[aria-haspopup="listbox"]').first();
    await deliverTo.click();
    await page.getByRole('option', { name: 'Maseru' }).click();
    await expect(deliverTo).toContainText('Maseru');

    // 2. Shea butter is held in South Africa. Rand is 1:1 to the pula for now,
    // so the figures match B02's and only the currency changes.
    await caption(page, 'B12 · 2. South African shea butter, priced in rand');
    await addToCart(page, 'p001', 1);
    await page.goto('/cart');
    const cart = page.locator('main');
    await expect(cart).toContainText('ZAR 137.00');
    await expect(cart).toContainText('ZAR 182.00');

    // 3. Checkout starts from "Deliver to" and lists Lesotho's own methods.
    await page.goto('/checkout');
    await expect(page.getByRole('heading', { name: 'Confirm and pay' })).toBeVisible();
    await ready(page);
    await caption(page, 'B12 · 3. Lesotho at checkout: card live, M-Pesa and EcoCash coming soon');
    await expect(page.getByRole('combobox', { name: 'Country' })).toHaveValue('LS');
    await expect(page.getByRole('radio', { name: /M-Pesa/ })).toBeDisabled();
    await expect(page.getByRole('radio', { name: /EcoCash/ })).toBeDisabled();
    await expect(page.getByText('Coming soon')).toHaveCount(2);

    // South Africa to Lesotho crosses a border; no listed courier serves it yet.
    await caption(page, 'B12 · 4. Customs cleared by the courier, who is arranged after the order');
    await expect(orderSummary(page)).toContainText('Cleared by your courier');
    await expect(orderSummary(page)).toContainText('Arranged after you order');

    await page.getByRole('textbox', { name: 'Street address or plot number' }).fill('Kingsway, Maseru 100');
    await expect(page.getByRole('combobox', { name: 'City or town' })).toHaveValue('Maseru');
    await page.getByRole('radio', { name: /Visa \/ Mastercard/ }).check({ force: true });
    await expect(page.getByText('Total to pay').first().locator('xpath=following-sibling::*[1]')).toHaveText('ZAR 182.00');
    await caption(page, 'B12 · 5. Pay ZAR 182.00 by card');
    await clickAndSave(page.getByRole('button', { name: 'Place order' }).filter({ visible: true }));

    // 4. The card page, then back to the paid order, still in rand.
    await page.waitForURL(/.*mock-gateway.*/);
    await expect(page.getByText('ZAR 182.00')).toBeVisible();
    await page.getByRole('textbox', { name: 'Card number' }).fill('4242424242424242');
    await page.getByRole('button', { name: 'Pay' }).click();
    // The paid order page can take a minute to finish loading over Neon; its
    // content is what matters, and the checks below wait for that.
    await page.waitForURL(/\/orders\/o\d+\?placed=1/, { waitUntil: 'domcontentloaded' });
    await caption(page, 'B12 · 6. Paid, and the order is in rand');
    await expectHealthy(page);
    await expect(page.getByText('Payment confirmed')).toBeVisible();
    await expect(page.getByText('Total', { exact: true }).locator('xpath=following-sibling::*[1]')).toHaveText('ZAR 182.00');
  });
});

test.describe('B13. Local goods to a local buyer', () => {
  test.use(signedInAs('thabo'));

  test('B13 Botswana goods to a Gaborone buyer carry no customs and no courier @p1', async ({ page }) => {
    // Thabo delivers to Gaborone (the default); the cement is held in Botswana.
    await page.goto('/products/p006');
    await ready(page);
    await caption(page, 'B13 · 1. Cement held in Botswana, for a buyer in Gaborone');
    await expect(page.getByText('Customs cleared by courier')).toHaveCount(0);
    await addToCart(page, 'p006', 1);

    await page.goto('/checkout');
    await expect(page.getByRole('heading', { name: 'Confirm and pay' })).toBeVisible();
    await ready(page);
    await caption(page, 'B13 · 2. No border crossed: no customs row and no courier at checkout');
    await expect(page.getByRole('combobox', { name: 'Country' })).toHaveValue('BW');
    await expect(orderSummary(page)).not.toContainText('Customs & Duty');
    await expect(orderSummary(page)).not.toContainText('Courier');
  });
});
