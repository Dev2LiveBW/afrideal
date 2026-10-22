/**
 * Seed generator for the AfriDeal JSON store.
 *
 * Run with `npm run seed`. Regenerates every file under /data from scratch, so
 * a demo that has been clicked through can be reset to a known state in one
 * command.
 *
 * Everything derived is computed here rather than typed by hand: selling prices
 * come out of the pricing engine, supplier routing comes out of the composite
 * score, order totals are summed from their own line items, and each supplier
 * payable equals the supplier order it belongs to. Nothing in /data is a number
 * someone guessed.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  GATEWAY_RATE,
  QUOTATION_THRESHOLD,
  ladderFor,
  landedCost,
  marginPct,
  unitPrice,
} from '../lib/pricing-formula.mjs';
import { DEFAULT_DELIVERY_COUNTRY, isCrossBorder } from '../lib/lanes.mjs';

const ROOT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const PHOTO_DIR = path.join(ROOT_DIR, 'public', 'products');

const NOW = new Date();
const iso = (d) => d.toISOString();
const daysAgo = (n, hour = 10) => {
  const d = new Date(NOW);
  d.setDate(d.getDate() - n);
  d.setHours(hour, (n * 17) % 60, 0, 0);
  return iso(d);
};
const daysAhead = (n, hour = 17) => {
  const d = new Date(NOW);
  d.setDate(d.getDate() + n);
  d.setHours(hour, 0, 0, 0);
  return iso(d);
};

/** Deterministic PRNG so reseeding produces identical data. */
function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}
const rand = rng(20260818);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

// ─── The price ladder ────────────────────────────────────────────────────────

/**
 * AfriDeal buys from the supplier and resells to the customer, so the customer
 * price is the landed cost (supplier cost, converted; no customs since
 * 2026-10-21, the courier clears it) plus a published markup, decided by
 * quantity (spec 0007):
 *
 *   1 – 4 units      Retail       landed + 50%, less 2 / 3 / 5% for 2 / 3 / 4
 *   5 – 10 units     Bulk         landed + 33%
 *   11 – 20 units    Wholesale    landed + 25%
 *   21 – 99 units    Wholesale+   landed + 18%
 *   100 units +      Custom       by quotation
 *
 * The rungs and the arithmetic come from lib/pricing-formula.mjs, the module the
 * running app reads too, so the bands written here are the prices it charges.
 * Delivery is quoted separately at checkout rather than smeared across units.
 */
/** A rung's markup in percent, on the ladder of the category it prices. */
const pct = (rung) => Math.round(rung.markup * 1000) / 10;
/** The retail markup a category opens at: 50% by default, 25% for hair. */
const retailMarkupPct = (categoryId) => pct(ladderFor(categoryId)[0]);

// ─── Categories ──────────────────────────────────────────────────────────────

const categories = [
  { id: 'c1', name: 'Hair, Weaves & Extensions', slug: 'hair-weaves-extensions', emoji: '💇🏾‍♀️', sort_order: 1, blurb: 'AfriDeal lace wigs, from short bobs to 32 inch, sold by length.' },
  { id: 'c7', name: 'Beauty & Personal Care', slug: 'beauty-personal-care', emoji: '💄', sort_order: 2, blurb: 'Treatments, serums and salon consumables from verified regional distributors.' },
  { id: 'c2', name: 'Electronics', slug: 'electronics', emoji: '🔌', sort_order: 3, blurb: 'Consumer and off-grid electronics, landed and warranty-backed.' },
  { id: 'c6', name: 'Clothing & Uniforms', slug: 'clothing-uniforms', emoji: '👕', sort_order: 4, blurb: 'Workwear, school uniforms and retail apparel at trade quantities.' },
  { id: 'c4', name: 'Food & Agriculture', slug: 'food-agriculture', emoji: '🌾', sort_order: 5, blurb: 'Staples, seed and inputs sourced through the SADC corridor.' },
  { id: 'c3', name: 'Building Materials', slug: 'building-materials', emoji: '🧱', sort_order: 6, blurb: 'Cement, roofing and structural supply at contractor volumes.' },
  { id: 'c5', name: 'Office Supplies', slug: 'office-supplies', emoji: '📎', sort_order: 7, blurb: 'Consumables and stationery for offices that reorder monthly.' },
];

// ─── Pricing rules ───────────────────────────────────────────────────────────

const pricingRules = categories.map((category, i) => ({
  id: `pr${String(i + 1).padStart(3, '0')}`,
  category_id: category.id,
  category_name: category.name,
  markup_type: 'PERCENTAGE',
  // The platform retail markup. One figure across the catalogue, so a buyer
  // comparing two categories is comparing supplier costs, not our arithmetic.
  markup_value: retailMarkupPct(category.id),
  // Zero, deliberately. Delivery is quoted at checkout against the real
  // address, so folding a per-unit contribution in here would charge for it
  // twice and would punish the cheapest lines hardest.
  logistics_cost: 0,
  gateway_rate: 0.025,
  active: true,
}));

const ruleFor = (categoryId) => pricingRules.find((r) => r.category_id === categoryId);

/**
 * Where a category's goods come from. Building materials and food are sourced
 * in Botswana; everything else crosses the border from South Africa, where the
 * courier clears it (CUSTOMS_RATE is 0, so origin no longer moves the price).
 */
const originFor = (categoryId) => (categoryId === 'c3' || categoryId === 'c4' ? 'BW' : 'ZA');

/** Landed cost in thebe: the supplier's price, converted, plus customs if imported. */
/*
 * Published bands are for the default delivery country until "Deliver to"
 * carries one (spec 0009), so "imported" is the lane from the goods' country to
 * that default, never a test against Botswana.
 */
const landedFor = (cost, currency, categoryId) =>
  landedCost({ cost, currency, imported: isCrossBorder(originFor(categoryId), DEFAULT_DELIVERY_COUNTRY) })
    .landed_thebe;

/** The retail price on a landed cost, under a category's pricing rule. */
function calculatePrice(landedThebe, rule) {
  return rule.markup_type === 'PERCENTAGE'
    ? unitPrice(landedThebe, rule.markup_value / 100)
    : Math.ceil(landedThebe / 100 + rule.markup_value);
}

// ─── Suppliers ───────────────────────────────────────────────────────────────

const docTemplate = (status, uploadedDaysAgo) => [
  { id: 'd1', label: 'Certificate of Incorporation', status, uploaded_at: uploadedDaysAgo == null ? null : daysAgo(uploadedDaysAgo) },
  { id: 'd2', label: 'Tax Clearance Certificate', status, uploaded_at: uploadedDaysAgo == null ? null : daysAgo(uploadedDaysAgo) },
  { id: 'd3', label: 'Proof of Bank Account', status, uploaded_at: uploadedDaysAgo == null ? null : daysAgo(uploadedDaysAgo) },
  { id: 'd4', label: 'Directors ID Documents', status, uploaded_at: uploadedDaysAgo == null ? null : daysAgo(uploadedDaysAgo) },
];

// ─── Countries ───────────────────────────────────────────────────────────────

/**
 * The countries AfriDeal trades in (spec 0009). Buyers, suppliers, runners and
 * couriers can be in any of them, and adding one is a row here (or in the
 * admin, later), never a code change. Lesotho is in from the start so the
 * any-to-any paths are exercised by verify and e2e, not just Botswana's.
 */
const countries = [
  [
    'BW', 'Botswana', 'BWP',
    ['Gaborone', 'Francistown', 'Molepolole', 'Maun', 'Serowe', 'Selebi-Phikwe', 'Kanye', 'Lobatse', 'Palapye', 'Mahalapye'],
  ],
  ['ZA', 'South Africa', 'ZAR', ['Johannesburg', 'Pretoria', 'Cape Town', 'Durban', 'Polokwane', 'Mahikeng', 'Bloemfontein']],
  ['LS', 'Lesotho', 'LSL', ['Maseru', 'Teyateyaneng', 'Maputsoe', 'Mafeteng', 'Hlotse', "Mohale's Hoek"]],
  // A launch country since 2026-10-22 (spec 0009, answer 4).
  ['SZ', 'Eswatini', 'SZL', ['Mbabane', 'Manzini', 'Matsapha', 'Nhlangano', 'Siteki']],
].map(([code, name, currency, towns], i) => ({
  id: code, code, name, currency, towns, active: true, sort_order: i + 1,
}));

const suppliers = [
  {
    id: 's001', name: 'Naledi Beauty Supplies', legal_name: 'Naledi Beauty Supplies (Pty) Ltd', initials: 'NB',
    country: 'BW', city: 'Gaborone', status: 'VERIFIED',
    contact_email: 'supplier@naledi.co.bw', contact_phone: '+267 391 4820',
    registration_no: 'BW00001923845', joined_at: daysAgo(412),
    rating: 4.7, fulfilment_rate: 96, reliability_score: 92, avg_fulfilment_days: 2,
    total_gmv: 486_320, products_count: 3, orders_count: 214,
    verification_docs: docTemplate('APPROVED', 400), categories: ['c1', 'c7'],
  },
  {
    id: 's002', name: 'GlowUp Distributors', legal_name: 'GlowUp Distributors SA (Pty) Ltd', initials: 'GU',
    country: 'ZA', city: 'Johannesburg', status: 'VERIFIED',
    contact_email: 'supplier@glowup.co.za', contact_phone: '+27 11 726 3391',
    registration_no: 'ZA2019/447128/07', joined_at: daysAgo(360),
    rating: 4.4, fulfilment_rate: 91, reliability_score: 86, avg_fulfilment_days: 4,
    total_gmv: 372_940, products_count: 4, orders_count: 168,
    verification_docs: docTemplate('APPROVED', 352), categories: ['c1', 'c6', 'c7'],
  },
  {
    id: 's003', name: 'Kalahari Electronics', legal_name: 'Kalahari Electronics Trading CC', initials: 'KE',
    country: 'BW', city: 'Gaborone', status: 'VERIFIED',
    contact_email: 'trade@kalaharielectronics.co.bw', contact_phone: '+267 397 2210',
    registration_no: 'BW00002774119', joined_at: daysAgo(287),
    rating: 4.6, fulfilment_rate: 94, reliability_score: 89, avg_fulfilment_days: 3,
    total_gmv: 611_450, products_count: 2, orders_count: 143,
    verification_docs: docTemplate('APPROVED', 280), categories: ['c2'],
  },
  {
    id: 's004', name: 'Motswedi Building Supplies', legal_name: 'Motswedi Building Supplies (Pty) Ltd', initials: 'MB',
    country: 'BW', city: 'Francistown', status: 'VERIFIED',
    contact_email: 'sales@motswedi.co.bw', contact_phone: '+267 241 8876',
    registration_no: 'BW00003318204', joined_at: daysAgo(233),
    rating: 4.8, fulfilment_rate: 98, reliability_score: 95, avg_fulfilment_days: 1,
    total_gmv: 894_180, products_count: 2, orders_count: 97,
    verification_docs: docTemplate('APPROVED', 228), categories: ['c3'],
  },
  {
    id: 's005', name: 'Highveld Trade Co', legal_name: 'Highveld Trade Company (Pty) Ltd', initials: 'HT',
    country: 'ZA', city: 'Pretoria', status: 'VERIFIED',
    contact_email: 'orders@highveldtrade.co.za', contact_phone: '+27 12 348 5502',
    registration_no: 'ZA2017/229041/07', joined_at: daysAgo(198),
    rating: 4.2, fulfilment_rate: 88, reliability_score: 81, avg_fulfilment_days: 5,
    total_gmv: 258_600, products_count: 5, orders_count: 76,
    verification_docs: docTemplate('APPROVED', 190), categories: ['c2', 'c4', 'c5', 'c7'],
  },
  {
    id: 's006', name: 'Tsholofelo Fresh Produce', legal_name: 'Tsholofelo Fresh Produce (Pty) Ltd', initials: 'TF',
    country: 'BW', city: 'Maun', status: 'PENDING',
    contact_email: 'hello@tsholofelofresh.co.bw', contact_phone: '+267 686 1140',
    registration_no: 'BW00004402771', joined_at: daysAgo(9),
    rating: 0, fulfilment_rate: 0, reliability_score: 0, avg_fulfilment_days: 0,
    total_gmv: 0, products_count: 1, orders_count: 0,
    verification_docs: [
      { id: 'd1', label: 'Certificate of Incorporation', status: 'APPROVED', uploaded_at: daysAgo(9) },
      { id: 'd2', label: 'Tax Clearance Certificate', status: 'PENDING', uploaded_at: daysAgo(9) },
      { id: 'd3', label: 'Proof of Bank Account', status: 'PENDING', uploaded_at: daysAgo(8) },
      { id: 'd4', label: 'Directors ID Documents', status: 'REJECTED', uploaded_at: daysAgo(8), note: 'Scan is illegible below the fold. Re-upload at 300dpi.' },
    ],
    categories: ['c4'],
  },
  {
    id: 's007', name: 'Setlhoa Office Group', legal_name: 'Setlhoa Office Group (Pty) Ltd', initials: 'SO',
    country: 'BW', city: 'Gaborone', status: 'PENDING',
    contact_email: 'accounts@setlhoaoffice.co.bw', contact_phone: '+267 395 7731',
    registration_no: 'BW00004518830', joined_at: daysAgo(4),
    rating: 0, fulfilment_rate: 0, reliability_score: 0, avg_fulfilment_days: 0,
    total_gmv: 0, products_count: 1, orders_count: 0,
    verification_docs: [
      { id: 'd1', label: 'Certificate of Incorporation', status: 'APPROVED', uploaded_at: daysAgo(4) },
      { id: 'd2', label: 'Tax Clearance Certificate', status: 'APPROVED', uploaded_at: daysAgo(4) },
      { id: 'd3', label: 'Proof of Bank Account', status: 'PENDING', uploaded_at: null },
      { id: 'd4', label: 'Directors ID Documents', status: 'APPROVED', uploaded_at: daysAgo(3) },
    ],
    categories: ['c5'],
  },
  {
    id: 's008', name: 'Bokamoso Textiles', legal_name: 'Bokamoso Textiles (Pty) Ltd', initials: 'BT',
    country: 'BW', city: 'Lobatse', status: 'SUSPENDED',
    contact_email: 'info@bokamosotextiles.co.bw', contact_phone: '+267 533 2094',
    registration_no: 'BW00002091447', joined_at: daysAgo(520),
    rating: 3.1, fulfilment_rate: 62, reliability_score: 44, avg_fulfilment_days: 9,
    total_gmv: 88_400, products_count: 2, orders_count: 41,
    verification_docs: docTemplate('APPROVED', 515), categories: ['c6'],
  },
  {
    /*
     * AfriDeal's own sourcing for its hair range: AfriDeal buys the wigs in
     * South Africa and is the merchant of record. Stands in for the supplier the
     * product owner has not yet named (spec 0007, open question 5); no ratings
     * or volumes are claimed for it.
     */
    id: 's009', name: 'AfriDeal Hair Sourcing', legal_name: 'AfriDeal (supplier to be confirmed)', initials: 'AH',
    country: 'ZA', city: 'South Africa', status: 'VERIFIED',
    contact_email: 'hair@afrideal.co.bw', contact_phone: '',
    registration_no: '', joined_at: daysAgo(1),
    rating: 0, fulfilment_rate: 0, reliability_score: 60, avg_fulfilment_days: 5,
    total_gmv: 0, products_count: 5, orders_count: 0,
    verification_docs: docTemplate('APPROVED', 1), categories: ['c1'],
  },
  {
    // The first supplier outside Botswana and South Africa (spec 0009): a
    // Maseru workwear maker, quoting in maloti.
    id: 's010', name: 'Maluti Workwear', legal_name: 'Maluti Workwear (Pty) Ltd', initials: 'MW',
    country: 'LS', city: 'Maseru', status: 'VERIFIED',
    contact_email: 'orders@malutiworkwear.co.ls', contact_phone: '+266 2231 4470',
    registration_no: 'LS-2018/04417', joined_at: daysAgo(60),
    rating: 4.3, fulfilment_rate: 90, reliability_score: 80, avg_fulfilment_days: 5,
    total_gmv: 0, products_count: 1, orders_count: 0,
    verification_docs: docTemplate('APPROVED', 58), categories: ['c6'],
  },
];

