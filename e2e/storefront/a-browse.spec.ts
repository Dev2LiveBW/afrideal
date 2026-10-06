import { bwp, expect, expectHealthy, test } from '../support/fixtures';

/**
 * A. Browsing, no account (docs/testing/e2e-journeys.md).
 * Runs at phone and desktop width (the `phone` and `desktop` projects).
 */

test.describe('A. Browsing (no account)', () => {
  test('A01 home page loads and its links lead somewhere @p1', async ({ page, request }) => {
    await page.goto('/');
    await expectHealthy(page);
    await expect(page.getByRole('searchbox', { name: 'Search products' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Cart/ })).toBeVisible();

    // Every distinct page the home page links to answers (no 404, no 500).
    const hrefs = await page.locator('main a[href^="/"]').evaluateAll((links) =>
      [...new Set(links.map((a) => new URL((a as HTMLAnchorElement).href).pathname))],
    );
    expect(hrefs.length, 'the home page links to other pages').toBeGreaterThan(3);
    for (const href of hrefs) {
      const response = await request.get(href, { maxRedirects: 0 });
      expect(response.status(), `${href} answers`).toBeLessThan(400);
    }
  });

  test('A02 browse by category @p1', async ({ page }) => {
    await page.goto('/categories');
    await expectHealthy(page);
    await expect(page.getByRole('heading', { name: 'Categories', level: 1 })).toBeVisible();

    const category = page.locator('main a[href*="/browse?category="]').first();
    const href = await category.getAttribute('href');
    await category.click();
    await page.waitForURL((url) => url.search.includes(href!.split('?')[1]!));
    await expectHealthy(page);
    await expect(page.locator('main a[href^="/products/"]').first()).toBeVisible();
  });

  test('A03 a product page shows one landed price and lets you buy @p1', async ({ page }) => {
    await page.goto('/products/p001');
    await expectHealthy(page);
    await expect(page.getByRole('heading', { name: 'Shea Butter Deep Treatment 500ml', level: 1 })).toBeVisible();
    await expect(page.getByText('Price per unit')).toBeVisible();
    await expect(page.getByText(bwp(146)).first()).toBeVisible();
    const addToCart = page.getByRole('button', { name: 'Add to cart' });
    await expect(addToCart).toBeAttached();
    // On a phone the buy bar should be pinned to the bottom of the screen.
    if (test.info().project.name === 'phone') {
      test.fail(
        true,
        'KNOWN BUG: the phone page transition (components/motion/PageTransition.tsx) keeps will-change: transform on the page wrapper, so the "fixed" buy bar pins to the wrapper, about 3,600 px down the page, not to the screen.',
      );
      await expect(addToCart).toBeInViewport({ timeout: 10_000 });
    }
  });

  test('A04 the unit price steps down at 5, 20 and 50 units @p1', async ({ page }) => {
    await page.goto('/products/p001');
    const quantity = page.getByRole('spinbutton', { name: 'Quantity' });
    const lineTotal = page.getByText('Line total', { exact: true }).locator('xpath=..');

    // Retail 146, bulk 133 (5 to 19), wholesale 121 (20 to 49), wholesale+ 112 (50 to 99).
    for (const [qty, unit] of [
      [1, 146],
      [4, 146],
      [5, 133],
      [19, 133],
      [20, 121],
      [49, 121],
      [50, 112],
      [99, 112],
    ] as const) {
      await quantity.fill(String(qty));
      await expect(lineTotal, `${qty} units at ${unit}`).toContainText(bwp(qty * unit));
    }

    // 100 or more is priced by quotation, not added to the cart.
    await quantity.fill('100');
    await expect(page.getByRole('button', { name: 'Quotation required' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Request a quotation' }).first()).toBeVisible();
  });

  test('A05 the supplier list shows only verified suppliers', async ({ page }) => {
    await page.goto('/suppliers');
    await expectHealthy(page);
    await expect(page.getByText('Naledi Beauty Supplies').first()).toBeVisible();
    // Seeded as pending, pending and suspended.
    for (const hidden of ['Setlhoa Office Group', 'Tsholofelo Fresh Produce', 'Bokamoso Textiles']) {
      await expect(page.getByText(hidden)).toHaveCount(0);
    }
  });

  test('A06 how it works loads', async ({ page }) => {
    await page.goto('/how-it-works');
    await expectHealthy(page);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});

test.describe('H08. Supplier cost stays private', () => {
  test('H08 no supplier cost reaches a product page @p1', async ({ page }) => {
    await page.goto('/products/p001');
    const html = await page.content();
    expect(html).not.toMatch(/supplier_cost/);
    // Naledi buys p001 at BWP 82.00 (data/supplier-offers.json); the buyer must never see it.
    expect(await page.locator('body').innerText()).not.toContain(bwp(82));
  });
});
