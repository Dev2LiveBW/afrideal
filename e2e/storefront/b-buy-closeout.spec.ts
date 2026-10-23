import { addToCart, bwp, caption, card, cartLink, clickAndSave, expect, expectHealthy, ready, runLabel, signedInAs, test } from '../support/fixtures';

/**
 * B. Buying and tracking - Phase 1 Close-out extensions.
 * Documents the new Phase 1 Close-out journeys mapped in docs/testing/e2e-journeys-phase1-closeout.md
 */

test.describe('B. Buying and tracking (Close-out)', () => {
  test.use(signedInAs('thabo'));

  test('B09 checkout with real card payment gateway @p1', async ({ page }) => {

    // 1. Add item to cart
    await caption(page, 'B09 · 1. Add product to the cart');
    await addToCart(page, 'p001', 1);

    // 2. Checkout
    await page.goto('/checkout');
    await expect(page.getByRole('heading', { name: 'Confirm and pay' })).toBeVisible();
    await ready(page);

    await caption(page, 'B09 · 2. Select Pay by Card and place order');
    await page.getByRole('textbox', { name: 'Street address or plot number' }).fill('Plot 1234, Gaborone');
    await page.getByRole('combobox', { name: 'City or town' }).fill('Gaborone');

    // Botswana's card method (spec 0009); cards go through DPO Pay.
    await page.getByRole('radio', { name: /Visa \/ Mastercard/ }).check({ force: true });
    
    // Place order should trigger the gateway redirect
    await clickAndSave(page.getByRole('button', { name: 'Place order' }));

    // 3. Gateway mock redirect
    await caption(page, 'B09 · 3. Redirected to payment gateway');
    await page.waitForURL(/.*mock-gateway.*/); // Expecting to leave our site for the gateway
    await page.getByRole('textbox', { name: 'Card number' }).fill('4242424242424242');
    await page.getByRole('button', { name: 'Pay' }).click();

    // 4. Return to confirmation page
    await caption(page, 'B09 · 4. Returned to order confirmation');
    await page.waitForURL(/\/orders\/o\d+\?placed=1/);
    await expectHealthy(page);
    await expect(page.getByText('Payment confirmed')).toBeVisible();
    
    // Verify timeline shows Paid
    const timeline = page.locator('main ol, main ul');
    await expect(timeline.getByText('Paid', { exact: true }).first()).toBeVisible();
  });
});

test.describe('B. Buying and tracking (Collection Point)', () => {
  test.use(signedInAs('kefilwe'));

  test('B10 checkout to a Collection Point @p1', async ({ page }) => {
    await caption(page, 'B10 · 1. Add product to the cart');
    await addToCart(page, 'p001', 1);

    await page.goto('/checkout');
    await ready(page);

    await caption(page, 'B10 · 2. Select Collection Point delivery');
    await page.getByRole('radio', { name: /Collection Point/ }).check();
    await page.getByRole('combobox', { name: 'Select location' }).selectOption('Gaborone Central Locker');
    
    await clickAndSave(page.getByRole('button', { name: 'Place order' }));

    // Mock payment gateway step
    await page.waitForURL(/.*mock-gateway.*/);
    await page.getByRole('textbox', { name: 'Card number' }).fill('4242424242424242');
    await page.getByRole('button', { name: 'Pay' }).click();

    await page.waitForURL(/\/orders\/o\d+\?placed=1/);
    await expectHealthy(page);
    
    await caption(page, 'B10 · 3. Confirm receipt shows locker address');
    await expect(page.getByText('Payment confirmed')).toBeVisible();
    await expect(page.getByText('Gaborone Central Locker')).toBeVisible();
  });
});

test.describe('B. Buying and tracking (Customs & Duty)', () => {
  test.use(signedInAs('thabo'));

  test('B11 customs on imported goods is cleared by the courier @p1', async ({ page }) => {
    // p018 is an imported item (ZA). Since 2026-10-21 its price carries no
    // customs: the buyer's courier clears it and charges in its fee (spec 0008).
    await page.goto('/products/p018');
    await caption(page, 'B11 · 1. Add imported product to cart (customs cleared by the courier)');
    await expect(page.getByText('Customs cleared by courier')).toBeVisible();
    await page.getByRole('button', { name: 'Add to cart' }).click();

    await page.goto('/checkout');
    await ready(page);

    await caption(page, 'B11 · 2. Checkout shows the Customs & Duty line, cleared by the courier');
    const orderSummary = page.getByRole('heading', { name: 'Order summary' }).locator('xpath=..');
    await expect(orderSummary).toContainText('Customs & Duty');
    await expect(orderSummary).toContainText('Cleared by your courier');
    // The courier's own fee is shown but paid to the courier, outside the total.
    await expect(orderSummary).toContainText(/not to AfriDeal, so it is\s+not in your total/);
  });
});

