import { addToCart, bwp, caption, cartLink, clickAndSave, expect, expectHealthy, ready, signedInAs, test } from '../support/fixtures';

/**
 * B. Buying and tracking (docs/testing/e2e-journeys.md), as Thabo.
 * Runs at phone and desktop width. Each run makes its own order, so the two
 * sizes never step on each other; journeys that change seeded orders (B05,
 * B06) live in e2e/flows and run once.
 */

test.describe('B01. Old sign-in links', () => {
  test('B01 /login and /signup lead to the Clerk pages @p1', async ({ page }) => {
    await page.goto('/signup');
    await expect(page).toHaveURL(/\/sign-up/);
    await page.goto('/login');
    await expect(page).toHaveURL(/\/sign-in/);
    await expect(page.getByRole('button', { name: /Thabo Modise/ })).toBeVisible();
  });
});

test.describe('B. Buying and tracking', () => {
  test.use(signedInAs('thabo'));

  test('B02 add to cart, check out, get an order reference @p1', async ({ page }) => {
    // 1. Two of p001 at the retail price, BWP 146.00 each.
    await caption(page, 'B02 · 1. Add two tubs of shea butter to the cart');
    await addToCart(page, 'p001', 2);

    // 2. The cart: 292.00 plus a flat 45.00 delivery.
    await page.goto('/cart');
    await caption(page, 'B02 · 2. The cart: BWP 292.00 plus a flat BWP 45.00 delivery');
    // The heading counts units, not lines.
    await expect(page.getByRole('heading', { name: /Your cart \(2\)/ })).toBeVisible();
    // A desktop shows an "Order summary" panel; a phone shows the line and a
    // Total bar. Both show the line total and the total with delivery.
    const cart = page.locator('main');
    await expect(cart).toContainText(bwp(292));
    await expect(cart).toContainText(bwp(337));
    if (test.info().project.name === 'desktop') {
      await expect(page.getByRole('heading', { name: 'Order summary' }).locator('xpath=..')).toContainText(bwp(45));
    }

    // 3 to 6. Checkout.
    await page.getByRole('link', { name: 'Checkout' }).click();
    await expect(page.getByRole('heading', { name: 'Confirm and pay' })).toBeVisible();
    await ready(page);
    await caption(page, 'B02 · 3. Delivery address and payment method, then Place order (no money moves yet)');
    await page.getByRole('textbox', { name: 'Street address or plot number' }).fill('Plot 5412, Extension 12');
    await page.getByRole('textbox', { name: 'City or town' }).fill('Gaborone');
    await expect(page.getByRole('radio', { name: /DPO Pay/ })).toBeChecked();
    await expect(page.getByText('Total to pay').locator('xpath=following-sibling::*[1]')).toHaveText(bwp(337));
    await clickAndSave(page.getByRole('button', { name: 'Place order' }));

    // The confirmation: a reference, the right sums, no money taken yet (simulated).
    await page.waitForURL(/\/orders\/o\d+\?placed=1/);
    await caption(page, 'B02 · 4. Order confirmed, with its AFD reference and timeline');
    await expectHealthy(page);
    await expect(page.getByText('Order confirmed')).toBeVisible();
    const reference = (await page.getByRole('heading', { level: 1, name: /^AFD-\d+$/ }).textContent())!.trim();
    await expect(page.getByText('Total', { exact: true }).locator('xpath=following-sibling::*[1]')).toHaveText(bwp(337));
    await expect(page.getByText('Plot 5412, Extension 12')).toBeVisible();

    // The new order is at the top of the order list, and the cart is empty.
    await page.goto('/orders');
    await expect(page.getByRole('link', { name: new RegExp(reference) }).first()).toBeVisible();
    await expect(page.locator('main li').first()).toContainText(reference);
    await expect(cartLink(page)).toHaveAttribute('aria-label', 'Cart, 0 items');
  });

  test('B04 an order shows its progress on a timeline @p1', async ({ page }) => {
    // o005 (AFD-24814) is seeded in transit.
    await page.goto('/orders/o005');
    await expectHealthy(page);
    await expect(page.getByRole('heading', { level: 1, name: 'AFD-24814' })).toBeVisible();
    for (const step of ['Placed', 'Paid', 'Preparing', 'Collected', 'In transit', 'Delivered']) {
      await expect(page.locator('main ol, main ul').getByText(step, { exact: true }).first()).toBeVisible();
    }
  });

  test('B08 an empty cart cannot be checked out', async ({ page }) => {
    await page.goto('/checkout');
    await expect(page.getByText('There is nothing to check out')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Place order' })).toHaveCount(0);
  });
});

test.describe('C01. Request a quotation', () => {
  test.use(signedInAs('thabo'));

  test('C01 a buyer asks suppliers to quote for 150 units @p1', async ({ page }) => {
    // When the phone buy bar is pinned (z-[60]) it covers this dialog (z-50)
    // and blocks "Send request". Today the bar is not pinned at all (Findings
    // 5), so this passes; once 5 is fixed, expect it to fail here (Findings 6).
    await page.goto('/products/p001');
    await page.getByRole('spinbutton', { name: 'Quantity' }).fill('150');
    await page.getByRole('button', { name: 'Request a quotation' }).first().click();

    const dialog = page.getByRole('dialog', { name: 'Request a quotation' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel('Quantity')).toHaveValue('150');
    await dialog.getByLabel('Delivery location').fill('Gaborone');
    await clickAndSave(dialog.getByRole('button', { name: 'Send request' }));

    await expect(dialog.getByRole('heading', { name: 'Quotation requested' })).toBeVisible();
    await expect(dialog).toContainText(/Reference\s+\S+/);
  });
});
