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
 * Product and category photos are square crops of the photographer's original,
 * SQUARE_SIDE pixels a side (or the original's short side, if smaller), because
 * the storefront shows them square and Alibaba's product pages do too. A
 * candidate whose original is under MIN_SIDE on its short side is skipped, and
 * every download is measured before it is written: a file that comes back the
 * wrong shape or too small is refused rather than saved. The hero stays
 * landscape. `npm run catalogue:audit` checks the same bar.
 *
 * These are still stock photos of something like the product: fine for a demo,
 * not for launch, where a photo must show the item actually sold.
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

import { imageSize } from './image-size.mjs';

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

/** Side of a square product photo, in pixels. */
const SQUARE_SIDE = 1600;
/** The smallest short side worth downloading; the audit's bar too. */
const MIN_SIDE = 1200;
/** Width of the landscape hero. */
const HERO_WIDTH = 1920;

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
  // No hair queries: since 2026-10-21 the hair category holds only AfriDeal's
  // own wigs (p018 onwards), photographed by the product owner. Their files
  // are placed in public/products by hand; a product with no queries here is
  // skipped, so stock never replaces them.
};

const CATEGORY_QUERIES = {
  c1: ['african woman braided hair', 'hair extensions bundles', 'afro hair styling'],
  c7: ['beauty cosmetics flatlay', 'cosmetic products'],
  c2: ['consumer electronics gadgets', 'electronics devices'],
  c3: ['construction materials site', 'building materials'],
  c4: ['grain sacks market africa', 'agriculture harvest grain'],
  c5: ['office supplies stationery', 'stationery desk supplies'],
  c6: ['folded clothing textiles', 'clothing apparel stack'],
};

const HERO_QUERIES = {
  /*
   * The header photograph.
   *
   * It has to say "procurement", not "salon". The hero's headline is now find
   * it / compare it / procure it / get it delivered, and the picture beside it
   * should show the end of that sentence: someone ordering on a phone with the
   * parcels stacked behind them. A salon interior illustrated the catalogue's
   * biggest category and left the other six unexplained.
   *
   * Portrait-first queries deliberately, and never a query that overlaps a
   * product card - one image cannot be both the header and a tile in the grid
   * beneath it.
   */
  hero: [
    'african woman holding phone parcel boxes',
    'woman online shopping delivery boxes',
    'black woman smartphone cardboard boxes warehouse',
  ],
};

// ─── Providers ───────────────────────────────────────────────────────────────

/*
 * `shape` is 'square' for products and categories, 'landscape' for the hero.
 * Both providers serve the photographer's original through an image CDN that
 * crops and resizes on request, so the square is cut from the full-resolution
 * file rather than from the 940px preview the first runs downloaded. More
 * candidates are asked for than needed because the small ones are dropped.
 */
const sideFor = (photo) => Math.min(SQUARE_SIDE, photo.width, photo.height);

async function searchPexels(query, shape, perPage = 8) {
  const orientation = shape === 'square' ? 'square' : 'landscape';
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=${orientation}`;
  const response = await fetch(url, { headers: { Authorization: PEXELS } });
  if (!response.ok) throw new Error(`Pexels ${response.status}: ${await response.text()}`);

  const body = await response.json();
  return (body.photos ?? []).map((photo) => ({
    url:
      shape === 'square'
        ? `${photo.src.original}?auto=compress&cs=tinysrgb&fit=crop&w=${sideFor(photo)}&h=${sideFor(photo)}`
        : `${photo.src.original}?auto=compress&cs=tinysrgb&w=${HERO_WIDTH}`,
    credit: `${photo.photographer} (Pexels)`,
    source: photo.url,
    width: photo.width,
    height: photo.height,
  }));
}

async function searchUnsplash(query, shape, perPage = 8) {
  const orientation = shape === 'square' ? 'squarish' : 'landscape';
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=${orientation}`;
  const response = await fetch(url, { headers: { Authorization: `Client-ID ${UNSPLASH}` } });
  if (!response.ok) throw new Error(`Unsplash ${response.status}: ${await response.text()}`);

  const body = await response.json();
  return (body.results ?? []).map((photo) => ({
    url:
      shape === 'square'
        ? `${photo.urls.raw}&w=${sideFor(photo)}&h=${sideFor(photo)}&fit=crop&crop=entropy&q=85&fm=jpg`
        : `${photo.urls.raw}&w=${HERO_WIDTH}&q=85&fm=jpg`,
    credit: `${photo.user.name} (Unsplash)`,
    source: photo.links.html,
    width: photo.width,
    height: photo.height,
  }));
}

const search = PROVIDER === 'pexels' ? searchPexels : searchUnsplash;

/** Measured before writing, so a wrong file never replaces a good one. */
async function download(url, destination, shape) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`download ${response.status}`);

  const buffer = Buffer.from(await response.arrayBuffer());
  // A "photo" under about 8KB is a placeholder or an error page, not an image.
  if (buffer.length < 8_000) throw new Error(`suspiciously small (${buffer.length}b)`);

  const size = imageSize(buffer);
  if (!size) throw new Error('not a JPEG, PNG or WebP');
  if (shape === 'square') {
    if (size.width !== size.height) throw new Error(`came back ${size.width}x${size.height}, not square`);
    if (size.width < MIN_SIDE) throw new Error(`came back ${size.width}px, under ${MIN_SIDE}px`);
  }

  await fs.writeFile(destination, buffer);
  return { bytes: buffer.length, ...size };
}

