import { addToCart, caption, clickAndSave, expect, expectHealthy, ready, runLabel, signedInAs, test } from '../support/fixtures';

test.describe('B14. A saved address in another country', () => {
  test.use(signedInAs('kefilwe'));

  test('B14 a buyer saves an address, sends there, and the order keeps its copy @p1', async ({ page }) => {
    // The paid order page can take a minute and a half over Neon, and this journey loads it twice.
    test.slow();
    const label = runLabel('Mum');

    await caption(page, 'B14 · 1. Checkout opens on the default address');
    await addToCart(page, 'p001', 1);
    await page.goto('/checkout');
    await expect(page.getByRole('heading', { name: 'Confirm and pay' })).toBeVisible();
    await ready(page);
    await expect(page.getByRole('combobox', { name: 'Saved address' })).toHaveValue('adr001');
    await expect(page.getByRole('textbox', { name: 'Street address or plot number' })).toHaveValue('Plot 2201, Block 6');
    await expect(page.getByRole('textbox', { name: /^Phone/ })).toHaveValue('+267 71 234 567');

    await caption(page, 'B14 · 2. Save an address in Lesotho');
    await page.goto('/account/addresses');
    await ready(page);
    await page.getByRole('button', { name: 'Add an address' }).click();
    await page.getByLabel('Label').fill(label);
    await page.getByLabel('Recipient').fill('Mma Dithebe');
    await page.getByLabel('Phone').fill('+266 2231 2345');
    await page.getByLabel('Country').selectOption({ label: 'Lesotho' });
    await page.getByLabel('City or town').fill('Maseru');
    await page.getByLabel('Street address or plot number').fill('Kingsway, Maseru 100');
    await clickAndSave(page.getByRole('button', { name: 'Save address' }));
    const saved = page.getByRole('article', { name: label });
    await expect(saved).toContainText('Mma Dithebe');

    await caption(page, 'B14 · 3. Pick it at checkout: the currency follows the country');
    await page.goto('/checkout');
    await ready(page);
    await page.getByRole('combobox', { name: 'Saved address' }).selectOption({ label: `${label}, Maseru` });
    await expect(page.getByRole('combobox', { name: 'Country' })).toHaveValue('LS');
    await expect(page.getByText('Total to pay').first().locator('xpath=following-sibling::*[1]')).toHaveText('ZAR 182.00');

    await caption(page, 'B14 · 4. Instructions, and terms are required');
    // Spec 0011, AC-7: the box stops at 300 characters, as the server does.
    await expect(page.getByRole('textbox', { name: /Delivery instructions/ })).toHaveAttribute('maxlength', '300');
    await page.getByRole('textbox', { name: /Delivery instructions/ }).fill('Blue gate, ring twice');
    await expect(page.getByRole('link', { name: 'terms of sale' })).toHaveAttribute('href', '/terms');
    await page.getByRole('button', { name: 'Place order' }).filter({ visible: true }).click();
    await expect(page.getByText('Please agree to the terms to place your order.')).toBeVisible();
    await page.getByRole('checkbox', { name: /I agree to the/ }).check();
    await clickAndSave(page.getByRole('button', { name: 'Place order' }).filter({ visible: true }));

    await caption(page, 'B14 · 5. Pay, and the order shows who it is for and the instructions');
    await page.waitForURL(/.*mock-gateway.*/);
    await page.getByRole('textbox', { name: 'Card number' }).fill('4242424242424242');
    await page.getByRole('button', { name: 'Pay' }).click();
    await page.waitForURL(/\/orders\/o\d+\?placed=1/, { waitUntil: 'domcontentloaded' });
    const orderUrl = page.url();
    await expect(page.getByText('For Mma Dithebe · +266 2231 2345')).toBeVisible();
    await expect(page.getByText('Blue gate, ring twice')).toBeVisible();

    await caption(page, 'B14 · 6. Deleting the address leaves the order as it was');
    await page.goto('/account/addresses');
    await ready(page);
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: `Delete ${label}` }).click();
    await expect(saved).toHaveCount(0);
    await page.goto(orderUrl);
    await ready(page);
    await expect(page.getByText('For Mma Dithebe · +266 2231 2345')).toBeVisible();
    await expectHealthy(page);
  });
});

test.describe('B14. The terms behind the checkbox', () => {
  test('B14 /terms is open to anyone and says it is a draft @p2', async ({ page }) => {
    // Spec 0011, AC-10: the wording checkout already used, marked as a draft.
    await page.goto('/terms');
    await ready(page);
    await expect(page.getByRole('heading', { name: 'Terms of sale' })).toBeVisible();
    await expect(page.getByText(/Draft/).first()).toBeVisible();
    await expect(page.getByText(/returns and refunds/).first()).toBeVisible();
    await expectHealthy(page);
  });
});