// ─── Products and supplier offers ────────────────────────────────────────────

/**
 * Each product declares its offers as [supplier_id, supplier_cost, stock,
 * fulfilment_days, moq]. The selling price is then derived from the *highest*
 * supplier cost so the platform never sells below what its most expensive
 * routed supplier charges.
 */
const productSpecs = [
  {
    id: 'p001', name: 'Shea Butter Deep Treatment 500ml', category_id: 'c7', emoji: '🧴',
    swatch: ['#D4920A', '#8B5E0A'],
    short_description: 'Unrefined West African shea, cold-pressed, salon strength.',
    description:
      'A deep conditioning treatment built on unrefined shea butter sourced through the Ghana–Botswana trade corridor. Sold into salons across Gaborone and Francistown at volume, and stocked as a retail line by three of the four largest beauty chains in the country. Fragrance-free base, no added parabens.',
    specs: [['Volume', '500ml'], ['Base', 'Unrefined shea butter'], ['Shelf life', '24 months'], ['Origin', 'Ghana / repacked BW']],
    variants: [['Single tub', 'SHB-500-1', 0], ['Case of 6', 'SHB-500-6', 5.4], ['Case of 12', 'SHB-500-12', 10.2]],
    offers: [['s001', 82, 340, 2, 6], ['s002', 76, 180, 4, 12], ['s005', 91, 0, 6, 6]],
    rating: 4.8, review_count: 214, featured: true,
  },
  {
    id: 'p003', name: 'Argan Repair Serum 100ml', category_id: 'c7', emoji: '💧',
    swatch: ['#f0c040', '#D4920A'],
    short_description: 'Cold-pressed Moroccan argan with a lightweight silicone carrier.',
    description:
      'A finishing serum for chemically treated hair. Cold-pressed argan oil in a lightweight carrier that does not weigh down a blow-dry. Popular as an add-on sale at the till rather than a planned purchase, which makes it a reliable margin line.',
    specs: [['Volume', '100ml'], ['Key oil', 'Moroccan argan'], ['Finish', 'Non-greasy'], ['Shelf life', '18 months']],
    variants: [['Single bottle', 'ARG-100-1', 0], ['Case of 12', 'ARG-100-12', 8.0]],
    offers: [['s002', 64, 290, 3, 12], ['s001', 71, 95, 2, 6], ['s005', 68, 140, 5, 12]],
    rating: 4.5, review_count: 156, featured: false,
  },
  {
    id: 'p004', name: 'Solar Power Bank 20 000mAh', category_id: 'c2', emoji: '🔋',
    swatch: ['#1a1a1a', '#2a2a2a'],
    short_description: 'IP65 solar bank with dual USB-C PD and a 3W panel.',
    description:
      'Built for households and field crews on unreliable grid supply. A 20 000mAh cell with dual USB-C power delivery and a 3W monocrystalline panel for trickle top-up. The panel will not charge it from flat in a day — it is a maintenance charge, not a primary source, and the listing says so plainly.',
    specs: [['Capacity', '20 000mAh'], ['Panel', '3W monocrystalline'], ['Ports', '2× USB-C PD, 1× USB-A'], ['Rating', 'IP65'], ['Warranty', '12 months']],
    variants: [['Black', 'SPB-20-BK', 0], ['Desert Sand', 'SPB-20-DS', 0], ['Olive', 'SPB-20-OL', 0]],
    offers: [['s003', 386, 145, 3, 1], ['s005', 402, 60, 5, 5]],
    rating: 4.4, review_count: 92, featured: true,
  },
  {
    id: 'p005', name: 'Wireless Earbuds Pro ANC', category_id: 'c2', emoji: '🎧',
    swatch: ['#2a2a2a', '#4d4d4d'],
    short_description: 'Hybrid active noise cancellation, 32h with the case.',
    description:
      'Hybrid ANC earbuds with a 32-hour total runtime including the charging case. Bluetooth 5.3 with multipoint, so they hold a laptop and a phone at once. The most returned item on the platform in its first month, which is why the size guide now sits above the fold.',
    specs: [['ANC', 'Hybrid, 35dB'], ['Runtime', '8h buds / 32h case'], ['Bluetooth', '5.3 multipoint'], ['Charging', 'USB-C + Qi'], ['Warranty', '12 months']],
    variants: [['Midnight', 'WEP-ANC-MN', 0], ['Pearl', 'WEP-ANC-PL', 0]],
    offers: [['s003', 512, 88, 2, 1], ['s005', 534, 210, 5, 10], ['s002', 549, 0, 7, 5]],
    rating: 4.2, review_count: 141, featured: false,
  },
  {
    id: 'p006', name: 'Portland Cement 42.5N — 50kg', category_id: 'c3', emoji: '🧱',
    swatch: ['#8A918B', '#5A615C'],
    short_description: 'CEM II 42.5N structural grade, palletised.',
    description:
      'Structural grade cement to SANS 50197-1, supplied palletised at 40 bags. The default specification for slab and column work on residential builds across the south-east district. Sold per bag or per pallet; pallet pricing is where contractors actually buy.',
    specs: [['Grade', 'CEM II 42.5N'], ['Bag', '50kg'], ['Pallet', '40 bags'], ['Standard', 'SANS 50197-1']],
    variants: [['Single bag', 'CEM-425-1', 0], ['Half pallet — 20 bags', 'CEM-425-20', 0], ['Full pallet — 40 bags', 'CEM-425-40', 0]],
    offers: [['s004', 78, 4800, 1, 20], ['s005', 86, 1200, 4, 40]],
    rating: 4.9, review_count: 67, featured: true,
  },
  {
    id: 'p007', name: 'Corrugated Roofing Sheet 3.6m', category_id: 'c3', emoji: '🏗️',
    swatch: ['#5A615C', '#2a2a2a'],
    short_description: 'Galvanised IBR profile, 0.5mm, Z275 coated.',
    description:
      'IBR profile galvanised sheeting at 0.5mm gauge with a Z275 zinc coating, cut to 3.6m. The standard span for a single-storey pitched roof in the region. Delivered flat-packed and strapped; the platform does not carry the fixings, which is called out on the listing so nobody orders a roof and no screws.',
    specs: [['Profile', 'IBR 686'], ['Gauge', '0.5mm'], ['Coating', 'Z275 galvanised'], ['Length', '3.6m'], ['Cover width', '686mm']],
    variants: [['Galvanised', 'IBR-36-GV', 0], ['Charcoal coated', 'IBR-36-CH', 12.0], ['Brick red coated', 'IBR-36-BR', 12.0]],
    offers: [['s004', 214, 960, 2, 10], ['s005', 231, 340, 5, 20]],
    rating: 4.7, review_count: 44, featured: false,
  },
  {
    id: 'p008', name: 'White Maize Meal — 12.5kg', category_id: 'c4', emoji: '🌽',
    swatch: ['#f0c040', '#D4920A'],
    short_description: 'Super-sifted white maize, milled in Botswana.',
    description:
      'Super-sifted white maize meal milled locally and packed in 12.5kg woven bags. The single highest-volume staple line on the platform, bought almost entirely by tuck shops and small retailers on a weekly reorder cycle.',
    specs: [['Weight', '12.5kg'], ['Grade', 'Super sifted'], ['Milled', 'Botswana'], ['Shelf life', '9 months']],
    variants: [['Single bag', 'MZE-125-1', 0], ['Bale of 4', 'MZE-125-4', 0]],
    offers: [['s005', 96, 1400, 4, 4], ['s006', 89, 800, 2, 4]],
    rating: 4.6, review_count: 302, featured: true,
  },
  {
    id: 'p009', name: 'Certified Sorghum Seed — 25kg', category_id: 'c4', emoji: '🌾',
    swatch: ['#1A5C2A', '#0F3A1B'],
    short_description: 'Drought-tolerant Segaolane, certified, treated.',
    description:
      'Certified Segaolane sorghum seed, the variety the extension service recommends for the eastern hardveld. Treated against seed-borne smut and packed at 25kg, which plants roughly three hectares at conventional spacing. Sold in season only.',
    specs: [['Variety', 'Segaolane'], ['Weight', '25kg'], ['Treatment', 'Fungicide dressed'], ['Coverage', '≈3 ha'], ['Certification', 'Seed Unit certified']],
    variants: [['25kg bag', 'SRG-25-1', 0], ['Pallet — 20 bags', 'SRG-25-20', 0]],
    offers: [['s006', 428, 220, 3, 1], ['s005', 461, 90, 6, 5]],
    rating: 4.8, review_count: 38, featured: false,
  },
  {
    id: 'p010', name: 'A4 Copy Paper — Box of 5 Reams', category_id: 'c5', emoji: '📄',
    swatch: ['#ECEBE7', '#8A918B'],
    short_description: '80gsm, FSC certified, 2500 sheets.',
    description:
      'The reorder line every office runs out of at the worst moment. 80gsm FSC-certified A4 at 2500 sheets to the box. Nothing interesting about it, which is the point — it needs to arrive on the day it was promised and cost what it said it would.',
    specs: [['Size', 'A4 210×297mm'], ['Weight', '80gsm'], ['Sheets', '2500 (5 reams)'], ['Certification', 'FSC Mix'], ['Brightness', '161 CIE']],
    variants: [['Single box', 'A4-80-1', 0], ['Carton of 5 boxes', 'A4-80-5', 0]],
    offers: [['s007', 168, 400, 2, 1], ['s005', 182, 260, 5, 5]],
    rating: 4.3, review_count: 89, featured: false,
  },
  {
    id: 'p011', name: 'Heavy-Duty Cotton Work Overall', category_id: 'c6', emoji: '🦺',
    swatch: ['#1A5C2A', '#2E7D3F'],
    short_description: '100% cotton, D59 conti-suit, reflective banded.',
    description:
      'A two-piece conti-suit in 100% cotton D59, with reflective banding on the arms and legs. Cut for site work in heat — the cotton matters, and the polyester equivalents that undercut it on price fail the same flame test. Sold to construction and municipal buyers.',
    specs: [['Fabric', '100% cotton D59'], ['Style', 'Two-piece conti-suit'], ['Reflective', 'Arms and legs'], ['Sizes', '32–46'], ['Colours', 'Navy, royal, orange']],
    variants: [['Navy', 'OVR-D59-NV', 0], ['Royal Blue', 'OVR-D59-RB', 0], ['Hi-Viz Orange', 'OVR-D59-OR', 15.0]],
    offers: [['s002', 186, 240, 4, 10], ['s005', 199, 130, 5, 20]],
    rating: 4.5, review_count: 73, featured: false,
  },
  {
    id: 'p012', name: 'School Uniform Set — Primary', category_id: 'c6', emoji: '🎒',
    swatch: ['#2E7D3F', '#1A5C2A'],
    short_description: 'Shirt, shorts or skirt, jersey. Poly-cotton blend.',
    description:
      'A complete primary set in a 65/35 poly-cotton blend that survives a term of washing. Demand on this line is violently seasonal — it does roughly nine months of volume in the four weeks before January intake, which is exactly the kind of spike the supplier routing engine exists to absorb.',
    specs: [['Blend', '65/35 poly-cotton'], ['Includes', 'Shirt, bottom, jersey'], ['Sizes', 'Age 5–13'], ['Care', 'Machine wash 40°C']],
    variants: [['Age 5–7', 'UNI-PRI-57', 0], ['Age 8–10', 'UNI-PRI-810', 8.0], ['Age 11–13', 'UNI-PRI-1113', 16.0]],
    offers: [['s002', 142, 380, 3, 10], ['s005', 154, 90, 6, 20]],
    rating: 4.4, review_count: 218, featured: true,
  },
];