test.describe('C. Request for quotation (Chosen quote to order)', () => {
  test.use(signedInAs('kefilwe'));

  test('C04 chosen quote becomes an order and is paid by card @p1', async ({ page, as }) => {
    // 1. Submit fresh quotation request as buyer
    await page.goto('/');
    await ready(page);
    await caption(page, 'C04 · 1. Submit quotation request and receive supplier quote');
    const label = runLabel('C04 quotation');
    // Each of these is a save: give it the 90 s clickAndSave gives a click.
    const SAVE = 90_000;
    const createRes = await page.request.post('/api/rfqs', {
      timeout: SAVE,
      data: {
        product_id: 'p001',
        requested_quantity: 150,
        delivery_location: 'Gaborone Central',
        notes: label,
      },
    });
    expect(createRes.ok(), `create RFQ failed: ${await createRes.text()}`).toBeTruthy();
    const { rfq } = await createRes.json();

    // 2. Invited supplier quotes on the RFQ
    const naledi = await as('naledi');
    await naledi.goto('/supplier/dashboard');
    await ready(naledi);
    const quoteRes = await naledi.request.patch(`/api/rfqs/${rfq.id}`, {
      timeout: SAVE,
      data: {
        action: 'RESPOND',
        unit_price: 65,
        quantity: 150,
        lead_time_days: 5,
        minimum_order_quantity: 10,
      },
    });
    expect(quoteRes.ok(), `supplier quote failed: ${await quoteRes.text()}`).toBeTruthy();
    await naledi.close();

    // 3. Buyer accepts the quote (or staff selects), converting it into an order
    const acceptRes = await page.request.patch(`/api/rfqs/${rfq.id}`, {
      timeout: SAVE,
      data: { action: 'ACCEPT_QUOTE', customer_unit_price: 85, payment_method: 'DPO_PAY' },
    });
    expect(acceptRes.ok(), `accept quote failed: ${await acceptRes.text()}`).toBeTruthy();
    const { order, rfq: updatedRfq } = await acceptRes.json();
    expect(updatedRfq.status).toBe('ORDERED');
    expect(order.id).toBeTruthy();
    expect(order.status).toBe('AWAITING_PAYMENT');

    // 4. Buyer opens their orders list
    await caption(page, 'C04 · 2. Order appears in buyer orders list awaiting payment');
    await page.goto('/orders');
    await ready(page);
    await expect(page.getByRole('link', { name: new RegExp(order.reference) }).first()).toBeVisible();

    // 5. Open the order receipt
    await caption(page, 'C04 · 3. Open quotation order and proceed to card payment');
    await page.goto(`/orders/${order.id}`);
    await expectHealthy(page);
    await expect(page.getByText('Waiting for your payment')).toBeVisible();
    // In main: the search box's placeholder ticker can show the same name.
    await expect(page.locator('main').getByText('Shea Butter Deep Treatment 500ml')).toBeVisible();

    // 6. Pay via card gateway
    await page.getByRole('button', { name: 'Try paying again' }).click();
    await caption(page, 'C04 · 4. Redirected to payment gateway');
    await page.waitForURL(/.*mock-gateway.*/);
    await page.getByRole('textbox', { name: 'Card number' }).fill('4242424242424242');
    await page.getByRole('button', { name: 'Pay' }).click();

    // 7. Returned with payment confirmed
    await caption(page, 'C04 · 5. Returned to order receipt with payment confirmed');
    await page.waitForURL(/\/orders\/o\d+\?placed=1/);
    await expectHealthy(page);
    await expect(page.getByText('Payment confirmed')).toBeVisible();
  });
});

