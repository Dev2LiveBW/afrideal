/**
 * How ready is the catalogue for launch?
 *
 *   npm run catalogue:audit                       # the live catalogue in Sanity
 *   npm run catalogue:audit -- --source json      # data/*.json and public/products
 *   npm run catalogue:audit -- --json report.json # also write the full result
 *   npm run catalogue:audit -- --min-ready 80     # exit 1 below 80% ready
 *
 * Every product is checked against the same list (CHECKS below) and is "ready"
 * only when it passes all of them. Every category is ready when it holds at
 * least MIN_PER_CATEGORY ready products. The report gives the readiness rate
 * overall, per category and per check, so it is clear whether the gap is the
 * photography, the copy, or the breadth.
 *
 * Reads only. Sanity's production dataset is public, so no token is needed, and
 * only published documents count: a draft is not something a buyer can see.
 *
 * Whether a photo shows the real item is decided from its recorded source,
 * not by looking at it. The source is the Sanity asset's credit line, or the
 * file's entry in public/products/CREDITS.json (written by `npm run images`).
 * A stock library there fails; so does no source at all, because a photo
 * nobody can account for is not one to launch with. A supplier's own photo
 * passes once its credit line says so in the Studio (for example
 * "Supplier: Glow Up Beauty"). p001 and p002 have no source recorded: they
 * predate CREDITS.json.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { allowSlowHandshakes } from '../lib/postgres/network.mjs';
import { imageSize } from './image-size.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// ─── The bar ─────────────────────────────────────────────────────────────────

/** Photos per product: a main shot plus enough views to fill the gallery rail. */
const MIN_PHOTOS = 4;
/** Shortest side in pixels. Below this a photo is soft on a phone at 3x. */
const MIN_SIDE = 1200;
/** Width / height allowed either side of 1 for a photo to count as square. */
const SQUARE_TOLERANCE = 0.05;
/** Ready products a category needs before its pages and floors look full. */
const MIN_PER_CATEGORY = 8;
const MIN_SHORT_DESCRIPTION = 20;
const MIN_DESCRIPTION = 80;
const MIN_SPECS = 3;
const STOCK_LIBRARY = /pexels|unsplash|pixabay|shutterstock|istock|getty|adobe stock/i;

const isSquare = (photo) =>
  photo.width > 0 && Math.abs(photo.width / photo.height - 1) <= SQUARE_TOLERANCE;

/** Where a photo came from: 'stock', 'unknown' (nothing recorded) or 'own'. */
function provenance(...credits) {
  const recorded = credits.filter((credit) => credit && credit.trim());
  if (recorded.length === 0) return 'unknown';
  return recorded.some((credit) => STOCK_LIBRARY.test(credit)) ? 'stock' : 'own';
}

/** Each check: a short label for the table, and a test returning a failure reason or null. */
const CHECKS = [
  ['Published and active', (p) => (p.status === 'ACTIVE' ? null : `status is ${p.status ?? 'missing'}`)],
  ['Enough photos', (p) => (p.photos.length >= MIN_PHOTOS ? null : `${p.photos.length} of ${MIN_PHOTOS} photos`)],
  ['Main photo set', (p) => (p.photos.some((photo) => photo.primary) ? null : 'no photo marked as the main one')],
  ['Photos large enough', (p) => {
    const small = p.photos.filter((photo) => Math.min(photo.width, photo.height) < MIN_SIDE);
    if (small.length === 0 && p.photos.length > 0) return null;
    const sizes = small.map((photo) => (photo.width ? `${photo.width}x${photo.height}` : 'unreadable'));
    return `${small.length || 'no'} photo(s) under ${MIN_SIDE}px: ${sizes.join(', ')}`;
  }],
  ['Photos square', (p) => {
    const off = p.photos.filter((photo) => !isSquare(photo)).length;
    return off === 0 && p.photos.length > 0 ? null : `${off} of ${p.photos.length} not square`;
  }],
  ['Photos of the real item', (p) => {
    const stock = p.photos.filter((photo) => photo.source === 'stock').length;
    const unknown = p.photos.filter((photo) => photo.source === 'unknown').length;
    if (stock === 0 && unknown === 0) return null;
    return [stock && `${stock} stock`, unknown && `${unknown} with no source recorded`].filter(Boolean).join(', ') +
      ` (of ${p.photos.length})`;
  }],
  ['Descriptions written', (p) =>
    (p.shortDescription ?? '').trim().length >= MIN_SHORT_DESCRIPTION &&
    (p.description ?? '').trim().length >= MIN_DESCRIPTION
      ? null
      : 'short description or description too short'],
  ['Specs listed', (p) => (p.specs >= MIN_SPECS ? null : `${p.specs} of ${MIN_SPECS} specs`)],
  ['Variants priced with SKUs', (p) =>
    p.variants.length > 0 && p.variants.every((v) => v.sku && Number(v.price) > 0)
      ? null
      : p.variants.length === 0 ? 'no variants' : 'a variant lacks a SKU or a price'],
  ['A supplier has it in stock', (p) => (p.offersInStock > 0 ? null : 'no active supplier offer with stock')],
];

