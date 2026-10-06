import { expect, test as base, type Browser, type Locator, type Page, type TestInfo } from '@playwright/test';

import { account, sessionFile, type Person } from './people';

/**
 * Shared helpers for the journeys in docs/testing/e2e-journeys.md.
 *
 * - `as(person, size?)` opens a second, third... browser as another demo
 *   account, for journeys that pass work between people (Z01, D01 to D05).
 * - `card(...)` scopes clicks to one order or request, so a journey never
 *   presses a button that belongs to the next card down.
 * - `expectHealthy(page)` is the check every screen gets: no error screen and
 *   no garbled characters.
 */

const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1440, height: 900 };

type Size = 'phone' | 'desktop';

async function openAs(browser: Browser, testInfo: TestInfo, person: Person, size: Size): Promise<Page> {
  const phone = size === 'phone';
  const demo = process.env.E2E_DEMO === '1';
  const viewport = phone ? PHONE : DESKTOP;

  const context = await browser.newContext({
    baseURL: testInfo.project.use.baseURL,
    storageState: sessionFile(person),
    viewport,
    isMobile: phone,
    hasTouch: phone,
    deviceScaleFactor: phone ? 3 : 1,
    // In demo mode every person's screen is recorded as its own video.
    recordVideo: demo ? { dir: testInfo.outputPath(`video-${person}`), size: phone ? PHONE : { width: 1280, height: 800 } } : undefined,
  });
  context.setDefaultNavigationTimeout(90_000);
  const page = instrument(await context.newPage(), testInfo);
  speaker.set(page, account(person).name);
  return page;
}

/*
 * Captions for the demo videos (npm run e2e:demo). Each recorded screen
 * carries a bar along the top: who is acting, the journey, and the step.
 * Outside demo mode `caption` does nothing.
 */
const demoMode = process.env.E2E_DEMO === '1';
const captions = new WeakMap<Page, string>();
const speaker = new WeakMap<Page, string>();

async function renderCaption(page: Page) {
  const text = captions.get(page);
  if (!text || page.isClosed()) return;
  const who = speaker.get(page);
  await page
    .evaluate(
      ({ text, who }) => {
        // Drawn inside a closed shadow root: Playwright's locators cannot see
        // into one, so a caption is never mistaken for the page's own text.
        const w = window as unknown as { __e2eCaption?: HTMLElement };
        if (!w.__e2eCaption || !w.__e2eCaption.isConnected) {
          const host = document.createElement('div');
          host.setAttribute('aria-hidden', 'true');
          Object.assign(host.style, { position: 'fixed', top: '0', left: '0', right: '0', zIndex: '2147483647', pointerEvents: 'none' });
          const bar = document.createElement('div');
          Object.assign(bar.style, {
            padding: '10px 14px', background: 'rgba(17, 24, 20, 0.88)',
            color: '#fff', font: '600 14px/1.35 system-ui, sans-serif', letterSpacing: '0.01em',
          });
          host.attachShadow({ mode: 'closed' }).appendChild(bar);
          document.documentElement.appendChild(host);
          w.__e2eCaption = bar;
        }
        w.__e2eCaption.textContent = who ? `${who}  ·  ${text}` : text;
      },
      { text, who },
    )
    .catch(() => {});
}

/** Show `text` on this person's recorded screen (demo mode only). */
export async function caption(page: Page, text: string) {
  if (!demoMode) return;
  captions.set(page, text);
  await renderCaption(page);
}

/**
 * Two things every page in a journey gets:
 *
 * - `goto` and `reload` wait until the network is idle, so the first click
 *   lands after React has hydrated the page. Before hydration a click does
 *   nothing at all, and "Add to cart" or "Place order" look broken.
 * - Every save (a non-GET call to /api) is timed and listed on the test in
 *   the report. From Botswana a save is several sequential round trips to
 *   Neon in Ohio, so this is where slowness shows up first.
 */