test.describe('F. Runner deliveries (Collection Point)', () => {
  test.use(signedInAs('kefilwe'));

  test('F04 runner delivers to a Collection Point and buyer confirms collection @p1', async ({ page, as, isMobile }) => {
    test.skip(isMobile, 'Multi-role relay flow runs once under desktop project');
    // Three people and about ten saves, each 2 to 30 s from Botswana: the
    // default 3 minutes ran out during the locker drop-off (2026-10-13).
    test.setTimeout(10 * 60_000);
    // Not Gaborone Central: B10 orders there and E02 may mark that order ready,
    // and the runner's job cards carry no order reference to tell them apart.
    const LOCKER = 'Francistown Main Mall Locker';

    // 1. Kefilwe places an order to a Collection Point
    await caption(page, 'F04 · 1. Kefilwe orders with Collection Point delivery');
    await addToCart(page, 'p001', 1);
    await page.goto('/checkout');
    await expect(page.getByRole('heading', { name: 'Confirm and pay' })).toBeVisible();
    await ready(page);

    await page.getByRole('radio', { name: /Collection Point/ }).check();
    await page.getByRole('combobox', { name: 'Select location' }).selectOption(LOCKER);
    await clickAndSave(page.getByRole('button', { name: 'Place order' }));

    // Mock payment gateway step
    await page.waitForURL(/.*mock-gateway.*/);
    await page.getByRole('textbox', { name: 'Card number' }).fill('4242424242424242');
    await page.getByRole('button', { name: 'Pay' }).click();

    await page.waitForURL(/\/orders\/o\d+\?placed=1/);
    await expectHealthy(page);
    const orderUrl = page.url();
    const orderIdMatch = orderUrl.match(/\/orders\/(o\d+)/);
    const orderId = orderIdMatch ? orderIdMatch[1] : '';
    expect(orderId).toBeTruthy();

    const reference = (await page.getByRole('heading', { level: 1, name: /^AFD-\d+$/ }).textContent())!.trim();
    expect(reference).toBeTruthy();

    // 2. Supplier (Naledi) prepares the order and marks it ready for collection
    const supplier = await as('naledi');
    await caption(supplier, `F04 · 2. Naledi prepares ${reference} and marks it ready for runner`);
    await supplier.goto('/supplier/orders');
    await ready(supplier);

    const supOrderCard = card(supplier, reference);
    await expect(supOrderCard).toBeVisible();
    for (const button of ['Confirm order', 'Start preparing', 'Mark ready for collection']) {
      await clickAndSave(supOrderCard.getByRole('button', { name: button }));
      await expect(supOrderCard.getByRole('button', { name: button })).toHaveCount(0);
    }
    await expect(supOrderCard).toContainText('Ready for collection');
    await supplier.close();

    // 3. Runner (Kagiso) accepts the job, collects, and drops off at locker
    const runner = await as('kagiso', 'phone');
    await caption(runner, `F04 · 3. Kagiso accepts job for ${reference} and collects it`);
    await runner.goto('/runner/jobs');
    await ready(runner);

    // Accept via modal or list
    const alertModal = runner.getByRole('dialog');
    let accepted = false;
    for (let attempt = 0; attempt < 3 && !accepted; attempt++) {
      if (await alertModal.waitFor({ timeout: 5000 }).then(() => true, () => false)) {
        const text = await alertModal.innerText();
        if (text.includes(LOCKER)) {
          await clickAndSave(alertModal.getByRole('button', { name: 'Accept' }));
          accepted = true;
          break;
        } else {
          await alertModal.getByRole('button', { name: 'Decline' }).click();
          await alertModal.waitFor({ state: 'detached', timeout: 3000 }).catch(() => {});
        }
      }
    }

    if (!accepted) {
      if (await alertModal.isVisible()) {
        await alertModal.getByRole('button', { name: 'Decline' }).click();
        await alertModal.waitFor({ state: 'detached', timeout: 3000 }).catch(() => {});
      }
      const availableJob = runner.locator('.shadow-card').filter({ has: runner.getByText(LOCKER) })
        .filter({ has: runner.getByRole('button', { name: 'Accept job' }) }).first();
      await clickAndSave(availableJob.getByRole('button', { name: 'Accept job' }));
    }

    // Active job progress: Mark picked up -> Start delivery
    const activeJob = runner.locator('.shadow-card').filter({ has: runner.getByText('Active job') })
      .filter({ has: runner.getByText(LOCKER) }).first();
    await expect(activeJob).toBeVisible();

    const dismissAnyAlert = async () => {
      if (await alertModal.isVisible()) {
        await alertModal.getByRole('button', { name: 'Decline' }).click().catch(() => {});
        await alertModal.waitFor({ state: 'detached', timeout: 3000 }).catch(() => {});
      }
    };

    await dismissAnyAlert();
    await clickAndSave(activeJob.getByRole('button', { name: 'Mark picked up' }));
    await dismissAnyAlert();
    await clickAndSave(activeJob.getByRole('button', { name: 'Start delivery' }));

    // 4. Runner enters locker PIN and drops off at collection point
    await caption(runner, 'F04 · 4. Kagiso enters locker PIN and drops off at collection point');
    await expect(activeJob.getByText('Smart Locker Drop-off')).toBeVisible();
    await activeJob.locator('#locker-code').fill('LCK-7711');
    await clickAndSave(activeJob.getByRole('button', { name: 'Drop off at Collection Point' }));
    await expect(runner.getByText(/Dropped off at locker|nice work/i)).toBeVisible();
    await runner.close();

    // 5. Buyer opens their order page, verifies Ready for collection and Locker PIN, confirms collection
    await caption(page, 'F04 · 5. Kefilwe sees Ready for collection with PIN and confirms collection');
    await page.goto(`/orders/${orderId}`);
    await ready(page);
    await expect(page.getByText('Ready for collection').first()).toBeVisible();
    await expect(page.getByText('LCK-7711')).toBeVisible();

    // Confirm collection
    await page.getByRole('button', { name: /Confirm collection|Confirm delivery/ }).click();
    const confirmModal = page.getByRole('dialog');
    await expect(confirmModal).toBeVisible();
    await clickAndSave(confirmModal.getByRole('button', { name: /Yes, I collected it|Yes, it arrived/ }));

    // Verified complete
    await caption(page, 'F04 · 6. Order is complete and supplier invoice settled');
    await expect(page.getByText('Order complete')).toBeVisible();
  });
});