// ─── Arguments and environment ───────────────────────────────────────────────

function arg(name) {
  const at = process.argv.indexOf(`--${name}`);
  return at !== -1 ? process.argv[at + 1] : undefined;
}

async function loadEnv() {
  try {
    const raw = await fs.readFile(path.join(ROOT, '.env.local'), 'utf8');
    for (const line of raw.split('\n')) {
      const match = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim();
    }
  } catch {
    // No .env.local: the defaults below point at the live catalogue.
  }
}

await loadEnv();
const SOURCE = arg('source') ?? 'sanity';
if (!['sanity', 'json'].includes(SOURCE)) {
  console.error(`--source must be sanity or json, not "${SOURCE}"`);
  process.exit(2);
}

/** File name to credit, for every photo the image fetcher downloaded. */
async function readCredits() {
  try {
    const rows = JSON.parse(await fs.readFile(path.join(ROOT, 'public', 'products', 'CREDITS.json'), 'utf8'));
    return new Map(rows.map((row) => [row.file, row.credit ?? '']));
  } catch {
    return new Map();
  }
}

// ─── Loading: both sources end in the same shape ─────────────────────────────

/** `product-p001` -> `p001`, as lib/sanity/catalogue.ts does. */
const appId = (id) => (id ?? '').replace(/^(product|category|brand|supplier|offer)-/, '');

async function fromSanity(credits) {
  allowSlowHandshakes();
  const project = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? 'bly84glb';
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production';
  const published = '!(_id in path("drafts.**"))';
  const groq = `{
    "categories": *[_type == "category" && ${published}] | order(sortOrder asc, name asc) { _id, name },
    "products": *[_type == "product" && ${published}] {
      _id, name, status, "category": category._ref, shortDescription, description,
      "specs": count(specs), variants[]{ sku, price },
      images[]{ imageType, "file": asset->originalFilename, "credit": asset->creditLine,
                "width": asset->metadata.dimensions.width, "height": asset->metadata.dimensions.height }
    },
    "offers": *[_type == "supplierOffer" && ${published}] { "product": product._ref, stock, active }
  }`;
  const url = `https://${project}.api.sanity.io/v2025-08-15/data/query/${dataset}?query=${encodeURIComponent(groq)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Sanity answered ${response.status}: ${(await response.text()).slice(0, 200)}`);
  const { result } = await response.json();

  return {
    label: `Sanity ${project}/${dataset}, published documents`,
    categories: result.categories.map((c) => ({ id: appId(c._id), name: c.name })),
    products: result.products.map((p) => ({
      id: appId(p._id),
      name: p.name,
      status: p.status,
      categoryId: appId(p.category),
      shortDescription: p.shortDescription,
      description: p.description,
      specs: p.specs ?? 0,
      variants: p.variants ?? [],
      photos: (p.images ?? []).map((image) => ({
        primary: image.imageType === 'PRIMARY',
        width: image.width ?? 0,
        height: image.height ?? 0,
        source: provenance(image.credit, credits.get(image.file)),
      })),
    })),
    offers: result.offers.map((o) => ({ productId: appId(o.product), stock: o.stock, active: o.active })),
  };
}

async function fromJson(credits) {
  const read = async (name) => JSON.parse(await fs.readFile(path.join(ROOT, 'data', `${name}.json`), 'utf8'));
  const [categories, products, images, offers] = await Promise.all(
    ['categories', 'products', 'product-images', 'supplier-offers'].map(read),
  );

  const measure = async (url) => {
    try {
      return imageSize(await fs.readFile(path.join(ROOT, 'public', url))) ?? { width: 0, height: 0 };
    } catch {
      return { width: 0, height: 0 };
    }
  };

  return {
    label: 'data/*.json and public/products',
    categories: categories.map((c) => ({ id: c.id, name: c.name })),
    products: await Promise.all(products.map(async (p) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      categoryId: p.category_id,
      shortDescription: p.short_description,
      description: p.description,
      specs: (p.specs ?? []).length,
      variants: p.variants ?? [],
      photos: await Promise.all(images
        .filter((image) => image.product_id === p.id)
        .map(async (image) => ({
          primary: image.image_type === 'PRIMARY',
          ...(await measure(image.image_url)),
          source: provenance(credits.get(path.basename(image.image_url))),
        }))),
    }))),
    offers: offers.map((o) => ({ productId: o.product_id, stock: o.stock, active: o.active })),
  };
}