/**
 * AfriDeal's own wigs (spec 0007), from the product owner's WhatsApp messages of
 * 2026-10-19/20, sold under the AfriDeal brand. Each length has its own supplier
 * price in rand, so each length is a variant with its own cost and its own
 * ladder rather than an uplift over a base price.
 *
 * Names follow her AfriDeal product boards (the second photo of each product,
 * in public/products as <id>-1.jpg; the model shot is <id>-0.jpg). Still to
 * confirm with her, so kept honest here: no hair grade, density or cap claims
 * in the specs beyond what the boards print; the supplier is unnamed, so the
 * offers sit with AfriDeal's own sourcing record (s009); stock and lead time
 * are placeholders; no ratings or reviews exist yet. Product 1's lengths come
 * from her price list CSV, sent with its photo.
 */
const HAIR_SOURCING = { supplier_id: 's009', stock: 50, fulfilment_days: 5, moq: 1 };

const afridealWigSpecs = [
  {
    id: 'p018', name: 'Sleek Straight Lace Bob Wig', emoji: '💇🏾‍♀️', swatch: ['#1c1714', '#0a0a0a'],
    short_description: 'A sleek, straight bob on a lace front. 8 to 16 inch.',
    description:
      'A sleek, straight bob on a lace front, cut to sit at the jaw with a natural parting. Sold by length from 8 to 16 inches. Mix lengths and styles from the AfriDeal hair range and they count together towards the multi-buy and bulk prices.',
    style: 'Straight bob', front: 'Lace front',
    // Her board shows the crown from above in place of a back view.
    views: ['Front view', 'Side view', 'Top view'],
    lengths: [['8 inch', 280], ['10 inch', 450], ['12 inch', 630], ['14 inch', 830], ['16 inch', 1060]],
  },
  {
    id: 'p019', name: 'Straight Bob Wig with Fringe', emoji: '👩🏾', swatch: ['#211812', '#0d0b0a'],
    short_description: 'A straight bob with a full fringe. 8 to 12 inch.',
    description:
      'A straight bob with a full fringe, finished at the jaw. Sold by length from 8 to 12 inches. Mix lengths and styles from the AfriDeal hair range and they count together towards the multi-buy and bulk prices.',
    style: 'Straight bob, fringe', front: null,
    // Her board for this one is a single side-on photograph.
    views: ['Side view'],
    lengths: [['8 inch', 200], ['10 inch', 250], ['12 inch', 300]],
  },
  {
    id: 'p020', name: 'Long Straight Lace Wig', emoji: '✨', swatch: ['#18120f', '#060606'],
    short_description: 'Long, sleek and straight on a lace front. 20 to 32 inch.',
    description:
      'Long, sleek and straight on a lace front, with a middle parting. Sold by length from 20 to 32 inches. Mix lengths and styles from the AfriDeal hair range and they count together towards the multi-buy and bulk prices.',
    style: 'Long straight', front: 'Lace front',
    lengths: [['20 inch', 1000], ['22 inch', 1100], ['24 inch', 1300], ['26 inch', 1450], ['28 inch', 1750], ['30 inch', 1850], ['32 inch', 2100]],
  },
  {
    // Product 4. Her board: "13*4 Waterwave hair 200% density".
    id: 'p021', name: 'Water Wave Lace Wig', emoji: '👩🏾‍🦱', swatch: ['#231a14', '#0b0908'],
    short_description: 'Full, defined water-wave curls on a lace front. 20 to 32 inch.',
    description:
      'Full, defined water-wave curls with plenty of volume, on a lace front. Sold by length from 20 to 32 inches. Mix lengths and styles from the AfriDeal hair range and they count together towards the multi-buy and bulk prices.',
    style: 'Water wave', front: 'Lace front',
    lengths: [['20 inch', 950], ['22 inch', 1050], ['24 inch', 1180], ['26 inch', 1400], ['28 inch', 1600], ['30 inch', 1800], ['32 inch', 2000]],
  },
  {
    // Product 5. Her board: "13*4 Pixie Curl 200% density".
    id: 'p022', name: 'Pixie Curl Lace Wig', emoji: '🌀', swatch: ['#2a1f17', '#0e0b09'],
    short_description: 'Natural, voluminous pixie curls on a lace front. 20 to 24 inch.',
    description:
      'Natural, voluminous pixie curls on a lace front. Sold by length from 20 to 24 inches. Mix lengths and styles from the AfriDeal hair range and they count together towards the multi-buy and bulk prices.',
    style: 'Pixie curl', front: 'Lace front',
    lengths: [['20 inch', 950], ['22 inch', 1050], ['24 inch', 1180]],
  },
  {
    // Product 8, sent 2026-10-20 23:55. There is no Product 6 in the chat.
    id: 'p023', name: 'Kinky Straight Lace Wig', emoji: '🖤', swatch: ['#1a1410', '#070605'],
    short_description: 'Long, full kinky-straight hair on a lace front. 20 to 32 inch.',
    description:
      'Long, full hair with a natural kinky-straight texture, on a lace front with a middle parting. Sold by length from 20 to 32 inches. Mix lengths and styles from the AfriDeal hair range and they count together towards the multi-buy and bulk prices.',
    style: 'Kinky straight', front: 'Lace front',
    lengths: [['20 inch', 1050], ['22 inch', 1150], ['24 inch', 1250], ['26 inch', 1450], ['28 inch', 1600], ['30 inch', 1850], ['32 inch', 2000]],
  },
  {
    // Product 9, sent 2026-10-21 12:55. Her board: "13*4 Jerry Curl 200%".
    id: 'p024', name: 'Jerry Curl Lace Wig', emoji: '➰', swatch: ['#241a15', '#0a0807'],
    short_description: 'Long, tight jerry curls on a lace front. 20 to 32 inch.',
    description:
      'Long, tight jerry curls with full volume from root to tip, on a lace front. Sold by length from 20 to 32 inches. Mix lengths and styles from the AfriDeal hair range and they count together towards the multi-buy and bulk prices.',
    style: 'Jerry curl', front: 'Lace front',
    lengths: [['20 inch', 950], ['22 inch', 1050], ['24 inch', 1180], ['26 inch', 1400], ['28 inch', 1600], ['30 inch', 1800], ['32 inch', 2000]],
  },
];

/*
 * What each wig photo shows. Slot 0 is her styled shot; slots 1 to 3 are the
 * views cut out of her product board (never the whole board, which carries
 * her marketing copy). The crops are made by hand and dropped into
 * public/products; the seed only names them.
 */
const WIG_PHOTO_CAPTIONS = new Map(
  afridealWigSpecs.map((wig) => [wig.id, ['Styled', ...(wig.views ?? ['Front view', 'Side view', 'Back view'])]]),
);

for (const wig of afridealWigSpecs) {
  const code = wig.id.toUpperCase();
  productSpecs.push({
    id: wig.id,
    name: wig.name,
    category_id: 'c1',
    emoji: wig.emoji,
    swatch: wig.swatch,
    short_description: wig.short_description,
    description: wig.description,
    specs: [
      ['Lengths', `${wig.lengths[0][0]} to ${wig.lengths[wig.lengths.length - 1][0]}`],
      ['Style', wig.style],
      ...(wig.front ? [['Front', wig.front]] : []),
      ['Sold by', 'Length, one wig per unit'],
      ['Brand', 'AfriDeal'],
    ],
    variants: wig.lengths.map(([label]) => [label, `${code}-${label.replace(/\D/g, '')}`, 0]),
    cost_currency: 'ZAR',
    variant_costs: wig.lengths.map(([, cost]) => cost),
    offers: [[
      HAIR_SOURCING.supplier_id,
      Math.min(...wig.lengths.map(([, cost]) => cost)),
      HAIR_SOURCING.stock,
      HAIR_SOURCING.fulfilment_days,
      HAIR_SOURCING.moq,
    ]],
    rating: 0, review_count: 0, featured: true,
  });
}

/** Products whose only supplier is AfriDeal's own sourcing, by design. */
const SINGLE_SOURCE = new Set(afridealWigSpecs.map((wig) => wig.id));

const products = [];
const supplierOffers = [];
let offerSeq = 1;

for (const spec of productSpecs) {
  const rule = ruleFor(spec.category_id);
  const currency = spec.cost_currency ?? 'BWP';
  const highestCost = Math.max(...spec.offers.map(([, cost]) => cost));
  const variantIds = spec.variants.map((_, i) => `${spec.id}v${i + 1}`);

  /*
   * A product sold by length prices every variant from its own landed cost.
   * Everything else prices the base from the dearest supplier we might route to
   * and lifts each variant by its uplift.
   */
  const variantPrices = spec.variant_costs
    ? spec.variant_costs.map((cost) => calculatePrice(landedFor(cost, currency, spec.category_id), rule))
    : null;
  const basePrice = variantPrices
    ? Math.min(...variantPrices)
    : calculatePrice(landedFor(highestCost, currency, spec.category_id), rule);

  products.push({
    id: spec.id,
    name: spec.name,
    slug: spec.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    category_id: spec.category_id,
    emoji: spec.emoji,
    swatch: spec.swatch,
    short_description: spec.short_description,
    description: spec.description,
    specs: spec.specs.map(([label, value]) => ({ label, value })),
    variants: spec.variants.map(([label, sku, uplift], i) => ({
      id: variantIds[i],
      label,
      sku,
      price: variantPrices ? variantPrices[i] : Math.ceil(basePrice * (1 + uplift / 100)),
    })),
    price: basePrice,
    status: 'ACTIVE',
    rating: spec.rating,
    review_count: spec.review_count,
    featured: spec.featured,
    // Never in the future: a band is only live from its product's created_at.
    created_at: daysAgo(Math.max(1, 120 - productSpecs.indexOf(spec) * 6)),
  });

  for (const [supplier_id, supplier_cost, stock, fulfilment_days, moq] of spec.offers) {
    supplierOffers.push({
      id: `so${String(offerSeq++).padStart(3, '0')}`,
      product_id: spec.id,
      supplier_id,
      supplier_cost,
      ...(spec.cost_currency ? { cost_currency: spec.cost_currency } : {}),
      ...(spec.variant_costs
        ? {
            variant_costs: spec.variant_costs.map((cost, i) => ({
              variant_id: variantIds[i],
              cost,
            })),
          }
        : {}),
      stock,
      fulfilment_days,
      moq,
      last_updated: daysAgo(Math.floor(rand() * 20) + 1),
      active: true,
    });
  }
}

/*
 * Maluti Workwear's offer on the work overall, in maloti (spec 0009). Below the
 * dearest existing offer, so the published price (set from the worst routable
 * cost) does not move; its date is fixed so the seeded random stream does not.
 */