/** Big enough to cut a MIN_SIDE square from or, for the hero, that wide. */
const usable = (shape) => (photo) =>
  shape === 'square' ? Math.min(photo.width, photo.height) >= MIN_SIDE : photo.width >= HERO_WIDTH;

/** Try each query in turn; return the usable candidates from the first that has any. */
async function firstHit(queries, shape) {
  for (const query of queries) {
    try {
      const results = (await search(query, shape)).filter(usable(shape));
      if (results.length > 0) return { query, results };
    } catch (error) {
      console.log(`      ! "${query}" — ${error.message.slice(0, 80)}`);
    }
  }
  return null;
}

// ─── Run ─────────────────────────────────────────────────────────────────────

/*
 * `--only p004,p006` re-fetches a subset. Taking a list rather than a single id
 * matters more than it looks: a partial run used to overwrite CREDITS.json with
 * just the products it touched, silently dropping the provenance of every file
 * it left alone. So the ids are a set, and the credits below are merged.
 */
const onlyArg = process.argv.indexOf('--only');
const only =
  onlyArg !== -1 && process.argv[onlyArg + 1]
    ? new Set(process.argv[onlyArg + 1].split(',').map((id) => id.trim()).filter(Boolean))
    : null;

await fs.mkdir(OUT, { recursive: true });

const products = JSON.parse(await fs.readFile(path.join(DATA, 'products.json'), 'utf8'));
const images = JSON.parse(await fs.readFile(path.join(DATA, 'product-images.json'), 'utf8'));

/*
 * Start from whatever provenance is already recorded, so a partial run adds to
 * the record instead of truncating it.
 */
const credits = await (async () => {
  try {
    return JSON.parse(await fs.readFile(path.join(OUT, 'CREDITS.json'), 'utf8'));
  } catch {
    return [];
  }
})();

const creditFor = (file) => credits.findIndex((entry) => entry.file === file);

/**
 * What is kept per file: who took it, where from, the original's size and the
 * size actually saved. Only the original's size used to be kept, which read as
 * 6000x4000 for files that were 940px wide.
 */
function creditEntry(scope, candidate, saved) {
  return {
    ...scope,
    credit: candidate.credit,
    source: candidate.source,
    original_width: candidate.width,
    original_height: candidate.height,
    width: saved.width,
    height: saved.height,
  };
}

function recordCredit(entry) {
  const at = creditFor(entry.file);
  if (at === -1) credits.push(entry);
  else credits[at] = entry;
}

let fetched = 0;
let skipped = 0;

console.log(`Provider: ${PROVIDER}\n`);

// Each product fills its image rows (four in the seed) with distinct views for
// the detail-page thumbnail rail.
for (const product of products) {
  if (only && !only.has(product.id)) continue;

  const queries = PRODUCT_QUERIES[product.id];
  if (!queries) continue;

  console.log(`${product.id}  ${product.name}`);

  const hit = await firstHit(queries, 'square');
  if (!hit) {
    console.log('      ✗ no usable results — keeping the current photos\n');
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
      const saved = await download(candidate.url, path.join(OUT, filename), 'square');
      rows[i].image_url = `/products/${filename}`;
      recordCredit(creditEntry({ file: filename, product_id: product.id }, candidate, saved));
      fetched += 1;
      console.log(`      ✓ ${filename}  ${saved.width}x${saved.height}  ${Math.round(saved.bytes / 1024)}kb  — ${candidate.credit}`);
    } catch (error) {
      console.log(`      ✗ ${filename} — ${error.message}`);
    }
  }

  console.log('');
}

// Categories and the hero land as standalone files the pages reference directly.
// `--only` accepts their keys too (`--only hero`, `--only c1,c7`); without it,
// every scope runs. Gating these behind "no filter at all" meant the only way to
// replace one hero was refetching the whole catalogue over it.
for (const [key, queries] of Object.entries({ ...CATEGORY_QUERIES, ...HERO_QUERIES })) {
  if (only && !only.has(key)) continue;
  {
    const shape = key === 'hero' ? 'landscape' : 'square';
    const hit = await firstHit(queries, shape);
    if (!hit) {
      console.log(`${key}   ✗ no usable results`);
      skipped += 1;
      continue;
    }

    const candidate = hit.results[0];
    const filename = `${key}.jpg`;

    try {
      const saved = await download(candidate.url, path.join(OUT, filename), shape);
      recordCredit(creditEntry({ file: filename, scope: key }, candidate, saved));
      fetched += 1;
      console.log(`${key}   ✓ ${filename}  ${saved.width}x${saved.height}  ${Math.round(saved.bytes / 1024)}kb  — ${candidate.credit}  ("${hit.query}")`);
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
console.log(`\nMeasure them:  npm run catalogue:audit -- --source json`);
console.log(`\nNow LOOK at them before trusting the run:`);
console.log(`  a wrong-but-plausible photo is the failure mode here, not a crash.`);
console.log(`  re-fetch specific products with:  npm run images -- --only p004,p006`);