function instrument(page: Page, testInfo: TestInfo): Page {
  const goto = page.goto.bind(page);
  const reload = page.reload.bind(page);
  page.goto = (url, options) => goto(url, { waitUntil: 'networkidle', ...options });
  page.reload = (options) => reload({ waitUntil: 'networkidle', ...options });

  page.on('requestfinished', async (request) => {
    const url = new URL(request.url());
    if (request.method() === 'GET' || !url.pathname.startsWith('/api/')) return;
    const status = (await request.response())?.status() ?? 0;
    const seconds = (request.timing().responseEnd / 1000).toFixed(1);
    testInfo.annotations.push({ type: 'save', description: `${request.method()} ${url.pathname} -> ${status} in ${seconds}s` });
  });
  page.on('requestfailed', (request) => {
    const url = new URL(request.url());
    if (!url.pathname.startsWith('/api/')) return;
    testInfo.annotations.push({ type: 'save', description: `${request.method()} ${url.pathname} -> no answer (${request.failure()?.errorText})` });
  });

  if (demoMode) {
    // Every recording opens on the journey's name, and keeps its caption
    // across page loads.
    captions.set(page, testInfo.title.replace(/\s*@\w+/g, ''));
    page.on('domcontentloaded', () => void renderCaption(page));
  }
  return page;
}

export const test = base.extend<{ as: (person: Person, size?: Size) => Promise<Page> }>({
  page: async ({ page }, use, testInfo) => {
    await use(instrument(page, testInfo));
  },

  as: async ({ browser }, use, testInfo) => {
    const opened: { person: Person; page: Page }[] = [];
    await use(async (person, size = 'desktop') => {
      const page = await openAs(browser, testInfo, person, size);
      opened.push({ person, page });
      return page;
    });
    for (const { person, page } of opened) {
      const video = page.video();
      await page.context().close();
      // List each person's recording on the test, so scripts/demo-videos.mjs
      // can name it after the journey and the person.
      if (video) await testInfo.attach(`video-${person}`, { path: await video.path(), contentType: 'video/webm' });
    }
  },
});

export { expect };

/** Run each journey as this person (their saved session from auth.setup.ts). */
export function signedInAs(person: Person) {
  return { storageState: sessionFile(person) };
}

/**
 * The card (`section`, `li` or `article`) that holds a heading, for scoping
 * clicks to one order or request.
 */
export function card(page: Page, heading: string | RegExp, tag: 'section' | 'li' | 'article' = 'section'): Locator {
  return page.getByRole('heading', { name: heading }).locator(`xpath=ancestor::${tag}[1]`);
}

/** No error screen, no mojibake (a UTF-8 dot read as Latin-1 shows as "Â·"). */
export async function expectHealthy(page: Page) {
  await expect(page.getByRole('heading', { name: 'We could not finish loading this.' })).toHaveCount(0);
  const text = await page.locator('body').innerText();
  expect(text, 'garbled characters on the page').not.toMatch(/Â[·©®°]|â€/);
}

/**
 * Wait until the page is interactive. A click that lands before React has
 * hydrated the page does nothing at all, which reads as a broken button.
 */
export async function ready(page: Page) {
  await page.waitForLoadState('networkidle');
}

/** Put `qty` of a product in the cart, and wait until the header counts it. */
export async function addToCart(page: Page, productId: string, qty: number) {
  await page.goto(`/products/${productId}`);
  await ready(page);
  await page.getByRole('spinbutton', { name: 'Quantity' }).fill(String(qty));
  await page.getByRole('button', { name: 'Add to cart' }).click();
  await expect(cartLink(page)).toHaveAttribute('aria-label', /^Cart, [1-9]\d* items?$/);
}

/**
 * The header's cart link, which carries the count in its label ("Cart, 2
 * items"). It is hidden on a phone, where the bottom tab bar shows the cart,
 * so check its label rather than its visibility.
 */
export function cartLink(page: Page): Locator {
  return page.locator('a[href="/cart"][aria-label^="Cart, "]').first();
}

/**
 * Click something that saves, and wait for the save to answer.
 *
 * From Botswana a save takes seconds (see `instrument`). Reloading or moving
 * on before it answers cancels it, and checking another person's screen
 * before it lands reads stale data, so every save in a journey goes through
 * here. Fails loudly if the server refuses the save.
 */
export async function clickAndSave(target: Locator) {
  const page = target.page();
  const saved = page.waitForResponse(
    (response) => response.url().includes('/api/') && response.request().method() !== 'GET',
    { timeout: 90_000 },
  );
  await target.click();
  const response = await saved;
  expect(response.status(), `${response.request().method()} ${new URL(response.url()).pathname} succeeds`).toBeLessThan(400);
}

/** Pula as the app prints it: "BWP 1,234.00". */
export function bwp(amount: number): string {
  return `BWP ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** A label unique to this run, so a journey finds the record it just made. */
export function runLabel(prefix: string): string {
  return `${prefix} ${Date.now().toString(36)}`;
}