supplierOffers.push({
  id: `so${String(offerSeq++).padStart(3, '0')}`,
  product_id: 'p011',
  supplier_id: 's010',
  supplier_cost: 180,
  cost_currency: 'LSL',
  stock: 160,
  fulfilment_days: 5,
  moq: 10,
  last_updated: daysAgo(3),
  active: true,
});

// ─── Supplier selection (mirrors lib/supplier-selection.ts) ──────────────────

const supplierById = new Map(suppliers.map((s) => [s.id, s]));

function scoreOffer(offer, supplier) {
  return (
    supplier.reliability_score * 0.35 +
    (offer.stock > 0 ? 20 : 0) +
    (100 - offer.fulfilment_days * 5) * 0.25 +
    supplier.rating * 4 * 0.2 +
    (offer.supplier_cost > 0 ? (1000 / offer.supplier_cost) * 0.2 : 0)
  );
}

function routeFor(productId, qty) {
  const ranked = supplierOffers
    .filter((o) => o.product_id === productId && o.active)
    .map((o) => ({ offer: o, supplier: supplierById.get(o.supplier_id) }))
    .filter(({ supplier }) => supplier && supplier.status === 'VERIFIED')
    .map((entry) => ({ ...entry, score: scoreOffer(entry.offer, entry.supplier) }))
    .sort((a, b) => b.score - a.score);

  return ranked.find((entry) => entry.offer.stock >= qty) ?? ranked[0] ?? null;
}

function reasonFor(entry) {
  const { offer, supplier } = entry;
  const bits = [];
  if (supplier.reliability_score >= 85) bits.push(`${supplier.reliability_score}/100 reliability`);
  if (offer.fulfilment_days <= 2) bits.push(`${offer.fulfilment_days}-day fulfilment`);
  if (supplier.rating >= 4.5) bits.push(`${supplier.rating.toFixed(1)}★ rating`);
  const body = bits.length ? bits.join(', ') : 'a balanced cost and reliability profile';
  return `Selected on ${body}. In stock (${offer.stock} units), ships in ${offer.fulfilment_days} day${offer.fulfilment_days === 1 ? '' : 's'}.`;
}

// ─── Users ───────────────────────────────────────────────────────────────────

const users = [
  { id: 'u001', name: 'AfriDeal Admin', email: 'admin@afrideal.co.bw', role: 'SUPER_ADMIN', avatar: 'AA', status: 'ACTIVE' },
  { id: 'u002', name: 'Keabetswe Molapo', email: 'ops@afrideal.co.bw', role: 'OPERATIONS_ADMIN', avatar: 'KM', status: 'ACTIVE' },
  { id: 'u003', name: 'Naledi Beauty Supplies', email: 'supplier@naledi.co.bw', role: 'SUPPLIER_OWNER', supplier_id: 's001', avatar: 'NB', status: 'ACTIVE' },
  { id: 'u004', name: 'GlowUp Distributors', email: 'supplier@glowup.co.za', role: 'SUPPLIER_OWNER', supplier_id: 's002', avatar: 'GU', status: 'ACTIVE' },
  { id: 'u005', name: 'Kagiso Sithole', email: 'runner@afrideal.co.bw', role: 'RUNNER', runner_id: 'r001', avatar: 'KS', status: 'ACTIVE' },
  { id: 'u006', name: 'Thabo Modise', email: 'thabo@gmail.com', role: 'CUSTOMER', avatar: 'TM', status: 'ACTIVE' },
  { id: 'u007', name: 'Kefilwe Dithebe', email: 'kefilwe@gmail.com', role: 'CUSTOMER', avatar: 'KD', status: 'ACTIVE' },
  { id: 'u008', name: 'Finance Admin', email: 'finance@afrideal.co.bw', role: 'FINANCE_ADMIN', avatar: 'FA', status: 'ACTIVE' },
];

// ─── Runners ─────────────────────────────────────────────────────────────────

/*
 * Runners work where they are (spec 0009): each has a country and the towns
 * they take jobs in. A job alerts the online runners serving its pickup town.
 */
const runners = [
  {
    id: 'r001', user_id: 'u005', name: 'Kagiso Sithole', initials: 'KS', phone: '+267 72 118 449',
    vehicle: 'Toyota Hilux single cab', plate: 'B 481 AQR', city: 'Gaborone',
    country: 'BW', towns: ['Gaborone', 'Mogoditshane', 'Tlokweng'],
    online: true, rating: 4.9, deliveries_completed: 312, earnings_mtd: 4_180, earnings_total: 61_420,
  },
  {
    id: 'r002', user_id: null, name: 'Onalenna Phiri', initials: 'OP', phone: '+267 71 903 226',
    vehicle: 'Nissan NP200', plate: 'B 772 BKM', city: 'Gaborone',
    country: 'BW', towns: ['Gaborone', 'Lobatse', 'Kanye'],
    online: false, rating: 4.7, deliveries_completed: 198, earnings_mtd: 2_640, earnings_total: 38_900,
  },
  {
    id: 'r003', user_id: null, name: 'Lesedi Kgosi', initials: 'LK', phone: '+267 74 552 018',
    vehicle: 'Motorcycle — Honda CG125', plate: 'B 219 CDN', city: 'Francistown',
    country: 'BW', towns: ['Francistown'],
    online: true, rating: 4.6, deliveries_completed: 141, earnings_mtd: 1_980, earnings_total: 22_150,
  },
  {
    // The first runner outside Botswana (spec 0009).
    id: 'r004', user_id: null, name: 'Palesa Mokoena', initials: 'PM', phone: '+266 5884 2210',
    vehicle: 'Toyota Quantum', plate: 'A 4471', city: 'Maseru',
    country: 'LS', towns: ['Maseru', 'Teyateyaneng', 'Maputsoe'],
    online: false, rating: 4.8, deliveries_completed: 37, earnings_mtd: 620, earnings_total: 5_410,
  },
];

/*
 * Listed courier and clearance partners (spec 0008, generalised by spec 0009):
 * each lists the routes it serves with a fee rule per route. Gorosa's two
 * routes are from the product owner's messages of 2026-10-20/21: cut-off P2,000,
 * Gaborone P250 or 16%, Francistown P300 or 21%, P200 for launch to Gaborone
 * (she gave no end date), P130 of the Gaborone fee owed to Gorosa. Kedi's is
 * the second courier she named; it joins once she sends its routes and fees.
 */
const couriers = [
  {
    id: 'cr001', name: 'Gorosa Express Logistics', role: 'CROSS_BORDER_CLEARANCE', sort_order: 1, active: true,
    trips_per_week: 2, insured: true, phone: '+27 73 932 7292',
    depot: { country: 'ZA', city: 'Johannesburg', address: '2A Kikuyu Road, Sunninghill Self-Storage, Sunninghill' },
    consignee_format: '{first} {last} Gorosa',
    // Paid to Gorosa directly, never through AfriDeal (spec 0008, answer of 2026-10-22).
    payment_options: ['ON_ARRIVAL'],
    routes: [
      {
        from: { country: 'ZA' },
        to: { country: 'BW', city: 'Gaborone' },
        fee: { threshold: 2000, flat: 250, pct: 0.16, launch_flat: 200, launch_until: null },
        payable: { flat: 130, pct: null },
      },
      {
        from: { country: 'ZA' },
        to: { country: 'BW', city: 'Francistown' },
        fee: { threshold: 2000, flat: 300, pct: 0.21, launch_flat: null, launch_until: null },
        payable: { flat: null, pct: null },
      },
    ],
  },
];

// ─── Runner sourcing requests ────────────────────────────────────────────────

/**
 * The second way onto the platform: a buyer describes something the catalogue
 * does not carry, and a verified runner goes and finds it.
 *
 * Seeded across the whole state machine so the runner portal and the customer's
 * request list both have something real to render, including one request still
 * waiting for a runner to accept it.
 *
 * [status, customer, daysAgo, item, detail, qty, budget, city, address, runner]
 */
const runnerRequestSpecs = [
  [
    'REQUESTED', 'u006', 0,
    'Ghana-weave 22 inch, natural black',
    'Two suppliers in Gaborone had it last month and both are out. Any colour close to 1B is fine, but it has to be human hair, not synthetic.',
    6, 640, 'Gaborone', 'Plot 5412, Extension 12', null,
  ],
  [
    'SOURCING', 'u007', 2,
    'Salon backwash chair, second-hand acceptable',
    'Replacing one that broke. Ceramic basin, adjustable, must have a working mixer tap. Would rather pay more for something that lasts than buy new and cheap.',
    1, 3200, 'Gaborone', 'Plot 220, Block 6, Broadhurst', 'r001',
  ],
  [
    'QUOTED', 'u006', 4,
    'Hooded dryer, 2-seat, 220V',
    'For a salon in Extension 12. Needs to run off normal household power, not three-phase.',
    2, 2800, 'Gaborone', 'Plot 5412, Extension 12', 'r001',
  ],
  [
    'DELIVERING', 'u007', 7,
    'Wig display mannequin heads, canvas block',
    'Twelve of them for a shop fit-out. Canvas block rather than polystyrene, they need to take pins.',
    12, 180, 'Gaborone', 'Plot 220, Block 6, Broadhurst', 'r002',
  ],
  [
    'CONFIRMED', 'u006', 16,
    'Industrial hair steamer, floor standing',
    'Whatever the two big beauty wholesalers on Lobatse Road have in stock.',
    1, 4500, 'Gaborone', 'Plot 5412, Extension 12', 'r001',
  ],
];

const RUNNER_REQUEST_FLOW = {
  REQUESTED: [['REQUESTED', 'Request submitted']],
  ACCEPTED: [['REQUESTED', 'Request submitted'], ['ACCEPTED', 'Runner accepted the job']],
  SOURCING: [['REQUESTED', 'Request submitted'], ['ACCEPTED', 'Runner accepted the job'], ['SOURCING', 'Runner is out looking']],
  QUOTED: [['REQUESTED', 'Request submitted'], ['ACCEPTED', 'Runner accepted the job'], ['SOURCING', 'Runner is out looking'], ['QUOTED', 'Found it, price sent for approval']],
  APPROVED: [['REQUESTED', 'Request submitted'], ['ACCEPTED', 'Runner accepted the job'], ['SOURCING', 'Runner is out looking'], ['QUOTED', 'Found it, price sent for approval'], ['APPROVED', 'Customer approved the purchase']],
  DELIVERING: [['REQUESTED', 'Request submitted'], ['ACCEPTED', 'Runner accepted the job'], ['SOURCING', 'Runner is out looking'], ['QUOTED', 'Found it, price sent for approval'], ['APPROVED', 'Customer approved the purchase'], ['DELIVERING', 'Bought and on the way']],
  CONFIRMED: [['REQUESTED', 'Request submitted'], ['ACCEPTED', 'Runner accepted the job'], ['SOURCING', 'Runner is out looking'], ['QUOTED', 'Found it, price sent for approval'], ['APPROVED', 'Customer approved the purchase'], ['DELIVERING', 'Bought and on the way'], ['CONFIRMED', 'Delivered and confirmed by customer']],
};

/** The runner's fee for sourcing, as a share of what the goods cost. */
const SOURCING_FEE_RATE = 0.12;

const runnerRequests = [];

runnerRequestSpecs.forEach((spec, index) => {
  const [status, customerId, daysAgoPlaced, item, detail, quantity, budget, city, address, runnerId] = spec;
  const customer = users.find((user) => user.id === customerId);
  const runner = runnerId ? runners.find((entry) => entry.id === runnerId) : null;
  const createdAt = daysAgo(daysAgoPlaced, 8 + (index % 9));

  const steps = RUNNER_REQUEST_FLOW[status];
  const timeline = steps.map(([code, label], step) => ({
    status: code,
    label,
    at: daysAgo(Math.max(0, daysAgoPlaced - step), 9 + step),
    actor: step === 0 ? customer.name : (runner?.name ?? 'AfriDeal operations'),
  }));

  /*
   * A quote exists only once the runner has actually found the item. Anything
   * earlier would be the platform guessing on a runner's behalf, which is the
   * one thing this flow exists to avoid.
   */
  const quoted = ['QUOTED', 'APPROVED', 'DELIVERING', 'CONFIRMED'].includes(status);
  const unitPrice = quoted ? Math.ceil(budget * 0.94) : 0;
  const goodsTotal = unitPrice * quantity;
  const serviceFee = quoted ? Math.ceil(goodsTotal * SOURCING_FEE_RATE) : 0;

  runnerRequests.push({
    id: `rr${String(index + 1).padStart(3, '0')}`,
    reference: `RUN-${24810 + index}`,
    customer_id: customerId,
    customer_name: customer.name,
    item,
    detail,
    quantity,
    budget_per_unit: budget,
    delivery_city: city,
    delivery_address: address,
    needed_by: daysAhead(4 + index * 2),
    status,
    runner_id: runnerId,
    runner_name: runner?.name ?? null,
    quote: quoted
      ? {
          unit_price: unitPrice,
          service_fee: serviceFee,
          total: goodsTotal + serviceFee,
          found_at: index === 2 ? 'Beauty wholesaler, Lobatse Road' : 'Broadhurst trade counter',
          condition: index === 1 ? 'Second-hand, working, some scuffing to the base' : 'New, sealed',
          note:
            index === 2
              ? 'Two units in stock. Runs on 220V single phase as asked.'
              : 'Runner inspected before quoting.',
        }
      : null,
    created_at: createdAt,
    updated_at: timeline[timeline.length - 1].at,
    timeline,
  });
});

