/**
 * Fetch real product photography.
 *
 *   1. put a key in .env.local (never paste it into a chat transcript):
 *        PEXELS_API_KEY=...        https://www.pexels.com/api/
 *      or
 *        UNSPLASH_ACCESS_KEY=...   https://unsplash.com/developers
 *
 *   2. npm run images
 *
 * Downloads land in public/products and data/product-images.json is rewritten
 * to point at them. Anything that fails keeps its gradient swatch, so a partial
 * run degrades rather than breaking the storefront.
 *
 * Both licences permit commercial use without attribution. Provenance is still
 * recorded per file in public/products/CREDITS.json, because a client demo
 * should be able to answer "where did this picture come from".
 *
 * Nothing here is trusted blindly: the run prints every query and result so the
 * images can be eyeballed afterwards, and `npm run images -- --only p004` will
 * re-fetch a single product whose photo turned out to be wrong.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'data');
const OUT = path.join(ROOT, 'public', 'products');

// ─── Key ─────────────────────────────────────────────────────────────────────

async function loadEnv() {
  try {
    const raw = await fs.readFile(path.join(ROOT, '.env.local'), 'utf8');
    for (const line of raw.split('\n')) {
      const match = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim();
    }
  } catch {
    // No .env.local is fine if the variables are already exported.
  }
}

await loadEnv();

const PEXELS = process.env.PEXELS_API_KEY;
const UNSPLASH = process.env.UNSPLASH_ACCESS_KEY;

if (!PEXELS && !UNSPLASH) {
  console.error(`
No image API key found.

Add one line to afrideal/.env.local and run this again:

  PEXELS_API_KEY=your-key-here        (free: https://www.pexels.com/api/)

or

  UNSPLASH_ACCESS_KEY=your-key-here   (free: https://unsplash.com/developers)

.env.local is gitignored, so the key stays off the repo.
`);
  process.exit(1);
}

const PROVIDER = PEXELS ? 'pexels' : 'unsplash';

// ─── Search queries ──────────────────────────────────────────────────────────

/**
 * Queries are written for what the picture must SHOW, not for the product name.
 * "Shea Butter Deep Treatment 500ml" returns nothing useful; "shea butter jar
 * cosmetic" returns the shelf item. Each entry lists fallbacks, tried in order
 * until one returns a usable landscape photo.
 */
/**
 * Two rules learned from the first run, both the hard way.
 *
 * Prefer product-only framing. A photo of the goods on a surface reads as a
 * catalogue listing; a model using them reads as an advert and dates fast.
 *
 * Where people are unavoidable, anchor the query to Africa. This is a Botswana
 * marketplace shown to Botswana buyers, and the unanchored queries returned
 * East Asian schoolchildren for the uniform and a white model with pink
 * cornrows for the braiding hair. Both are the kind of mismatch a client
 * notices in the first ten seconds. Adding "african" fixed it, which is how the
 * agriculture category ended up with a genuine West African grain market.
 */
const PRODUCT_QUERIES = {
  p001: ['shea butter jar cosmetic', 'body butter cream jar', 'cosmetic jar cream'],
  p002: ['braids', 'african hair', 'hairdresser braiding'],
  p003: ['argan oil serum bottle', 'hair oil serum dropper', 'cosmetic oil bottle'],
  p004: ['solar power bank charger', 'portable power bank', 'solar charger device'],
  // Avoid the default earbud result: it is unmistakably a competitor's branded
  // product, which is a trademark problem on a listing rather than a taste one.
  p005: ['black wireless earphones', 'bluetooth headphones product', 'earphones'],
  p006: ['cement bags construction', 'cement bag stack', 'construction cement'],
  p007: ['corrugated metal roofing sheets', 'metal roof sheet', 'roofing sheets stack'],
  // The product is milled meal, not the cob. Query the flour, not the harvest.
  p008: ['flour sack', 'flour bag packaging', 'white flour'],
  p009: ['sorghum grain seeds', 'sorghum harvest grain', 'grain seed sack'],
  p010: ['stack of paper', 'printer paper', 'office paper ream'],
  p011: ['boiler suit', 'coverall clothing', 'overalls workwear garment'],
  p012: ['african school children uniform', 'school uniform folded clothing', 'kids uniform clothes'],
};

const CATEGORY_QUERIES = {
  c1: ['beauty cosmetics flatlay', 'cosmetic products'],
  c2: ['consumer electronics gadgets', 'electronics devices'],
  c3: ['construction materials site', 'building materials'],
  c4: ['grain sacks market africa', 'agriculture harvest grain'],
  c5: ['office supplies stationery', 'stationery desk supplies'],
  c6: ['folded clothing textiles', 'clothing apparel stack'],
};

const HERO_QUERIES = {
  hero: ['warehouse logistics africa', 'shipping warehouse pallets', 'logistics warehouse'],
};

// ─── Providers ───────────────────────────────────────────────────────────────

