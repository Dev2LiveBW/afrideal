import type { Page } from '@playwright/test';

import { addToCart, caption, card, clickAndSave, expect, ready, test } from '../support/fixtures';

/**
 * Z01. The golden thread: one order from cart to supplier paid, five people
 * (docs/testing/e2e-journeys.md). Thabo buys, Naledi prepares, Kagiso
 * collects and delivers, Thabo confirms (which settles Naledi's invoice),
 * Finance and Naledi see it paid.
 *
 * The runner job is opened by Naledi marking the order ready
 * (lib/shipments.ts); it pays the buyer's BWP 45 delivery fee, as this order
 * has one supplier.
 */

test.describe.configure({ retries: 0 }); // it moves real records; a retry would meet them moved

/** Kagiso's job for this order: Naledi to Thabo, paying BWP 45.00 (the seeded one pays 58.00). */
function newJob(runner: Page) {
  return runner
    .locator('div')
    .filter({ has: runner.getByText('Thabo Modise', { exact: true }) })
    .filter({ hasText: /45\.00/ })
    .filter({ has: runner.getByRole('button') })
    .last();
}

test('Z01 one order from cart to the supplier paid @p1', async ({ as }) => {
  // Five people and about a dozen saves, each 8 to 30 s from Botswana.
  test.setTimeout(10 * 60_000);
  const buyer = await as('thabo');
  const supplier = await as('naledi');
  const runner = await as('kagiso', 'phone');
  const finance = await as('finance');
  let reference = '';
  let orderPath = '';

  await test.step('1. Thabo buys two tubs of shea butter (Naledi carries it)', async () => {
    await caption(buyer, 'Z01 · 1. Thabo buys two tubs of shea butter');
    await addToCart(buyer, 'p001', 2);
    await buyer.goto('/checkout');
    await ready(buyer);
    await buyer.getByRole('textbox', { name: 'Street address or plot number' }).fill('Plot 5412, Extension 12');
    await clickAndSave(buyer.getByRole('button', { name: 'Place order' }));
    await buyer.waitForURL(/\/orders\/o\d+\?placed=1/);
    orderPath = new URL(buyer.url()).pathname;
    reference = (await buyer.getByRole('heading', { level: 1, name: /^AFD-\d+$/ }).textContent())!.trim();
  });

  await test.step('2. Naledi confirms, prepares and marks it ready for collection', async () => {
    await caption(supplier, `Z01 · 2. Naledi prepares ${reference} and marks it ready`);
    await supplier.goto('/supplier/orders');
    const order = card(supplier, reference);
    for (const button of ['Confirm order', 'Start preparing', 'Mark ready for collection']) {
      await clickAndSave(order.getByRole('button', { name: button }));
      await expect(order.getByRole('button', { name: button })).toHaveCount(0);
    }
    await expect(order).toContainText('Ready for collection');
  });

  await test.step('3. Kagiso accepts the job, collects it and delivers it', async () => {
    await caption(runner, `Z01 · 3. Kagiso collects ${reference} from Naledi and delivers it`);
    await runner.goto('/runner/jobs');

    // A job alert pops up over the list for each new job; take ours from it,
    // or close it and take ours from the list.
    const alert = runner.getByRole('dialog');
    let accepted = false;
    for (let shown = 0; shown < 3 && !accepted; shown++) {
      if (!(await alert.waitFor({ timeout: 8_000 }).then(() => true, () => false))) break;
      if ((await alert.innerText()).includes('Thabo Modise')) {
        await clickAndSave(alert.getByRole('button', { name: 'Accept', exact: true }));
        accepted = true;
      } else {
        await alert.getByRole('button', { name: 'Decline' }).click();
      }
    }
    if (!accepted) await clickAndSave(newJob(runner).getByRole('button', { name: 'Accept job' }));

    await clickAndSave(newJob(runner).getByRole('button', { name: 'Mark picked up' }));
    await buyer.goto(orderPath);
    await expect(buyer.getByText('In transit').first()).toBeVisible();

    await clickAndSave(newJob(runner).getByRole('button', { name: 'Start delivery' }));
    await clickAndSave(newJob(runner).getByRole('button', { name: 'Confirm delivered' }));
    await expect(runner.getByText('Delivery confirmed - nice work')).toBeVisible();
  });

  await test.step('4. Thabo confirms it arrived', async () => {
    await caption(buyer, `Z01 · 4. Thabo confirms ${reference} arrived`);
    await buyer.goto(orderPath);
    await buyer.getByRole('button', { name: 'Confirm delivery' }).click();
    await clickAndSave(buyer.getByRole('dialog').getByRole('button', { name: 'Yes, it arrived' }));
    await expect(buyer.getByRole('button', { name: 'Confirm delivery' })).toHaveCount(0);
  });

  await test.step("5. Thabo's confirmation released Naledi's payment; Finance sees it settled", async () => {
    // Confirming delivery settles the supplier invoice by itself (the confirm
    // dialog says so), so there is nothing left for Finance to settle.
    await caption(finance, `Z01 · 5. Finance sees Naledi's invoice for ${reference} settled`);
    await finance.goto('/admin/payables');
    await finance.getByRole('button', { name: /^All \(\d+\)$/ }).click();
    await expect(finance.getByRole('row', { name: new RegExp(`${reference}\\b`) }).first()).toContainText('Settled');
  });

  await test.step('6. Naledi sees the order delivered and her invoice settled', async () => {
    await caption(supplier, `Z01 · 6. Naledi sees ${reference} delivered and paid`);
    await supplier.goto('/supplier/orders');
    const order = card(supplier, reference);
    await expect(order).toContainText('Delivered');
    await expect(order).toContainText('Settled');
  });
});