// ─── Orders ──────────────────────────────────────────────────────────────────

/**
 * [status, customer, daysAgo, payment, city, address, lines[[productId, variantIdx, qty]]]
 * Status mix is fixed by the brief: 4 delivered, 3 in transit, 3 processing,
 * 2 pending, 2 disputed, 1 cancelled.
 */
const orderSpecs = [
  ['DELIVERED', 'u006', 27, 'DPO_PAY', 'Gaborone', 'Plot 5412, Extension 12', [['p001', 1, 2], ['p003', 0, 3]]],
  ['DELIVERED', 'u007', 24, 'ORANGE_MONEY', 'Gaborone', 'Plot 220, Block 6, Broadhurst', [['p006', 2, 1]]],
  ['DELIVERED', 'u006', 19, 'PAYGATE', 'Gaborone', 'Plot 5412, Extension 12', [['p004', 0, 1], ['p005', 0, 1]]],
  ['DELIVERED', 'u007', 15, 'DPO_PAY', 'Francistown', 'Plot 1180, Tati Siding', [['p008', 1, 4], ['p010', 0, 2]]],
  ['IN_TRANSIT', 'u006', 6, 'ORANGE_MONEY', 'Gaborone', 'Plot 5412, Extension 12', [['p001', 0, 5]]],
  ['IN_TRANSIT', 'u007', 5, 'DPO_PAY', 'Gaborone', 'Plot 220, Block 6, Broadhurst', [['p007', 0, 8], ['p006', 0, 12]]],
  ['IN_TRANSIT', 'u006', 4, 'PAYGATE', 'Lobatse', 'Plot 88, Peleng Ward', [['p012', 1, 3], ['p011', 0, 2]]],
  ['PROCESSING', 'u007', 3, 'DPO_PAY', 'Gaborone', 'Plot 220, Block 6, Broadhurst', [['p001', 2, 1], ['p003', 1, 1]]],
  ['PROCESSING', 'u006', 2, 'ORANGE_MONEY', 'Gaborone', 'Plot 5412, Extension 12', [['p009', 0, 2]]],
  ['PROCESSING', 'u007', 2, 'PAYGATE', 'Maun', 'Plot 3301, Boseja Ward', [['p008', 0, 6]]],
  ['AWAITING_PAYMENT', 'u006', 1, 'DPO_PAY', 'Gaborone', 'Plot 5412, Extension 12', [['p005', 1, 1]]],
  ['AWAITING_PAYMENT', 'u007', 0, 'EFT', 'Gaborone', 'Plot 220, Block 6, Broadhurst', [['p010', 1, 1], ['p001', 0, 2]]],
  ['DISPUTED', 'u006', 12, 'PAYGATE', 'Gaborone', 'Plot 5412, Extension 12', [['p005', 0, 2]]],
  ['DISPUTED', 'u007', 9, 'DPO_PAY', 'Francistown', 'Plot 1180, Tati Siding', [['p007', 1, 6]]],
  ['CANCELLED', 'u006', 21, 'ORANGE_MONEY', 'Gaborone', 'Plot 5412, Extension 12', [['p004', 2, 1]]],
];

const TIMELINE_BY_STATUS = {
  // Spec 0003: an unpaid order has been placed and nothing more. It raises no
  // supplier leg and carries no payment row, which is what AC-2 asserts.
  AWAITING_PAYMENT: [['AWAITING_PAYMENT', 'Order placed, waiting for payment']],
  PENDING: [['PENDING', 'Order placed']],
  PROCESSING: [['PENDING', 'Order placed'], ['PAID', 'Payment confirmed'], ['PROCESSING', 'Supplier confirmed, preparing goods']],
  IN_TRANSIT: [['PENDING', 'Order placed'], ['PAID', 'Payment confirmed'], ['PROCESSING', 'Supplier confirmed, preparing goods'], ['COLLECTED', 'Collected by runner'], ['IN_TRANSIT', 'Out for delivery']],
  DELIVERED: [['PENDING', 'Order placed'], ['PAID', 'Payment confirmed'], ['PROCESSING', 'Supplier confirmed, preparing goods'], ['COLLECTED', 'Collected by runner'], ['IN_TRANSIT', 'Out for delivery'], ['DELIVERED', 'Delivered and confirmed by customer'], ['SETTLED', 'Supplier invoice settled']],
  DISPUTED: [['PENDING', 'Order placed'], ['PAID', 'Payment confirmed'], ['PROCESSING', 'Supplier confirmed, preparing goods'], ['IN_TRANSIT', 'Out for delivery'], ['DISPUTED', 'Customer raised a claim — under review']],
  CANCELLED: [['PENDING', 'Order placed'], ['CANCELLED', 'Cancelled before payment confirmation']],
};

const DELIVERY_FEE = 45;

/**
 * Paid, but the supplier has not confirmed yet: the state confirmPayment()
 * leaves every new order in. Under spec 0003 the unpaid orders no longer carry
 * supplier legs, so without this nothing in the seed would be waiting for a
 * supplier to confirm, and neither the supplier walkthrough nor E02 would have
 * an order to act on. o008 includes Naledi's shea butter.
 */
const AWAITING_SUPPLIER = new Set(['o008']);
const TIMELINE_AWAITING_SUPPLIER = [['PENDING', 'Order placed'], ['PAID', 'Payment confirmed'], ['PROCESSING', 'Sourcing from supplier']];

const orders = [];
const orderItems = [];
const supplierOrders = [];
const payables = [];
const disputes = [];
const shipments = [];

let itemSeq = 1;
let supOrderSeq = 1;
let payableSeq = 1;
let disputeSeq = 1;
let shipmentSeq = 1;

orderSpecs.forEach((spec, index) => {
  const [status, customerId, placedDaysAgo, payment, city, address, lines] = spec;
  const orderId = `o${String(index + 1).padStart(3, '0')}`;
  const customer = users.find((u) => u.id === customerId);
  const placedAt = daysAgo(placedDaysAgo, 9 + (index % 8));

  // Line items, routed to a supplier each.
  const routedLines = lines.map(([productId, variantIdx, qty]) => {
    const product = products.find((p) => p.id === productId);
    const variant = product.variants[variantIdx];
    const route = routeFor(productId, qty);
    const itemId = `oi${String(itemSeq++).padStart(3, '0')}`;

    const item = {
      id: itemId,
      order_id: orderId,
      product_id: productId,
      variant_id: variant.id,
      product_name: product.name,
      variant_label: variant.label,
      emoji: product.emoji,
      qty,
      unit_price: variant.price,
      line_total: variant.price * qty,
      supplier_id: route.supplier.id,
      supplier_cost: route.offer.supplier_cost,
    };

    orderItems.push(item);
    return { item, route };
  });

  const subtotal = routedLines.reduce((sum, { item }) => sum + item.line_total, 0);
  const total = subtotal + DELIVERY_FEE;

  const timeline = ((AWAITING_SUPPLIER.has(orderId) ? TIMELINE_AWAITING_SUPPLIER : TIMELINE_BY_STATUS[status]) ?? []).map(([code, label], i, arr) => ({
    status: code,
    label,
    at: daysAgo(Math.max(0, placedDaysAgo - Math.round((i / Math.max(1, arr.length - 1)) * Math.min(placedDaysAgo, 5))), 9 + i),
  }));

  orders.push({
    id: orderId,
    reference: `AFD-${String(24810 + index)}`,
    customer_id: customerId,
    customer_name: customer.name,
    status,
    subtotal,
    delivery_fee: DELIVERY_FEE,
    total,
    payment_method: payment,
    // Spec 0003: only a confirmed payment gives an order a reference. An unpaid
    // order has none, which is what stopped every seeded order looking paid.
    payment_reference:
      status === 'AWAITING_PAYMENT' ? null : `${payment.split('_')[0]}-${String(884210 + index * 37)}`,
    // Card and wallet windows are 30 minutes, a bank transfer gets 7 days.
    payment_expires_at: new Date(
      new Date(placedAt).getTime() + (payment === 'EFT' ? 7 * 24 * 60 : 30) * 60 * 1000,
    ).toISOString(),
    cancel_reason: status === 'CANCELLED' ? 'STAFF' : null,
    delivery_address: address,
    delivery_city: city,
    placed_at: placedAt,
    updated_at: timeline.length ? timeline[timeline.length - 1].at : placedAt,
    timeline,
    internal_notes:
      status === 'DISPUTED'
        ? 'Customer contacted support directly before raising the dispute. Evidence photos attached to the claim.'
        : '',
  });

  // Split into one supplier order per distinct supplier.
  const bySupplier = new Map();
  for (const { item, route } of routedLines) {
    const bucket = bySupplier.get(item.supplier_id) ?? { items: [], route };
    bucket.items.push(item);
    bySupplier.set(item.supplier_id, bucket);
  }

  const SUPPLIER_STATUS = {
    PENDING: 'AWAITING_CONFIRMATION',
    PROCESSING: 'PREPARING',
    IN_TRANSIT: 'COLLECTED',
    DELIVERED: 'DELIVERED',
    DISPUTED: 'DELIVERED',
    CANCELLED: 'CANCELLED',
  };

  const PAYABLE_STATUS = {
    PENDING: 'PENDING',
    PROCESSING: 'PENDING',
    IN_TRANSIT: 'PENDING',
    DELIVERED: 'SETTLED',
    DISPUTED: 'ON_HOLD',
    CANCELLED: 'CANCELLED',
  };

  // Spec 0003, AC-2: no supplier order and no payable may exist for an order
  // that was never paid for. The supplier is told to prepare goods at
  // confirmation, never at checkout.
  // A seeded cancellation (o015) was cancelled before it was ever paid, so it
  // has no legs either.
  const paidFor = status !== 'AWAITING_PAYMENT' && status !== 'CANCELLED';

  for (const [supplierId, bucket] of paidFor ? bySupplier : []) {
    const supOrderId = `sup${String(supOrderSeq++).padStart(3, '0')}`;
    const supplierSubtotal = bucket.items.reduce((sum, i) => sum + i.supplier_cost * i.qty, 0);
    const gross = bucket.items.reduce((sum, i) => sum + i.line_total, 0);

    supplierOrders.push({
      id: supOrderId,
      order_id: orderId,
      supplier_id: supplierId,
      status: AWAITING_SUPPLIER.has(orderId) ? 'AWAITING_CONFIRMATION' : SUPPLIER_STATUS[status],
      item_ids: bucket.items.map((i) => i.id),
      supplier_subtotal: supplierSubtotal,
      platform_margin: gross - supplierSubtotal,
      selection_reason: reasonFor(bucket.route),
      auto_selected: true,
      created_at: placedAt,
    });

    // One procurement invoice per supplier order, at that leg's gross.
    const payableStatus = PAYABLE_STATUS[status];
    const raisedAt = placedAt;
    const closedAt =
      payableStatus === 'SETTLED' || payableStatus === 'CANCELLED'
        ? daysAgo(Math.max(0, placedDaysAgo - 4), 15)
        : null;

    const history = [{ from: null, to: 'PENDING', at: raisedAt, actor: 'System', note: 'Procurement invoice raised against the order.' }];
    if (payableStatus === 'SETTLED') history.push({ from: 'PENDING', to: 'SETTLED', at: closedAt, actor: 'Keabetswe Molapo', note: 'Delivery confirmed. Supplier invoice settled.' });
    if (payableStatus === 'CANCELLED') history.push({ from: 'PENDING', to: 'CANCELLED', at: closedAt, actor: 'Keabetswe Molapo', note: 'Order cancelled before dispatch. Nothing owed.' });
    if (payableStatus === 'ON_HOLD') history.push({ from: 'PENDING', to: 'ON_HOLD', at: daysAgo(Math.max(0, placedDaysAgo - 3), 11), actor: customer.name, note: 'Customer raised a claim. Settlement paused pending review.' });

    payables.push({
      id: `pay${String(payableSeq++).padStart(3, '0')}`,
      order_id: orderId,
      supplier_order_id: supOrderId,
      supplier_id: supplierId,
      amount: gross,
      status: payableStatus,
      gateway: payment,
      raised_at: raisedAt,
      settled_at: payableStatus === 'SETTLED' ? closedAt : null,
      cancelled_at: payableStatus === 'CANCELLED' ? closedAt : null,
      terms_days: 7,
      history,
    });

    // Shipment per supplier order, once there is something to move.
    if (['IN_TRANSIT', 'DELIVERED', 'DISPUTED'].includes(status)) {
      const supplier = supplierById.get(supplierId);
      const delivered = status === 'DELIVERED' || status === 'DISPUTED';
      shipments.push({
        id: `sh${String(shipmentSeq++).padStart(3, '0')}`,
        order_id: orderId,
        supplier_order_id: supOrderId,
        runner_id: pick(['r001', 'r001', 'r002', 'r003']),
        status: delivered ? 'DELIVERED' : 'IN_TRANSIT',
        pickup_name: supplier.name,
        pickup_address: `${supplier.city} depot`,
        pickup_country: supplier.country,
        pickup_town: supplier.city,
        dropoff_name: customer.name,
        dropoff_address: `${address}, ${city}`,
        dropoff_country: DEFAULT_DELIVERY_COUNTRY,
        dropoff_town: city,
        distance_km: Math.round((4 + rand() * 26) * 10) / 10,
        payout: Math.round(35 + rand() * 55),
        created_at: placedAt,
        delivered_at: delivered ? daysAgo(Math.max(0, placedDaysAgo - 4), 14) : null,
      });
    }
  }

  // Disputes for the two disputed orders.
  if (status === 'DISPUTED') {
    const leg = payables.filter((entry) => entry.order_id === orderId)[0];
    const openedDaysAgo = Math.max(0, placedDaysAgo - 3);
    disputes.push({
      id: `dp${String(disputeSeq++).padStart(3, '0')}`,
      order_id: orderId,
      payable_id: leg.id,
      customer_id: customerId,
      customer_name: customer.name,
      supplier_id: leg.supplier_id,
      reason: disputeSeq === 2 ? 'Item not as described' : 'Short delivery',
      detail:
        disputeSeq === 2
          ? 'Customer reports the noise cancellation does not engage on one bud. Requesting replacement rather than refund.'
          : 'Six sheets ordered, four delivered. Runner proof-of-delivery photo shows four on the vehicle.',
      status: disputeSeq === 2 ? 'UNDER_REVIEW' : 'OPEN',
      opened_at: daysAgo(openedDaysAgo, 11),
      sla_due_at: daysAhead(disputeSeq === 2 ? 1 : 4),
      resolved_at: null,
      resolution_note: null,
    });
  }
});

