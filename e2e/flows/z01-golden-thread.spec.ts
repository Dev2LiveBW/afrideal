import { addToCart, card, clickAndSave, expect, ready, test } from '../support/fixtures';

/**
 * Z01. The golden thread: one order from cart to supplier paid, five people
 * (docs/testing/e2e-journeys.md).
 *
 * KNOWN GAP (2026-10-05): nothing in the app creates a shipment when a
 * supplier marks an order ready, so a new order never reaches a runner and
 * the thread stops at step 3. `test.fail()` keeps the suite green while the
 * gap stands; when someone builds the hand-off, this test "unexpectedly
 * passes", which is the signal to delete the `test.fail()` line and extend it
 * through steps 4 to 7 (runner delivers, buyer confirms, Finance settles,
 * Naledi sees it settled).
 */

test('Z01 one order from cart to the runner @p1', async ({ as }) => {
  test.fail(true, 'No code creates a shipment when an order is ready for collection, so no runner job appears.');

  const buyer = await as('thabo');
  const supplier = await as('naledi');
  const runner = await as('kagiso', 'phone');
  let reference = '';

  await test.step('1. Thabo buys two tubs of shea butter (Naledi carries it)', async () => {
    await addToCart(buyer, 'p001', 2);
    await buyer.goto('/checkout');
    await ready(buyer);
    await buyer.getByRole('textbox', { name: 'Street address or plot number' }).fill('Plot 5412, Extension 12');
    await clickAndSave(buyer.getByRole('button', { name: 'Place order' }));
    await buyer.waitForURL(/\/orders\/o\d+\?placed=1/);
    reference = (await buyer.getByRole('heading', { level: 1, name: /^AFD-\d+$/ }).textContent())!.trim();
  });

  await test.step('2. Naledi confirms, prepares and marks it ready for collection', async () => {
    await supplier.goto('/supplier/orders');
    const order = card(supplier, reference);
    for (const button of ['Confirm order', 'Start preparing', 'Mark ready for collection']) {
      await clickAndSave(order.getByRole('button', { name: button }));
      await expect(order.getByRole('button', { name: button })).toHaveCount(0);
    }
    await expect(order).toContainText('Ready for collection');
  });

  await test.step('3. A job for Thabo\'s order appears in Kagiso\'s pool', async () => {
    await runner.goto('/runner/jobs');
    await expect(runner.getByText('No jobs available right now')).toHaveCount(0, { timeout: 30_000 });
  });
});