// ─── Scoring ─────────────────────────────────────────────────────────────────

const credits = await readCredits();
const catalogue = SOURCE === 'sanity' ? await fromSanity(credits) : await fromJson(credits);

const products = catalogue.products.map((product) => {
  const offersInStock = catalogue.offers.filter(
    (offer) => offer.productId === product.id && offer.active !== false && Number(offer.stock) > 0,
  ).length;
  const subject = { ...product, offersInStock };
  const failures = CHECKS.map(([label, test]) => [label, test(subject)]).filter(([, reason]) => reason);
  return { id: product.id, name: product.name, categoryId: product.categoryId, ready: failures.length === 0, failures };
});

const pct = (part, whole) => (whole === 0 ? 0 : Math.round((part / whole) * 1000) / 10);
const readyCount = products.filter((p) => p.ready).length;

const categories = catalogue.categories.map((category) => {
  const inCategory = products.filter((p) => p.categoryId === category.id);
  const ready = inCategory.filter((p) => p.ready).length;
  return { id: category.id, name: category.name, products: inCategory.length, ready, isReady: ready >= MIN_PER_CATEGORY };
});

const checks = CHECKS.map(([label]) => {
  const passed = products.filter((p) => !p.failures.some(([failed]) => failed === label)).length;
  return { label, passed, rate: pct(passed, products.length) };
});

const report = {
  generated_at: new Date().toISOString(),
  source: catalogue.label,
  bar: { MIN_PHOTOS, MIN_SIDE, SQUARE_TOLERANCE, MIN_PER_CATEGORY, MIN_SHORT_DESCRIPTION, MIN_DESCRIPTION, MIN_SPECS },
  products_ready: { ready: readyCount, total: products.length, rate: pct(readyCount, products.length) },
  categories_ready: {
    ready: categories.filter((c) => c.isReady).length,
    total: categories.length,
    rate: pct(categories.filter((c) => c.isReady).length, categories.length),
  },
  checks,
  categories,
  products,
};

// ─── Report ──────────────────────────────────────────────────────────────────

const line = '═'.repeat(64);
console.log(`\nCatalogue readiness  ·  ${report.source}\n${line}`);
console.log(`Products ready     ${report.products_ready.ready} of ${report.products_ready.total}  (${report.products_ready.rate}%)`);
console.log(`Categories ready   ${report.categories_ready.ready} of ${report.categories_ready.total}  (${report.categories_ready.rate}%)` +
  `  — a category needs ${MIN_PER_CATEGORY} ready products`);

console.log(`\nBy check (share of products passing)`);
for (const check of checks) {
  console.log(`  ${check.label.padEnd(28)} ${String(check.passed).padStart(3)} of ${products.length}  ${String(check.rate).padStart(5)}%`);
}

console.log(`\nBy category (ready / products, needs ${MIN_PER_CATEGORY})`);
for (const category of categories) {
  const mark = category.isReady ? '✓' : '✗';
  console.log(`  ${mark} ${category.name.padEnd(34)} ${String(category.ready).padStart(2)} / ${String(category.products).padStart(2)}` +
    (category.isReady ? '' : `   ${Math.max(0, MIN_PER_CATEGORY - category.ready)} more needed`));
}
const orphans = products.filter((p) => !catalogue.categories.some((c) => c.id === p.categoryId));
if (orphans.length > 0) console.log(`  ! ${orphans.length} product(s) in no listed category: ${orphans.map((p) => p.id).join(', ')}`);

const notReady = products.filter((p) => !p.ready);
if (notReady.length > 0) {
  console.log(`\nNot ready (${notReady.length})`);
  for (const product of notReady) {
    console.log(`  ${product.id}  ${product.name}`);
    for (const [label, reason] of product.failures) console.log(`        ${label}: ${reason}`);
  }
}

const out = arg('json');
if (out) {
  await fs.writeFile(path.resolve(out), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`\nFull report written to ${out}`);
}

const minReady = arg('min-ready');
if (minReady !== undefined && report.products_ready.rate < Number(minReady)) {
  console.log(`\n✗ ${report.products_ready.rate}% of products ready, below the --min-ready ${minReady}% bar`);
  process.exit(1);
}
console.log('');