// ─── Inventory ───────────────────────────────────────────────────────────────

const inventory = [];
let invSeq = 1;
for (const product of products) {
  const offers = supplierOffers.filter((o) => o.product_id === product.id);
  for (const variant of product.variants) {
    for (const offer of offers) {
      inventory.push({
        id: `inv${String(invSeq++).padStart(4, '0')}`,
        product_id: product.id,
        variant_id: variant.id,
        supplier_id: offer.supplier_id,
        on_hand: Math.round(offer.stock / product.variants.length),
        reserved: Math.round((offer.stock / product.variants.length) * 0.08),
      });
    }
  }
}

// ─── Settlements ─────────────────────────────────────────────────────────────

const settlements = suppliers
  .filter((s) => s.status === 'VERIFIED')
  .flatMap((supplier, i) =>
    ['2026-06', '2026-07'].map((period, j) => {
      const gross = Math.round(supplier.total_gmv / (6 + j));
      const commission = Math.round(gross * 0.12);
      return {
        id: `st${String(i * 2 + j + 1).padStart(3, '0')}`,
        supplier_id: supplier.id,
        supplier_name: supplier.name,
        period,
        gross,
        commission,
        net: gross - commission,
        status: period === '2026-07' ? 'PENDING' : 'PAID',
        paid_at: period === '2026-07' ? null : daysAgo(40 - i),
      };
    }),
  );

// ─── Audit log and notifications ─────────────────────────────────────────────

const auditLog = [
  ['u002', 'Keabetswe Molapo', 'SUPPLIER_APPROVED', 'supplier', 's005', 'Approved Highveld Trade Co after document review.', 190],
  ['u002', 'Keabetswe Molapo', 'PAYABLE_SETTLED', 'supplier-payable', 'pay001', 'Settled the supplier invoice on AFD-24810 following delivery confirmation.', 23],
  ['u001', 'AfriDeal Admin', 'PRICING_RULE_UPDATED', 'pricing-rule', 'pr001', 'Hair & Beauty markup changed from 75% to 80%.', 18],
  ['u002', 'Keabetswe Molapo', 'SUPPLIER_SUSPENDED', 'supplier', 's008', 'Suspended Bokamoso Textiles — fulfilment rate below 65% for two consecutive months.', 14],
  ['u008', 'Finance Admin', 'SETTLEMENT_PAID', 'settlement', 'st001', 'June settlement paid to Naledi Beauty Supplies.', 12],
  ['u002', 'Keabetswe Molapo', 'DISPUTE_OPENED', 'dispute', 'dp001', 'Dispute opened on AFD-24822 — short delivery.', 9],
  ['u001', 'AfriDeal Admin', 'USER_ROLE_CHANGED', 'user', 'u008', 'Granted FINANCE_ADMIN to finance@afrideal.co.bw.', 6],
  ['u002', 'Keabetswe Molapo', 'SUPPLIER_OVERRIDDEN', 'supplier-order', 'sup004', 'Manually routed to Motswedi Building Supplies — customer requested Francistown collection.', 4],
].map(([actor_id, actor_name, action, entity, entity_id, detail, ago], i) => ({
  id: `a${String(i + 1).padStart(3, '0')}`,
  at: daysAgo(ago, 13),
  actor_id,
  actor_name,
  action,
  entity,
  entity_id,
  detail,
}));

const notifications = [
  ['u001', 'Two suppliers awaiting verification', 'Tsholofelo Fresh Produce and Setlhoa Office Group have submitted documents.', 'SUPPLIER', false, 2],
  ['u001', 'Dispute SLA expiring', 'AFD-24822 has under 24 hours remaining on its resolution clock.', 'DISPUTE', false, 0],
  ['u002', 'Supplier invoices overdue', 'Three supplier invoices have passed their seven-day payment terms.', 'PAYMENT', false, 1],
  ['u003', 'New order to confirm', 'AFD-24817 needs confirmation within 24 hours.', 'ORDER', false, 3],
  ['u003', 'Invoice settled', 'BWP 1,842.00 settled against AFD-24810.', 'PAYMENT', true, 23],
  ['u004', 'Quote request received', 'A buyer has requested pricing on 200 units of School Uniform Set.', 'ORDER', false, 1],
  ['u005', 'New job available', 'Pickup at Motswedi Francistown depot, 18.4km.', 'ORDER', false, 0],
  ['u006', 'Your order is on the way', 'AFD-24814 left the depot and is out for delivery.', 'ORDER', false, 1],
  ['u007', 'Delivery confirmed', 'AFD-24813 was delivered and the supplier invoice was settled.', 'ORDER', true, 11],
  ['u008', 'July settlements ready', 'Five supplier settlements are pending approval.', 'SYSTEM', false, 2],
].map(([user_id, title, body, kind, read, ago], i) => ({
  id: `n${String(i + 1).padStart(3, '0')}`,
  user_id,
  title,
  body,
  kind,
  read,
  at: daysAgo(ago, 8 + (i % 10)),
}));

// ═════════════════════════════════════════════════════════════════════════════
// Procurement model (revised spec §3–§27)
// ═════════════════════════════════════════════════════════════════════════════

// ─── §11 supplier types, §7 customer types ───────────────────────────────────

const SUPPLIER_TYPES = {
  s001: 'DISTRIBUTOR',
  s002: 'WHOLESALER',
  s003: 'IMPORTER',
  s004: 'MANUFACTURER',
  s005: 'WHOLESALER',
  s006: 'AGENT',
  s007: 'RETAILER',
  s008: 'MANUFACTURER',
};

for (const supplier of suppliers) {
  supplier.supplier_type = SUPPLIER_TYPES[supplier.id] ?? 'WHOLESALER';
  supplier.commercial_model = 'AFRIDEAL_MANAGED';
}

// Thabo buys as a consumer, Kefilwe buys for a business. That difference is
// what makes the pricing ladder demonstrable by switching accounts.
const CUSTOMER_TYPES = { u006: 'RETAIL', u007: 'BUSINESS' };

for (const user of users) {
  if (user.role === 'CUSTOMER') user.customer_type = CUSTOMER_TYPES[user.id] ?? 'RETAIL';
}

// ─── §12 supplier users ──────────────────────────────────────────────────────

const supplierUsers = users
  .filter((user) => user.supplier_id)
  .map((user, i) => ({
    id: `su${String(i + 1).padStart(3, '0')}`,
    supplier_id: user.supplier_id,
    user_id: user.id,
    role: 'SUPPLIER_OWNER',
    status: 'ACTIVE',
  }));

// ─── §8/§26 brands ───────────────────────────────────────────────────────────

const BRAND_BY_PRODUCT = {
  p001: 'b001', p003: 'b001',
  p004: 'b002', p005: 'b002',
  p006: 'b003', p007: 'b003',
  p008: 'b004', p009: 'b004',
  p010: 'b005',
  p011: 'b006', p012: 'b006',
  // The product owner's own hair range, sold as AfriDeal (2026-10-20).
  ...Object.fromEntries(afridealWigSpecs.map((wig) => [wig.id, 'b007'])),
};

const brands = [
  ['b001', 'Naledi Care'],
  ['b002', 'Kalahari Tech'],
  ['b003', 'Motswedi Build'],
  ['b004', 'Tsholofelo Agri'],
  ['b005', 'Setlhoa Office'],
  ['b006', 'Bokamoso Apparel'],
  ['b007', 'AfriDeal'],
].map(([id, name]) => ({ id, name, slug: name.toLowerCase().replace(/\s+/g, '-') }));

const SUPPLIER_OWNED_PRODUCTS = {
  p003: { supplier_id: 's002', moq: 6 },
  p005: { supplier_id: 's003', moq: 2 },
  p007: { supplier_id: 's004', moq: 10 },
  p009: { supplier_id: 's005', moq: 5 },
  p010: { supplier_id: 's005', moq: 5 },
  p011: { supplier_id: 's002', moq: 10 },
};

for (const product of products) {
  product.brand_id = BRAND_BY_PRODUCT[product.id] ?? null;
  product.product_type = 'PHYSICAL';
  product.country_of_origin = originFor(product.category_id);

  const supplierSpec = SUPPLIER_OWNED_PRODUCTS[product.id];
  if (supplierSpec) {
    const ownerSupplier = supplierById.get(supplierSpec.supplier_id);
    product.owner_type = 'SUPPLIER';
    product.supplier_id = supplierSpec.supplier_id;
    product.supplier_name = ownerSupplier?.name ?? null;
    product.moq = supplierSpec.moq;
    product.commercial_model = 'SUPPLIER_LED';
  } else {
    product.owner_type = 'AFRIDEAL';
    product.supplier_id = null;
    product.supplier_name = null;
    product.moq = 1;
    product.commercial_model = 'AFRIDEAL_MANAGED';
  }
}

// ─── §10 product images ──────────────────────────────────────────────────────

/**
 * Photography wins when it exists; the gradient swatch is the fallback.
 *
 * `npm run images` downloads real photos into public/products as
 * `<product>-<slot>.jpg`. This seed is re-run often, and an earlier version
 * wrote a swatch for every row unconditionally — which quietly reverted the
 * whole catalogue to gradients the next time anyone reseeded, with the
 * downloaded files still sitting on disk unreferenced. So the row is decided by
 * what is actually in public/products rather than by an assumption about it,
 * and the two scripts can now be run in either order, any number of times.
 */
const IMAGE_ROLES = [
  ['PRIMARY', 140],
  ['GALLERY', 210],
  ['SPEC', 300],
  ['PACKAGING', 55],
];

