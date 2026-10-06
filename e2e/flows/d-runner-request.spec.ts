import { bwp, caption, card, clickAndSave, expect, runLabel, test } from '../support/fixtures';

/**
 * D01 to D05. Request a runner, from description to delivery
 * (docs/testing/e2e-journeys.md). Thabo on a laptop, Kagiso on his phone.
 * Every save waits for its answer before the other person looks.
 */

test('D01 to D05 a runner finds an item, the buyer approves the price, it arrives @p1', async ({ as }) => {
  const item = runLabel('Hooded salon dryer, 2-seat');
  const buyer = await as('thabo');
  const runner = await as('kagiso', 'phone');
  // Both screens show the step in progress (demo videos only).
  const say = (text: string) => Promise.all([caption(buyer, text), caption(runner, text)]);

  await test.step('D01 Thabo describes the item and sends it to the runners', async () => {
    await say('D01 Thabo describes the item and sends it to the runners');
    await buyer.goto('/request-a-runner');
    await buyer.getByRole('textbox', { name: 'What are you looking for?' }).fill(item);
    await buyer.getByRole('spinbutton', { name: 'How many' }).fill('2');
    await buyer.getByRole('textbox', { name: 'Town or city' }).fill('Gaborone');
    await buyer.getByRole('textbox', { name: 'Delivery address' }).fill('Plot 5412, Extension 12');
    await clickAndSave(buyer.getByRole('button', { name: 'Send to our runners' }));
    await buyer.waitForURL('**/requests');
    await expect(card(buyer, item, 'li')).toContainText('Waiting for a runner');
  });

  await test.step('D02 Kagiso takes it from the pool and goes looking', async () => {
    await say('D02 Kagiso takes it from the pool and goes looking');
    await runner.goto('/runner/sourcing');
    await runner.getByRole('button', { name: /^Open pool/ }).click();
    await clickAndSave(card(runner, item, 'li').getByRole('button', { name: 'Take this job' }));
    await runner.getByRole('button', { name: /^My requests/ }).click();
    await clickAndSave(card(runner, item, 'li').getByRole('button', { name: 'Start looking' }));
    await buyer.reload();
    await expect(card(buyer, item, 'li')).toContainText('Out looking');
  });

  await test.step('D03 Kagiso sends back a price: BWP 500 a unit, plus a 12% fee', async () => {
    await say('D03 Kagiso sends back a price: BWP 500 a unit, plus a 12% fee');
    const job = card(runner, item, 'li');
    await job.getByRole('button', { name: 'I found it' }).click();
    // "What did you find?" heads the form; Condition defaults to New.
    await job.getByLabel('Price per unit (BWP)').fill('500');
    await job.getByLabel('Where').fill('Broadhurst trade counter');
    await clickAndSave(job.getByRole('button', { name: 'Send for approval' }));

    await buyer.reload();
    const request = card(buyer, item, 'li');
    await expect(request).toContainText('Price found, needs your approval');
    // Goods 2 x 500 = 1,000; fee 12% = 120; total 1,120.
    await expect(request).toContainText(bwp(1120));
  });

  await test.step('D04 Thabo approves the price', async () => {
    await say('D04 Thabo approves the price');
    await card(buyer, item, 'li').getByRole('button', { name: 'Approve the price' }).click();
    await clickAndSave(buyer.getByRole('dialog').getByRole('button', { name: 'Yes, buy it' }));
    await expect(card(buyer, item, 'li')).toContainText('Approved, buying now');
  });

  await test.step('D05 Kagiso brings it, Thabo confirms it arrived', async () => {
    await say('D05 Kagiso brings it, Thabo confirms it arrived');
    await runner.reload();
    await clickAndSave(card(runner, item, 'li').getByRole('button', { name: 'Bought, on the way' }));
    await buyer.reload();
    await card(buyer, item, 'li').getByRole('button', { name: 'It arrived' }).click();
    await clickAndSave(buyer.getByRole('dialog').getByRole('button', { name: 'Yes, it arrived' }));
    const done = card(buyer, item, 'li');
    await expect(done).toContainText('Delivered');
    await expect(done.getByRole('button')).toHaveCount(0);
  });
});
