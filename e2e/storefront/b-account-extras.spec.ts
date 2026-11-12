import { caption, expect, expectHealthy, ready, signedInAs, test } from '../support/fixtures';

/**
 * B15 to B17: repeat buying and the account (spec 0011, docs/testing/e2e-journeys.md).
 * Runs at phone and desktop width. Reorder only reads, and the other two share a
 * buyer, so each width uses its own product and undoes what it changed.
 */

test.describe('B15. Reorder a delivered order', () => {
  test.use(signedInAs('kefilwe'));

  test('B15 a delivered order goes back in the cart at today\'s price @p1', async ({ page }) => {
    await caption(page, 'B15 · 1. A delivered order, with a map of the town');
    await page.goto('/orders/o004');
    await ready(page);
    const map = page.getByRole('link', { name: 'Open in Maps' });
    await expect(map).toHaveAttribute('href', /query=Francistown%2C%20Botswana$/);

    await caption(page, 'B15 · 2. Reorder names what it could not add');
    await page.getByRole('button', { name: 'Reorder' }).click();
    const notice = page.getByRole('status').filter({ hasText: 'Some items could not be added' });
    await expect(notice).toContainText('minimum order of 5');

    await caption(page, 'B15 · 3. The cart holds the rest, at today\'s price');
    await notice.getByRole('link', { name: 'Go to your cart' }).click();
    await page.waitForURL(/\/cart/);
    const cart = page.locator('main');
    await expect(cart).toContainText('White Maize Meal');
    await expect(cart).not.toContainText('A4 Copy Paper');
    await expectHealthy(page);
  });

  test('B15 an order not delivered offers no reorder @p1', async ({ page }) => {
    await page.goto('/orders/o012');
    await ready(page);
    await expect(page.getByRole('link', { name: 'Open in Maps' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reorder' })).toHaveCount(0);
  });
});

test.describe('B16. A heart saves an item', () => {
  test('B16 a guest signs in, comes back, and saves on the next tap @p1', async ({ page, as }, testInfo) => {
    const phone = testInfo.project.name === 'phone';
    const productId = phone ? 'p004' : 'p003';
    const heart = page.getByRole('button', { name: /(Save .* for later|Remove .* from your list)/ }).first();

    await caption(page, 'B16 · 1. A guest taps the heart and goes to sign in');
    await page.goto(`/products/${productId}`);
    await ready(page);
    await heart.click();
    await page.waitForURL(/\/sign-in\?redirect_url=/);

    await caption(page, 'B16 · 2. Back on the same page, and nothing saved yet');
    await page.getByRole('button', { name: /Thabo/ }).click();
    await page.waitForURL(new RegExp(`/products/${productId}$`));
    await ready(page);
    await expect(heart).toHaveAttribute('aria-pressed', 'false');

    await caption(page, 'B16 · 3. The tap after signing in saves it');
    const saved = page.waitForResponse(
      (response) => response.url().endsWith('/api/saved-items') && response.request().method() === 'POST',
    );
    await heart.click();
    expect((await saved).status()).toBe(201);
    await expect(heart).toHaveAttribute('aria-pressed', 'true');
    const name = (await page.getByRole('heading', { level: 1 }).textContent())!.trim();

    await caption(page, 'B16 · 4. Another device has it too, at today\'s price');
    const other = await as('thabo', phone ? 'phone' : 'desktop');
    await other.goto('/account/saved');
    await ready(other);
    const row = other.getByRole('listitem', { name });
    await expect(row).toContainText(/\d/);

    await caption(page, 'B16 · 5. Removing it clears the heart');
    await row.getByRole('button', { name: `Remove ${name}` }).click();
    await expect(row).toHaveCount(0);
    await page.reload();
    await expect(heart).toHaveAttribute('aria-pressed', 'false');
    await expectHealthy(other);
  });

  test.describe('The account panel', () => {
    test.use(signedInAs('thabo'));

    test('B16 Addresses, Saved items and Account settings are live, Payments is dimmed @p1', async ({ page }) => {
      await page.goto('/account/saved');
      await ready(page);
      for (const label of ['Addresses', 'Saved items', 'Account settings']) {
        await expect(page.getByRole('link', { name: label })).toBeVisible();
      }
      await expect(page.getByRole('link', { name: 'Payments' })).toHaveCount(0);
      await expect(page.getByText('Payments', { exact: true })).toBeVisible();
    });
  });
});

test.describe('B17. Alert settings', () => {
  test.use(signedInAs('kefilwe'));

  test('B17 offers and news are opt in, and the date is on record @p2', async ({ page }) => {
    await page.goto('/account/settings');
    await ready(page);
    const offers = page.getByRole('switch', { name: 'Offers and news' });

    await caption(page, 'B17 · 1. Order updates on, offers and news off');
    await expect(page.getByRole('switch', { name: 'Order updates by email' })).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByRole('switch', { name: 'Order updates by SMS' })).toHaveAttribute('aria-checked', 'true');

    // The two widths share this buyer, so start from off whichever ran first.
    if ((await offers.getAttribute('aria-checked')) === 'true') {
      await offers.click();
      await expect(offers).toHaveAttribute('aria-checked', 'false');
    }

    await caption(page, 'B17 · 2. Turning it on records the date, and it stays on');
    await offers.click();
    await expect(page.getByText(/You agreed on/)).toBeVisible();
    await page.reload();
    await expect(offers).toHaveAttribute('aria-checked', 'true');

    await caption(page, 'B17 · 3. Turning it off removes the date');
    await offers.click();
    await expect(page.getByText(/You agreed on/)).toHaveCount(0);
    await page.reload();
    await expect(offers).toHaveAttribute('aria-checked', 'false');
    await expectHealthy(page);
  });
});
