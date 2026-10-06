import { expect, test as setup } from '@playwright/test';

import { LANDING, PEOPLE, account, sessionFile, type Person } from './support/people';

setup.describe.configure({ mode: 'serial' });

/**
 * A dev server compiles each route on its first visit, and several first
 * visits at once can fail (the `useContext` burst in AGENTS.md, "Verifying
 * UI"). Visit every route once, one at a time, before any journey runs.
 */
const ROUTES = [
  '/', '/browse', '/categories', '/suppliers', '/how-it-works', '/products/p001', '/cart', '/checkout',
  '/orders', '/orders/o001', '/requests', '/request-a-runner', '/rfq', '/rfq/details', '/sign-in', '/after-sign-in',
  '/supplier/dashboard', '/supplier/orders', '/supplier/products', '/supplier/quotes', '/supplier/earnings',
  '/runner/dashboard', '/runner/jobs', '/runner/sourcing', '/runner/earnings',
  '/admin/dashboard', '/admin/orders', '/admin/orders/o001', '/admin/suppliers', '/admin/disputes',
  '/admin/payables', '/admin/analytics', '/admin/pricing', '/admin/settings', '/admin/runners',
  '/admin/sourcing', '/admin/products',
];

setup('warm up: compile every route once', async ({ request }) => {
  setup.setTimeout(15 * 60_000);
  for (const route of ROUTES) await request.get(route, { maxRedirects: 0, timeout: 180_000 });
});

/**
 * H02: each role lands on its own home after sign in.
 *
 * Signs every demo account in the way a person does, by clicking its card on
 * /sign-in, checks where it lands, and saves the session so the journeys can
 * act as that person without signing in again.
 */
for (const person of Object.keys(PEOPLE) as Person[]) {
  const who = account(person);

  setup(`H02 ${who.name} signs in with the demo card and lands on ${LANDING[who.role]}`, async ({ page }) => {
    await page.goto('/sign-in');
    await page.getByRole('button', { name: new RegExp(who.name) }).click();

    const landing = LANDING[who.role];
    await page.waitForURL((url) => url.pathname === landing, { timeout: 90_000 });
    await expect(page).toHaveURL(new RegExp(`${landing === '/' ? '/$' : landing}`));

    await page.context().storageState({ path: sessionFile(person) });
  });
}