test.describe('Z. The golden thread (Mobile Parity)', () => {
  test.use(signedInAs('thabo'));

  test('Z02 mobile golden thread shopping journey @p1', async ({ page }) => {
    // 1. Home page & category browsing
    await caption(page, 'Z02 · 1. Home page and category browsing');
    await page.goto('/');
    await ready(page);

    // Assert phone viewport clean fit (Alibaba benchmark)
    const homeScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const viewportWidth = page.viewportSize()?.width ?? 390;
    expect(homeScrollWidth).toBeLessThanOrEqual(viewportWidth + 2);

    // Open categories browser
    await page.getByRole('link', { name: /Categories|Browse by category/i }).first().click();
    await ready(page);
    await expect(page.getByRole('heading', { name: 'Categories' })).toBeVisible();

    // Select category and product
    await caption(page, 'Z02 · 2. Browse category and select product');
    await page.getByRole('button', { name: /Beauty & personal care/i }).click();
    await page.getByRole('link', { name: /Shea Butter/i }).first().click();
    await page.waitForURL(/\/products\/p001/);
    await ready(page);

    // 2. Sticky mobile buy bar
    await caption(page, 'Z02 · 3. Sticky mobile buy bar: add product to cart');
    const productScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(productScrollWidth).toBeLessThanOrEqual(viewportWidth + 2);

    const addToCartBtn = page.getByRole('button', { name: 'Add to cart' });
    await expect(addToCartBtn).toBeVisible();
    await addToCartBtn.click();
    await expect(page.getByText(/added to cart/i)).toBeVisible();

    // 3. Slide-up cart sheet
    await caption(page, 'Z02 · 4. Slide-up cart sheet: view items and checkout');
    const viewCartBtn = page.getByRole('button', { name: 'View cart' });
    await expect(viewCartBtn).toBeVisible();
    await viewCartBtn.click();

    const cartSheet = page.getByRole('dialog', { name: 'Your cart' });
    await expect(cartSheet).toBeVisible();
    await expect(cartSheet.getByText(/Shea Butter/i)).toBeVisible();
    await expect(cartSheet.getByText(/Total/i)).toBeVisible();

    // Proceed to checkout from the slide-up cart sheet
    await cartSheet.getByRole('button', { name: 'Proceed to checkout' }).click();
    await page.waitForURL(/\/checkout/);
    await ready(page);

    // 4. Phone checkout
    await caption(page, 'Z02 · 5. Phone checkout: delivery details and card selection');
    await expect(page.getByRole('heading', { name: 'Confirm and pay' })).toBeVisible();
    const checkoutScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(checkoutScrollWidth).toBeLessThanOrEqual(viewportWidth + 2);

    await page.getByRole('textbox', { name: 'Street address or plot number' }).fill('Plot 8841, Village');
    await page.getByRole('combobox', { name: 'City or town' }).fill('Gaborone');
    await page.getByRole('radio', { name: /Visa \/ Mastercard/ }).check({ force: true });

    // Place order
    await clickAndSave(page.getByRole('button', { name: 'Place order' }).filter({ visible: true }));

    // 5. Card payment gateway
    await caption(page, 'Z02 · 6. Mock card gateway payment');
    await page.waitForURL(/.*mock-gateway.*/);
    await page.getByRole('textbox', { name: 'Card number' }).fill('4242424242424242');
    await page.getByRole('button', { name: 'Pay' }).click();

    // 6. Order confirmation and tracking
    await caption(page, 'Z02 · 7. Payment confirmed and order tracking');
    await page.waitForURL(/\/orders\/o\d+\?placed=1/);
    await expectHealthy(page);
    await expect(page.getByText('Payment confirmed')).toBeVisible();

    const orderScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(orderScrollWidth).toBeLessThanOrEqual(viewportWidth + 2);

    const timeline = page.locator('main ol, main ul');
    await expect(timeline.getByText('Paid', { exact: true }).first()).toBeVisible();
  });
});