async function searchPexels(query, perPage = 4) {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape`;
  const response = await fetch(url, { headers: { Authorization: PEXELS } });
  if (!response.ok) throw new Error(`Pexels ${response.status}: ${await response.text()}`);

  const body = await response.json();
  return (body.photos ?? []).map((photo) => ({
    url: photo.src.large ?? photo.src.medium,
    credit: `${photo.photographer} (Pexels)`,
    source: photo.url,
    width: photo.width,
    height: photo.height,
  }));
}

async function searchUnsplash(query, perPage = 4) {
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape`;
  const response = await fetch(url, { headers: { Authorization: `Client-ID ${UNSPLASH}` } });
  if (!response.ok) throw new Error(`Unsplash ${response.status}: ${await response.text()}`);

  const body = await response.json();
  return (body.results ?? []).map((photo) => ({
    url: `${photo.urls.raw}&w=1200&q=80&fm=jpg&fit=crop`,
    credit: `${photo.user.name} (Unsplash)`,
    source: photo.links.html,
    width: photo.width,
    height: photo.height,
  }));
}

const search = PROVIDER === 'pexels' ? searchPexels : searchUnsplash;

async function download(url, destination) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`download ${response.status}`);

  const buffer = Buffer.from(await response.arrayBuffer());
  // A "photo" under about 8KB is a placeholder or an error page, not an image.
  if (buffer.length < 8_000) throw new Error(`suspiciously small (${buffer.length}b)`);

  await fs.writeFile(destination, buffer);
  return buffer.length;
}

/** Try each query in turn; return the candidates from the first that answers. */
async function firstHit(queries) {
  for (const query of queries) {
    try {
      const results = await search(query);
      if (results.length > 0) return { query, results };
    } catch (error) {
      console.log(`      ! "${query}" — ${error.message.slice(0, 80)}`);
    }
  }
  return null;
}

// ─── Run ─────────────────────────────────────────────────────────────────────

const onlyArg = process.argv.indexOf('--only');
const only = onlyArg !== -1 ? process.argv[onlyArg + 1] : null;

await fs.mkdir(OUT, { recursive: true });

const products = JSON.parse(await fs.readFile(path.join(DATA, 'products.json'), 'utf8'));
const images = JSON.parse(await fs.readFile(path.join(DATA, 'product-images.json'), 'utf8'));

const credits = [];
let fetched = 0;
let skipped = 0;

console.log(`Provider: ${PROVIDER}\n`);

// Products get up to three distinct views for the detail-page thumbnail rail.
for (const product of products) {
  if (only && product.id !== only) continue;

  const queries = PRODUCT_QUERIES[product.id];
  if (!queries) continue;

  console.log(`${product.id}  ${product.name}`);

  const hit = await firstHit(queries);
  if (!hit) {
    console.log('      ✗ no results — keeping gradient\n');
    skipped += 1;
    continue;
  }

  console.log(`      query: "${hit.query}" — ${hit.results.length} candidate(s)`);

  const rows = images
    .filter((image) => image.product_id === product.id)
    .sort((a, b) => a.sort_order - b.sort_order);

  for (let i = 0; i < Math.min(rows.length, hit.results.length); i += 1) {
    const candidate = hit.results[i];
    const filename = `${product.id}-${i}.jpg`;

    try {
      const bytes = await download(candidate.url, path.join(OUT, filename));
      rows[i].image_url = `/products/${filename}`;
      credits.push({ file: filename, product_id: product.id, ...candidate, url: undefined });
      fetched += 1;
      console.log(`      ✓ ${filename}  ${Math.round(bytes / 1024)}kb  — ${candidate.credit}`);
    } catch (error) {
      console.log(`      ✗ ${filename} — ${error.message}`);
    }
  }

  console.log('');
}

// Categories and the hero land as standalone files the pages reference directly.
if (!only) {
  for (const [key, queries] of Object.entries({ ...CATEGORY_QUERIES, ...HERO_QUERIES })) {
    const hit = await firstHit(queries);
    if (!hit) {
      console.log(`${key}   ✗ no results`);
      skipped += 1;
      continue;
    }

    const candidate = hit.results[0];
    const filename = `${key}.jpg`;

    try {
      const bytes = await download(candidate.url, path.join(OUT, filename));
      credits.push({ file: filename, scope: key, ...candidate, url: undefined });
      fetched += 1;
      console.log(`${key}   ✓ ${filename}  ${Math.round(bytes / 1024)}kb  — ${candidate.credit}  ("${hit.query}")`);
    } catch (error) {
      console.log(`${key}   ✗ ${error.message}`);
    }
  }
}

await fs.writeFile(
  path.join(DATA, 'product-images.json'),
  `${JSON.stringify(images, null, 2)}\n`,
  'utf8',
);

await fs.writeFile(
  path.join(OUT, 'CREDITS.json'),
  `${JSON.stringify(credits, null, 2)}\n`,
  'utf8',
);

console.log(`\n${'═'.repeat(52)}`);
console.log(`${fetched} image(s) downloaded, ${skipped} query group(s) with no result`);
console.log(`\nProvenance written to public/products/CREDITS.json`);
console.log(`\nNow LOOK at them before trusting the run:`);
console.log(`  a wrong-but-plausible photo is the failure mode here, not a crash.`);
console.log(`  re-fetch a single product with:  npm run images -- --only p004`);