/** Shift a hex colour around the wheel so each angle reads as a distinct shot. */
function shiftHex(hex, amount) {
  const n = Number.parseInt(hex.slice(1), 16);
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp(((n >> 16) & 255) * (1 - amount) + 255 * amount * 0.35);
  const g = clamp(((n >> 8) & 255) * (1 - amount) + 255 * amount * 0.28);
  const b = clamp((n & 255) * (1 - amount) + 255 * amount * 0.42);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/**
 * Which downloaded photos are on disk right now.
 *
 * Read once, up front, because this runs inside a synchronous flatMap below —
 * and a Set lookup is the difference between one directory listing and 48 stat
 * calls.
 */
const photosOnDisk = await (async () => {
  try {
    return new Set(await fs.readdir(PHOTO_DIR));
  } catch {
    // No public/products yet: every row falls back to its gradient.
    return new Set();
  }
})();

/*
 * A product with any photograph on disk shows only its photographs: the
 * product owner's wigs come with two (the model and a front / side / back
 * board), and padding them with gradients would put fake views beside real
 * ones. A product with none keeps the four gradient slots.
 */
let imageSeq = 0;
const productImages = products.flatMap((product) => {
  const photoSlots = IMAGE_ROLES.filter((_, j) => photosOnDisk.has(`${product.id}-${j}.jpg`));
  const slots = photoSlots.length > 0 ? photoSlots : IMAGE_ROLES;

  return slots.map(([role, angle]) => {
    const j = IMAGE_ROLES.findIndex(([r]) => r === role);
    const filename = `${product.id}-${j}.jpg`;
    const hasPhoto = photosOnDisk.has(filename);

    return {
      id: `img${String(++imageSeq).padStart(3, '0')}`,
      product_id: product.id,
      variant_id: null,
      // A real photograph if `npm run images` has fetched one for this slot,
      // otherwise the gradient the UI renders in its place. The swatch records
      // the angle it stands in for, so the thumbnail rail reads as four
      // distinct views rather than the same tile repeated four times.
      image_url: hasPhoto
        ? `/products/${filename}`
        : `swatch:${shiftHex(product.swatch[0], j * 0.14)},${shiftHex(product.swatch[1], j * 0.1)},${angle}`,
      image_type: role,
      ...(hasPhoto && WIG_PHOTO_CAPTIONS.get(product.id)?.[j]
        ? { caption: WIG_PHOTO_CAPTIONS.get(product.id)[j] }
        : {}),
      sort_order: j,
      // Stays AFRIDEAL either way: `source` is the party that supplied the
      // asset, and the platform did. Per-file provenance for the fetched
      // photos lives in public/products/CREDITS.json.
      source: 'AFRIDEAL',
      permission_status: 'CLEARED',
      created_at: product.created_at,
    };
  });
});


// ─── §14–§20 pricing ladder ──────────────────────────────────────────────────

/**
 * The ladder, expressed as a factor on the category markup rather than as a
 * flat discount. A wholesale buyer is not getting "15% off retail"; they are
 * getting a thinner margin applied to the same supplier cost, which is what
 * actually happens and what keeps §19 margin floors meaningful.
 */
const PRICED_CUSTOMER_TYPES = ['GUEST', 'RETAIL', 'BUSINESS', 'RESELLER', 'INSTITUTIONAL'];

/**
 * Four published rungs, identical for every account type.
 *
 * The ladder used to fan out into eleven bands across five customer types, with
 * wholesale rungs a shopper could see but not buy at. That made the catalogue
 * look like a price list you had to qualify for, which is the opposite of the
 * argument the storefront is making. Now the published price depends on one
 * thing the buyer controls — how many units they take — and everything past a
 * hundred units is answered by a quotation instead of a listing.
 *
 * Four rather than two, because a single break at five units left a reseller
 * taking ninety on the same rate as a household taking five, and the catalogue
 * had nothing to say to the buyer it most wants. These four rungs are the
 * baseline structure for every product: no product is priced on a different
 * set of breaks, and no rung is withheld pending an account.
 *
 * Floors fall as the rungs do. The thinner the markup, the closer the band sits
 * to its floor, so each rung is given the floor its own arithmetic can actually
 * clear against the worst routable supplier cost.
 */
const tierPlanFor = (categoryId) =>
  PRICED_CUSTOMER_TYPES.flatMap((customer_type) =>
    ladderFor(categoryId).map((rung) => ({
      customer_type,
      tier: rung.tier,
      min: rung.minimum_quantity,
      max: rung.maximum_quantity,
      markup: pct(rung),
      floor: rung.floor,
    })),
  );

/**
 * Margin floors.
 *
 * With delivery billed separately and the markup applied to the landed cost,
 * the realised margin does not depend on how cheap the product is: after the
 * card fee, +50% keeps about 31% of the selling price (27% with the 4-unit
 * multi-buy), +33% about 22%, +25% about 17.5% and +18% about 13%. Each sits
 * clear of its own floor, so no category needs an exception.
 */
const FLOOR_OVERRIDES = {};

// §16/§17 — one configurable rule per category and tier reached.
const marginRules = [];
const seenRule = new Set();

for (const category of categories) {
  const base = ruleFor(category.id);
  const overrides = FLOOR_OVERRIDES[category.id];

  for (const plan of tierPlanFor(category.id)) {
    const key = `${category.id}|${plan.customer_type}|${plan.tier}`;
    if (seenRule.has(key)) continue;
    seenRule.add(key);

    const floor = overrides?.[plan.tier] ?? plan.floor;

    marginRules.push({
      id: `mr${String(marginRules.length + 1).padStart(3, '0')}`,
      category_id: category.id,
      category_name: category.name,
      customer_type: plan.customer_type,
      pricing_tier: plan.tier,
      margin_type: 'PERCENTAGE_MARKUP',
      margin_value: plan.markup,
      fixed_component: 0,
      logistics_cost: base.logistics_cost,
      gateway_rate: base.gateway_rate,
      minimum_margin_pct: floor,
      commercial_model: 'AFRIDEAL_MANAGED',
      active: true,
    });
  }
}

/**
 * Promotions run deliberately thinner than the standing ladder, but they are
 * not exempt from §19: a discount that takes a line below cost recovery is a
 * loss, not a promotion. Floors here are half the retail floor, and the
 * integrity pass checks promo bands against them like any other.
 */
for (const category of categories) {
  const base = ruleFor(category.id);
  const retailFloor = FLOOR_OVERRIDES[category.id]?.RETAIL ?? ladderFor(category.id)[0].floor;

  for (const customerType of PRICED_CUSTOMER_TYPES) {
    marginRules.push({
      id: `mr${String(marginRules.length + 1).padStart(3, '0')}`,
      category_id: category.id,
      category_name: category.name,
      customer_type: customerType,
      pricing_tier: 'PROMOTIONAL',
      margin_type: 'PERCENTAGE_MARKUP',
      margin_value: Math.round(retailMarkupPct(category.id) * 0.8 * 10) / 10,
      fixed_component: 0,
      logistics_cost: base.logistics_cost,
      gateway_rate: base.gateway_rate,
      minimum_margin_pct: Math.round(retailFloor / 2),
      commercial_model: 'AFRIDEAL_MANAGED',
      active: true,
    });
  }
}

/**
 * The landed cost, in thebe, of the dearest offer this product (or one of its
 * lengths) might be routed to, so the published figure holds whichever supplier
 * ends up filling the order.
 */
function worstLanded(product, variantId = null) {
  return Math.max(
    ...supplierOffers
      .filter((offer) => offer.product_id === product.id)
      .map((offer) => {
        const perVariant = variantId
          ? offer.variant_costs?.find((entry) => entry.variant_id === variantId)?.cost
          : undefined;
        return landedFor(perVariant ?? offer.supplier_cost, offer.cost_currency ?? 'BWP', product.category_id);
      }),
  );
}

// §14 — the customer-facing bands themselves.
const customerPrices = [];

function pushLadder(product, variantId, landedThebe) {
  for (const plan of tierPlanFor(product.category_id)) {
    customerPrices.push({
      id: `cp${String(customerPrices.length + 1).padStart(4, '0')}`,
      product_id: product.id,
      variant_id: variantId,
      supplier_offer_id: null,
      customer_type: plan.customer_type,
      pricing_tier: plan.tier,
      minimum_quantity: plan.min,
      maximum_quantity: plan.max,
      unit_price: unitPrice(landedThebe, plan.markup / 100),
      currency: 'BWP',
      pricing_method: 'PERCENTAGE_MARKUP',
      effective_from: product.created_at,
      effective_to: null,
      status: 'ACTIVE',
    });
  }
}

for (const product of products) {
  // The product-level ladder. For a product sold by length its offer cost is
  // the cheapest length, so this is the "from" ladder.
  pushLadder(product, null, worstLanded(product));

  // A ladder per length where the lengths cost different amounts (spec 0007).
  const sold = supplierOffers.some(
    (offer) => offer.product_id === product.id && offer.variant_costs?.length,
  );
  if (sold) {
    for (const variant of product.variants) {
      pushLadder(product, variant.id, worstLanded(product, variant.id));
    }
  }
}

// ─── Promotional bands ──────────────────────────────────────────────────────

/**
 * A handful of live promotions, so the deals rail shows a real band with a real
 * end date rather than a discount percentage invented in the browser.
 *
 * A promotion moves the whole ladder down, not just the retail rung. Cutting
 * retail alone used to work when the rungs were far apart; with retail at 60%
 * over cost and bulk at 44%, there are only ten points of price between them,
 * so any discount worth the name would have pushed the retail rung underneath
 * the bulk one and inverted the ladder — five units costing more per unit than
 * one. Moving every rung by the same percentage keeps the shape, keeps the
 * descent strictly monotonic, and keeps the argument.
 */
// None on the hair range: it is the product owner's own stock, priced by her
// ladder, and she has not asked for a deal on it.
const PROMOTIONS = [
  ['p008', 14, 2],
  ['p012', 18, 6],
];

/**
 * Promotional margin floor.
 *
 * A promotion is applied as one percentage across the whole ladder, so the
 * rung with the least room decides how deep it may go — and that is
 * Wholesale+ at 18% over landed cost, not retail at 50%. The floor is therefore
 * set to the deepest rung's own floor rather than to half the retail one:
 * anything looser would publish a discounted wholesale band underneath the
 * margin the standing band was held to, which is a loss dressed as a promotion.
 *
 * The practical effect is that headline discounts are single-digit. That is the
 * honest consequence of publishing an 18% rung at all, and it is better than a
 * 15% banner the bottom of the ladder cannot pay for.
 */
const PROMO_FLOOR_PCT = 8;

for (let [productId, discountPct, endsInDays] of PROMOTIONS) {
  const product = products.find((entry) => entry.id === productId);
  if (!product) continue;

  const base = ruleFor(product.category_id);
  // Landed, in Pula: the floor has to cover customs too, whenever there is any.
  const worstCost = worstLanded(product) / 100;

  const bands = customerPrices.filter(
    (band) => band.product_id === productId && band.status === 'ACTIVE',
  );
  if (bands.length === 0) continue;

  /*
   * The floor is a price, not a percentage, and it binds on the thinnest rung.
   *
   *   margin ÷ price ≥ f,  where margin = price − cost − price × gateway
   *   ⇒ price ≥ cost ÷ (1 − gateway − f)
   *
   * Whichever rung sits closest to that line decides how deep the whole ladder
   * may go, so the discount is clamped once and applied to every rung.
   */
  const floorPrice = worstCost / (1 - base.gateway_rate - PROMO_FLOOR_PCT / 100);
  const headroom = bands.reduce(
    (deepest, band) => Math.min(deepest, 1 - floorPrice / band.unit_price),
    1,
  );

  const applied = Math.min(discountPct / 100, Math.max(0, headroom));

  // Anything under three points is not a promotion, it is noise on a price tag.
  if (applied < 0.03) continue;

  const retailBefore = bands.find(
    (band) => band.customer_type === 'RETAIL' && band.minimum_quantity === 1,
  );
  const originalRetail = retailBefore ? retailBefore.unit_price : product.price;

  for (const band of bands) {
    band.unit_price = Math.ceil(band.unit_price * (1 - applied));
    band.effective_from = daysAgo(2);
    band.effective_to = daysAhead(endsInDays);
    /*
     * Only the entry rung is relabelled. The quantity rung keeps its BULK tier
     * so the ladder still reads as a ladder, and the storefront resolves the
     * discounted entry price through its quantity range rather than its label.
     */
    if (band.minimum_quantity === 1) band.pricing_tier = 'PROMOTIONAL';
  }

  const promoRetail = Math.ceil(originalRetail * (1 - applied));
  const ratio = promoRetail / originalRetail;

  // Keep the catalogue price in step with what a shopper actually pays.
  product.price = promoRetail;
  for (const variant of product.variants) {
    variant.price = Math.ceil(variant.price * ratio);
  }

  discountPct = Math.round(applied * 100);

  // The strikethrough figure and the countdown the deals rail renders.
  product.compare_at_price = originalRetail;
  product.promotion = {
    discount_pct: discountPct,
    ends_at: daysAhead(endsInDays),
    // Sold-progress on the deal card, derived rather than invented at render.
    stock_allocated: 40 + ((discountPct * 7) % 60),
    stock_sold: 6 + ((discountPct * 3) % 26),
  };
}

// ─── §21 RFQs ────────────────────────────────────────────────────────────────

const RFQ_SPECS = [
  ['u007', 'BUSINESS', 'p012', 240, 300, 'Gaborone', 'QUOTED', 6, 'School intake order for a private group of three campuses. Delivery must land before the January term.'],
  ['u007', 'BUSINESS', 'p006', 800, null, 'Francistown', 'SOURCING', 3, 'Slab pour scheduled. Needs to be palletised and delivered to site, not to a depot.'],
  ['u006', 'RETAIL', 'p001', 150, 80, 'Gaborone', 'SUBMITTED', 1, 'Opening a salon. Want a standing monthly order if the first one goes well.'],
];

const rfqs = [];
const rfqResponses = [];

RFQ_SPECS.forEach((spec, index) => {
  const [customerId, customerType, productId, qty, target, location, status, ago, notes] = spec;
  const customer = users.find((user) => user.id === customerId);
  const product = products.find((entry) => entry.id === productId);
  const rfqId = `rfq${String(index + 1).padStart(3, '0')}`;

  rfqs.push({
    id: rfqId,
    reference: `RFQ-${2600 + index}`,
    customer_id: customerId,
    customer_name: customer.name,
    customer_type: customerType,
    product_id: productId,
    product_name: product.name,
    variant_id: null,
    requested_quantity: qty,
    target_price: target,
    delivery_location: location,
    required_delivery_date: daysAhead(21 + index * 7),
    notes,
    status,
    created_at: daysAgo(ago, 10),
    updated_at: daysAgo(Math.max(0, ago - 1), 14),
  });

  // Suppliers who actually carry the product get invited to respond.
  const eligible = supplierOffers
    .filter((offer) => offer.product_id === productId)
    .map((offer) => ({ offer, supplier: supplierById.get(offer.supplier_id) }))
    .filter(({ supplier }) => supplier && supplier.status === 'VERIFIED');

  eligible.forEach(({ offer, supplier }, responseIndex) => {
    const answered = status === 'QUOTED' || (status === 'SOURCING' && responseIndex === 0);

    rfqResponses.push({
      id: `rr${String(rfqResponses.length + 1).padStart(3, '0')}`,
      rfq_id: rfqId,
      supplier_id: supplier.id,
      quantity: qty,
      // Volume pricing: the supplier discounts their own cost at scale.
      unit_price: Math.round(offer.supplier_cost * (qty >= 500 ? 0.86 : qty >= 200 ? 0.91 : 0.95)),
      currency: 'BWP',
      lead_time_days: offer.fulfilment_days + (qty >= 500 ? 7 : 3),
      minimum_order_quantity: offer.moq,
      shipping_terms: supplier.country === 'ZA' ? 'DAP Gaborone, duties paid' : 'Ex-works, AfriDeal collects',
      valid_until: daysAhead(14 + responseIndex * 3),
      notes: answered
        ? `Can hold ${qty} units for 14 days against a confirmed order.`
        : 'Awaiting supplier response.',
      status: answered ? 'SUBMITTED' : 'PENDING',
      created_at: daysAgo(Math.max(0, ago - 1), 12),
    });
  });
});

// ─── Payments and settings (spec 0003) ───────────────────────────────────────

/**
 * One confirmed payment per order that was genuinely paid for under the old
 * model. Orders left at AWAITING_PAYMENT get none, so the AC-2 invariant holds
 * on seeded data rather than being violated from the first run. A blanket
 * CONFIRMED stamp would record money that never arrived, in a ledger the
 * Data Protection Act applies to.
 */
let paymentSeq = 1;
const payments = orders
  .filter((order) => order.status !== 'AWAITING_PAYMENT' && order.status !== 'CANCELLED')
  .map((order) => {
    const confirmedAt = order.timeline.find((entry) => entry.status === 'PAID')?.at ?? order.placed_at;
    return {
      id: `pmt${String(paymentSeq++).padStart(3, '0')}`,
      order_id: order.id,
      provider: order.payment_method,
      provider_reference: order.payment_reference,
      status: 'CONFIRMED',
      amount: order.total,
      amount_matches: true,
      created_at: order.placed_at,
      confirmed_at: confirmedAt,
      failure_reason: null,
      note: null,
    };
  });

const settings = [
  {
    id: 'checkout_paused',
    value: { paused: false },
    updated_at: daysAgo(0, 9),
    updated_by: 'System',
  },
];

// ─── Write ───────────────────────────────────────────────────────────────────

const files = {
  users,
  categories,
  countries,
  couriers,
  products,
  suppliers,
  'supplier-offers': supplierOffers,
  inventory,
  orders,
  'order-items': orderItems,
  'supplier-orders': supplierOrders,
  'pricing-rules': pricingRules,
  'supplier-payables': payables,
  disputes,
  runners,
  'runner-requests': runnerRequests,
  shipments,
  settlements,
  'audit-log': auditLog,
  notifications,
  'customer-prices': customerPrices,
  'margin-rules': marginRules,
  rfqs,
  'rfq-responses': rfqResponses,
  brands,
  'product-images': productImages,
  'supplier-users': supplierUsers,
  payments,
  settings,
};

await fs.mkdir(DATA_DIR, { recursive: true });
for (const [name, rows] of Object.entries(files)) {
  await fs.writeFile(path.join(DATA_DIR, `${name}.json`), `${JSON.stringify(rows, null, 2)}\n`, 'utf8');
}

// ─── Integrity checks ────────────────────────────────────────────────────────

const problems = [];

for (const product of products) {
  const costs = supplierOffers.filter((o) => o.product_id === product.id).map((o) => o.supplier_cost);
  const worst = worstLanded(product) / 100;
  if (product.price <= worst) problems.push(`${product.id} price ${product.price} is not above its landed cost ${worst}`);
  if (product.variants.length < 2) problems.push(`${product.id} has fewer than 2 variants`);
  if (costs.length < 2 && !SINGLE_SOURCE.has(product.id)) problems.push(`${product.id} has fewer than 2 supplier offers`);
}

for (const order of orders) {
  const items = orderItems.filter((i) => i.order_id === order.id);
  const sum = items.reduce((s, i) => s + i.line_total, 0);
  if (sum !== order.subtotal) problems.push(`${order.id} subtotal ${order.subtotal} != line sum ${sum}`);
  if (order.subtotal + order.delivery_fee !== order.total) problems.push(`${order.id} total does not equal subtotal + delivery`);

  const legs = supplierOrders.filter((s) => s.order_id === order.id);
  // Spec 0003, AC-2: the rule now cuts both ways. A paid order must have its
  // supplier legs, and an unpaid one must have none.
  const paidFor = order.status !== 'AWAITING_PAYMENT' && order.status !== 'CANCELLED';
  if (paidFor && legs.length === 0) problems.push(`${order.id} has no supplier orders`);
  if (!paidFor && legs.length > 0) {
    problems.push(`${order.id} was never paid but has ${legs.length} supplier order(s)`);
  }
  if (!paidFor && payments.some((entry) => entry.order_id === order.id)) {
    problems.push(`${order.id} was never paid but has a payment row`);
  }
  if (paidFor && !payments.some((entry) => entry.order_id === order.id)) {
    problems.push(`${order.id} is paid for but has no payment row`);
  }
  for (const leg of legs) {
    const matching = payables.filter((entry) => entry.supplier_order_id === leg.id);
    if (matching.length !== 1) problems.push(`${leg.id} has ${matching.length} supplier payables, expected exactly 1`);
  }
}

const statusCounts = orders.reduce((acc, o) => ({ ...acc, [o.status]: (acc[o.status] ?? 0) + 1 }), {});
// Spec 0003 turned the two PENDING orders into AWAITING_PAYMENT: they were
// never paid for, and PENDING now means only the old timeline label.
const expected = { DELIVERED: 4, IN_TRANSIT: 3, PROCESSING: 3, AWAITING_PAYMENT: 2, DISPUTED: 2, CANCELLED: 1 };
for (const [status, count] of Object.entries(expected)) {
  if (statusCounts[status] !== count) problems.push(`expected ${count} ${status} orders, got ${statusCounts[status] ?? 0}`);
}

const verified = suppliers.filter((s) => s.status === 'VERIFIED').length;
const pending = suppliers.filter((s) => s.status === 'PENDING').length;
const suspended = suppliers.filter((s) => s.status === 'SUSPENDED').length;
if (verified !== 6 || pending !== 2 || suspended !== 1) {
  problems.push(`supplier mix is ${verified}/${pending}/${suspended}, expected 6 verified / 2 pending / 1 suspended`);
}

// ─── Procurement integrity (§14–§20) ────────────────────────────────────────

for (const request of runnerRequests) {
  if (request.status !== 'REQUESTED' && request.runner_id == null) {
    problems.push(`${request.id} is ${request.status} with no runner assigned`);
  }
  if (request.status === 'REQUESTED' && request.quote != null) {
    problems.push(`${request.id} carries a quote before a runner has seen it`);
  }
}

for (const product of products) {
  const bands = customerPrices.filter((band) => band.product_id === product.id);

  // The retail entry point must agree with the price the catalogue advertises,
  // or the storefront and the pricing engine disagree about the same product.
  // While a promotion runs, the entry rung is PROMOTIONAL rather than RETAIL.
  const retailEntry = bands.find(
    (band) =>
      band.variant_id === null &&
      band.customer_type === 'RETAIL' &&
      band.minimum_quantity === 1 &&
      (band.pricing_tier === 'RETAIL' || band.pricing_tier === 'PROMOTIONAL'),
  );
  if (!retailEntry) {
    problems.push(`${product.id} has no retail entry band`);
  } else if (retailEntry.unit_price !== product.price) {
    problems.push(
      `${product.id} retail band ${retailEntry.unit_price} does not match catalogue price ${product.price}`,
    );
  }

  // A length with its own ladder must open at the price its option advertises.
  for (const variant of product.variants) {
    const entry = bands.find(
      (band) =>
        band.variant_id === variant.id &&
        band.customer_type === 'RETAIL' &&
        band.minimum_quantity === 1,
    );
    if (entry && entry.unit_price !== variant.price) {
      problems.push(`${variant.id} retail band ${entry.unit_price} does not match option price ${variant.price}`);
    }
  }

  // Within one customer type and one ladder, price per unit must fall as
  // quantity rises.
  const ladderKeys = [...new Set(bands.map((band) => band.variant_id))];
  for (const type of ['RETAIL', 'BUSINESS', 'RESELLER', 'INSTITUTIONAL']) {
    for (const variantId of ladderKeys) {
      const ladder = bands
        .filter((band) => band.customer_type === type && band.variant_id === variantId)
        .sort((a, b) => a.minimum_quantity - b.minimum_quantity);

      for (let i = 1; i < ladder.length; i += 1) {
        if (ladder[i].unit_price > ladder[i - 1].unit_price) {
          problems.push(
            `${product.id}${variantId ? `/${variantId}` : ''} ${type} ladder rises at ${ladder[i].minimum_quantity}+ (${ladder[i - 1].unit_price} → ${ladder[i].unit_price})`,
          );
        }
      }
    }
  }

  // §19 — no band may sit under its tier floor against the worst routable
  // landed cost, the card fee charged on the selling price.
  for (const band of bands) {
    const rule = marginRules.find(
      (r) =>
        r.category_id === product.category_id &&
        r.customer_type === band.customer_type &&
        r.pricing_tier === band.pricing_tier,
    );
    if (!rule) continue;

    const landed = worstLanded(product, band.variant_id) + rule.logistics_cost * 100;
    const kept = marginPct(band.unit_price, landed, rule.gateway_rate ?? GATEWAY_RATE);

    if (kept < rule.minimum_margin_pct) {
      problems.push(
        `${product.id} ${band.customer_type}/${band.pricing_tier} band at ${band.minimum_quantity}+ yields ${kept.toFixed(1)}% margin, below its ${rule.minimum_margin_pct}% floor`,
      );
    }
  }
}

for (const rfq of rfqs) {
  const responses = rfqResponses.filter((response) => response.rfq_id === rfq.id);
  if (responses.length === 0) problems.push(`${rfq.id} has no supplier responses`);
  if (!products.some((product) => product.id === rfq.product_id)) {
    problems.push(`${rfq.id} references an unknown product`);
  }
}

console.log('AfriDeal seed complete.\n');
for (const [name, rows] of Object.entries(files)) {
  console.log(`  ${name.padEnd(18)} ${String(rows.length).padStart(4)} rows`);
}
console.log(`\n  order status mix   ${JSON.stringify(statusCounts)}`);
console.log(`  suppliers          ${verified} verified, ${pending} pending, ${suspended} suspended`);
console.log(`  GMV across orders  BWP ${orders.reduce((s, o) => s + o.total, 0).toLocaleString()}`);

if (problems.length > 0) {
  console.warn(`\n⚠ ${problems.length} margin alert(s) detected (flagged for admin review per §19):`);
  for (const problem of problems) console.warn(`    - ${problem}`);
}
console.log('\n✓ integrity checks complete');

// When the app reads from Postgres, the regenerated files are only half the
// reset - push them there too so `npm run seed` still means "clean slate".
//
// `SEED_FILES_ONLY=1` stops at the files. `.env.local` points DB_DRIVER at the
// shared production branch, so regenerating data/ to inspect it must not also
// reload the live database.
const { default: nextEnv } = await import('@next/env');
nextEnv.loadEnvConfig(ROOT_DIR);
if (process.env.SEED_FILES_ONLY === '1') {
  console.log('• SEED_FILES_ONLY=1: data/ regenerated, Postgres left untouched');
} else if (process.env.DB_DRIVER === 'postgres') {
  const { loadAll } = await import('./db-load.mjs');
  const loaded = await loadAll();
  console.log(`✓ ${loaded.length} collections loaded into Postgres`);
}
