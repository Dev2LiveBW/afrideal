import { clickAndSave, expect, test } from '../support/fixtures';

/**
 * Journeys that pass a seeded order between people (docs/testing/e2e-journeys.md).
 * They change seeded records, so they run once (desktop project), each on
 * its own order, and are not retried: a retry would meet the order the first
 * attempt already moved on.
 */
test.describe.configure({ retries: 0 });

test('F02 + B05 the runner delivers, then the buyer confirms it arrived @p1', async ({ as }) => {
  // sh006: Kagiso is carrying o006 (AFD-24815) from Motswedi to Kefilwe.
  const runner = await as('kagiso', 'phone');
  await runner.goto('/runner/jobs');
  const job = runner.locator('div').filter({ has: runner.getByText('Kefilwe Dithebe', { exact: true }) })
    .filter({ has: runner.getByRole('button', { name: 'Confirm delivered' }) }).last();
  await clickAndSave(job.getByRole('button', { name: 'Confirm delivered' }));
  await expect(runner.getByText('Delivery confirmed - nice work')).toBeVisible();
  await expect(runner.getByText('Kefilwe Dithebe', { exact: true })).toHaveCount(0);

  const buyer = await as('kefilwe');
  await buyer.goto('/orders/o006');
  await buyer.getByRole('button', { name: 'Confirm delivery' }).click();
  await clickAndSave(buyer.getByRole('dialog').getByRole('button', { name: 'Yes, it arrived' }));
  await expect(buyer.getByRole('button', { name: 'Confirm delivery' })).toHaveCount(0);
});

test('B05 a buyer confirms an order in transit arrived @p1', async ({ as }) => {
  // o007 (AFD-24816) is Thabo's, seeded in transit.
  const buyer = await as('thabo');
  await buyer.goto('/orders/o007');
  await buyer.getByRole('button', { name: 'Confirm delivery' }).click();
  await clickAndSave(buyer.getByRole('dialog').getByRole('button', { name: 'Yes, it arrived' }));
  await expect(buyer.getByRole('button', { name: 'Confirm delivery' })).toHaveCount(0);
  await buyer.goto('/orders');
  await expect(buyer.getByRole('link', { name: /AFD-24816/ })).toContainText('Delivered');
});

test('B06 a buyer reports a problem and the team sees it @p1', async ({ as }) => {
  // o009 (AFD-24818) is Thabo's, seeded processing with Highveld.
  const buyer = await as('thabo');
  await buyer.goto('/orders/o009');
  await buyer.getByRole('button', { name: 'Report a problem' }).click();
  const dialog = buyer.getByRole('dialog');
  await dialog.getByRole('textbox').fill('Two of the six units arrived cracked.');
  await clickAndSave(dialog.getByRole('button', { name: 'Report the problem' }));
  await expect(buyer.getByRole('button', { name: 'Report a problem' })).toHaveCount(0);

  const ops = await as('ops');
  await ops.goto('/admin/disputes');
  await expect(ops.getByRole('link', { name: 'AFD-24818' })).toBeVisible();
  await expect(ops.getByText('Two of the six units arrived cracked.')).toBeVisible();
});
