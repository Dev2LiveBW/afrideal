import 'server-only';

import type {
  Brand,
  Category,
  Product,
  ProductImage,
  Supplier,
  SupplierOffer,
} from '@/types';

import { sanityRead, sanityWrite } from './client';

/**
 * The catalogue as Sanity holds it, translated to and from the shapes the rest
 * of the app was written against.
 *
 * Six collections live in the Studio: products (with their images), categories,
 * brands, suppliers and supplier offers. Everything with money or state in it -
 * orders, payables, inventory, users - stays in the JSON store. `lib/db.ts`
 * routes by collection name, so no page or route handler knows the difference.
 *
 * Ids: the seed import gave documents ids like `product-p001` so the app's
 * short ids (`p001`) survive the round trip. A document created in the Studio
 * gets a UUID, which the app then uses as-is.
 */

export const SANITY_COLLECTIONS = [
  'products',
  'categories',
  'brands',
  'product-images',
  'suppliers',
  'supplier-offers',
] as const;

export type SanityCollection = (typeof SANITY_COLLECTIONS)[number];

export function isSanityBacked(collection: string): collection is SanityCollection {
  return (SANITY_COLLECTIONS as readonly string[]).includes(collection);
}

// ── Ids ────────────────────────────────────────────────────────────────────────

const ID_PREFIX: Record<Exclude<SanityCollection, 'product-images'>, string> = {
  products: 'product-',
  categories: 'category-',
  brands: 'brand-',
  suppliers: 'supplier-',
  'supplier-offers': 'offer-',
};

const SEED_PREFIX = /^(product|category|brand|supplier|offer)-/;

/** `product-p001` → `p001`; a Studio-minted UUID is returned unchanged. */
function appId(sanityId: string | null | undefined): string {
  if (!sanityId) return '';
  return sanityId.replace(SEED_PREFIX, '');
}

/** `p001` → `product-p001`; anything with a dash in it is already a Sanity id. */
function sanityId(collection: Exclude<SanityCollection, 'product-images'>, id: string): string {
  return id.includes('-') ? id : `${ID_PREFIX[collection]}${id}`;
}

// ── Reads ──────────────────────────────────────────────────────────────────────

interface SanityCategory {
  _id: string;
  name: string;
  slug: string | null;
  emoji: string | null;
  blurb: string | null;
  sortOrder: number | null;
}

interface SanityBrand {
  _id: string;
  name: string;
  slug: string | null;
}

interface SanityImage {
  _key: string;
  imageType: ProductImage['image_type'] | null;
  alt: string | null;
  url: string | null;
}

interface SanityProduct {
  _id: string;
  _createdAt: string;
  name: string;
  slug: string | null;
  category: string | null;
  brand: string | null;
  emoji: string | null;
  swatch: string[] | null;
  shortDescription: string | null;
  description: string | null;
  specs: { label: string; value: string }[] | null;
  variants: { _key: string; label: string; sku: string; price: number }[] | null;
  price: number | null;
  compareAtPrice: number | null;
  status: Product['status'] | null;
  rating: number | null;
  reviewCount: number | null;
  featured: boolean | null;
  createdAt: string | null;
  productType: string | null;
  countryOfOrigin: string | null;
  images: SanityImage[] | null;
}

interface SanitySupplier {
  _id: string;
  _createdAt: string;
  name: string;
  legalName: string | null;
  initials: string | null;
  country: string | null;
  city: string | null;
  status: Supplier['status'] | null;
  contactEmail: string | null;
  contactPhone: string | null;
  registrationNo: string | null;
  joinedAt: string | null;
  rating: number | null;
  fulfilmentRate: number | null;
  reliabilityScore: number | null;
  avgFulfilmentDays: number | null;
  totalGmv: number | null;
  ordersCount: number | null;
  productsCount: number | null;
  categories: string[] | null;
  verificationDocs:
    | { _key: string; label: string; status: 'APPROVED' | 'PENDING' | 'REJECTED'; uploadedAt: string | null }[]
    | null;
  supplierType: Supplier['supplier_type'] | null;
}

interface SanityOffer {
  _id: string;
  _updatedAt: string;
  product: string | null;
  supplier: string | null;
  supplierCost: number | null;
  stock: number | null;
  moq: number | null;
  fulfilmentDays: number | null;
  active: boolean | null;
  lastUpdated: string | null;
}

const PRODUCT_PROJECTION = `{
  _id, _createdAt, name, "slug": slug.current,
  "category": category._ref, "brand": brand._ref,
  emoji, swatch, shortDescription, description,
  specs[]{label, value},
  variants[]{_key, label, sku, price},
  price, compareAtPrice, status, rating, reviewCount, featured, createdAt,
  productType, countryOfOrigin,
  images[]{_key, imageType, alt, "url": asset->url}
}`;

const QUERIES = {
  categories: `*[_type == "category"] | order(sortOrder asc, name asc) { _id, name, "slug": slug.current, emoji, blurb, sortOrder }`,
  brands: `*[_type == "brand"] | order(name asc) { _id, name, "slug": slug.current }`,
  products: `*[_type == "product"] | order(createdAt asc, _createdAt asc) ${PRODUCT_PROJECTION}`,
  suppliers: `*[_type == "supplier"] | order(name asc) {
    _id, _createdAt, name, legalName, initials, country, city, status,
    contactEmail, contactPhone, registrationNo, joinedAt,
    rating, fulfilmentRate, reliabilityScore, avgFulfilmentDays, totalGmv, ordersCount,
    "productsCount": count(*[_type == "supplierOffer" && supplier._ref == ^._id]),
    "categories": categories[]._ref,
    verificationDocs[]{_key, label, status, uploadedAt},
    supplierType
  }`,
  'supplier-offers': `*[_type == "supplierOffer"] | order(_createdAt asc) {
    _id, _updatedAt, "product": product._ref, "supplier": supplier._ref,
    supplierCost, stock, moq, fulfilmentDays, active, lastUpdated
  }`,
} as const;

async function query<T>(groq: string): Promise<T[]> {
  return sanityRead().fetch<T[]>(groq, {}, { cache: 'no-store' });
}

function slugFrom(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toCategory(row: SanityCategory): Category & { sort_order: number } {
  return {
    id: appId(row._id),
    name: row.name,
    slug: row.slug ?? slugFrom(row.name),
    emoji: row.emoji ?? '🛍️',
    blurb: row.blurb ?? '',
    sort_order: row.sortOrder ?? 999,
  };
}

function toBrand(row: SanityBrand): Brand {
  return { id: appId(row._id), name: row.name, slug: row.slug ?? slugFrom(row.name) };
}

function toProduct(row: SanityProduct): Product {
  const swatch = row.swatch ?? [];
  return {
    id: appId(row._id),
    name: row.name,
    slug: row.slug ?? slugFrom(row.name),
    category_id: appId(row.category),
    emoji: row.emoji ?? '📦',
    swatch: [swatch[0] ?? '#D4920A', swatch[1] ?? '#8B5E0A'],
    short_description: row.shortDescription ?? '',
    description: row.description ?? '',
    specs: row.specs ?? [],
    variants: (row.variants ?? []).map((variant) => ({
      id: variant._key,
      label: variant.label,
      sku: variant.sku,
      price: variant.price,
    })),
    price: row.price ?? 0,
    status: row.status ?? 'DRAFT',
    rating: row.rating ?? 0,
    review_count: row.reviewCount ?? 0,
    featured: row.featured ?? false,
    created_at: row.createdAt ?? row._createdAt,
    brand_id: row.brand ? appId(row.brand) : null,
    product_type: row.productType ?? 'PHYSICAL',
    country_of_origin: row.countryOfOrigin ?? undefined,
    ...(row.compareAtPrice ? { compare_at_price: row.compareAtPrice } : {}),
  };
}

function toProductImages(row: SanityProduct): ProductImage[] {
  const productId = appId(row._id);
  const createdAt = row.createdAt ?? row._createdAt;
  return (row.images ?? [])
    .filter((image) => Boolean(image.url))
    .map((image, index) => ({
      id: image._key,
      product_id: productId,
      variant_id: null,
      image_url: image.url!,
      image_type: image.imageType ?? (index === 0 ? 'PRIMARY' : 'GALLERY'),
      sort_order: index,
      source: 'AFRIDEAL',
      permission_status: 'CLEARED',
      created_at: createdAt,
    }));
}

function initialsFrom(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join('');
}

function toSupplier(row: SanitySupplier): Supplier {
  return {
    id: appId(row._id),
    name: row.name,
    legal_name: row.legalName ?? row.name,
    initials: row.initials ?? initialsFrom(row.name),
    country: (row.country ?? 'BW') as Supplier['country'],
    city: row.city ?? '',
    status: row.status ?? 'PENDING',
    contact_email: row.contactEmail ?? '',
    contact_phone: row.contactPhone ?? '',
    registration_no: row.registrationNo ?? '',
    joined_at: row.joinedAt ?? row._createdAt,
    rating: row.rating ?? 0,
    fulfilment_rate: row.fulfilmentRate ?? 0,
    reliability_score: row.reliabilityScore ?? 0,
    avg_fulfilment_days: row.avgFulfilmentDays ?? 0,
    total_gmv: row.totalGmv ?? 0,
    products_count: row.productsCount ?? 0,
    orders_count: row.ordersCount ?? 0,
    verification_docs: (row.verificationDocs ?? []).map((doc) => ({
      id: doc._key,
      label: doc.label,
      status: doc.status,
      uploaded_at: doc.uploadedAt ?? row._createdAt,
    })),
    categories: (row.categories ?? []).map(appId),
    supplier_type: row.supplierType ?? undefined,
    commercial_model: 'AFRIDEAL_MANAGED',
  };
}

function toOffer(row: SanityOffer): SupplierOffer {
  return {
    id: appId(row._id),
    product_id: appId(row.product),
    supplier_id: appId(row.supplier),
    supplier_cost: row.supplierCost ?? 0,
    stock: row.stock ?? 0,
    fulfilment_days: row.fulfilmentDays ?? 0,
    moq: row.moq ?? 1,
    last_updated: row.lastUpdated ?? row._updatedAt,
    active: row.active ?? true,
  };
}

export async function readFromSanity(collection: SanityCollection): Promise<unknown[]> {
  switch (collection) {
    case 'categories':
      return (await query<SanityCategory>(QUERIES.categories)).map(toCategory);
    case 'brands':
      return (await query<SanityBrand>(QUERIES.brands)).map(toBrand);
    case 'products':
      return (await query<SanityProduct>(QUERIES.products)).map(toProduct);
    case 'product-images':
      return (await query<SanityProduct>(QUERIES.products)).flatMap(toProductImages);
    case 'suppliers':
      return (await query<SanitySupplier>(QUERIES.suppliers)).map(toSupplier);
    case 'supplier-offers':
      return (await query<SanityOffer>(QUERIES['supplier-offers'])).map(toOffer);
  }
}

// ── Writes ─────────────────────────────────────────────────────────────────────

type Row = Record<string, unknown> & { id: string };
type FieldMapper = string | ((value: unknown, row: Row) => Record<string, unknown>);

const ref = (collection: Exclude<SanityCollection, 'product-images'>) => (value: unknown) =>
  value ? { [REF_FIELD[collection]]: { _type: 'reference', _ref: sanityId(collection, String(value)) } } : {};

const REF_FIELD: Record<Exclude<SanityCollection, 'product-images'>, string> = {
  products: 'product',
  categories: 'category',
  brands: 'brand',
  suppliers: 'supplier',
  'supplier-offers': 'offer',
};

const slugField = (value: unknown) => ({ slug: { _type: 'slug', current: String(value) } });

/**
 * App field → Sanity field. A string renames; a function builds the Sanity
 * fragment. Fields not listed (derived counts, the JSON store's bookkeeping)
 * are dropped on write.
 */
const FIELD_MAPS: Record<Exclude<SanityCollection, 'product-images'>, Record<string, FieldMapper>> = {
  categories: { name: 'name', slug: slugField, emoji: 'emoji', blurb: 'blurb', sort_order: 'sortOrder' },
  brands: { name: 'name', slug: slugField },
  products: {
    name: 'name',
    slug: slugField,
    category_id: ref('categories'),
    brand_id: ref('brands'),
    emoji: 'emoji',
    swatch: 'swatch',
    short_description: 'shortDescription',
    description: 'description',
    specs: (value) => ({
      specs: ((value as { label: string; value: string }[]) ?? []).map((spec, index) => ({
        _type: 'spec',
        _key: `spec-${index}`,
        label: spec.label,
        value: spec.value,
      })),
    }),
    variants: (value) => ({
      variants: ((value as Product['variants']) ?? []).map((variant) => ({
        _type: 'variant',
        _key: variant.id,
        label: variant.label,
        sku: variant.sku,
        price: variant.price,
      })),
    }),
    price: 'price',
    compare_at_price: 'compareAtPrice',
    status: 'status',
    rating: 'rating',
    review_count: 'reviewCount',
    featured: 'featured',
    created_at: 'createdAt',
    product_type: 'productType',
    country_of_origin: 'countryOfOrigin',
  },
  suppliers: {
    name: 'name',
    legal_name: 'legalName',
    initials: 'initials',
    country: 'country',
    city: 'city',
    status: 'status',
    contact_email: 'contactEmail',
    contact_phone: 'contactPhone',
    registration_no: 'registrationNo',
    joined_at: 'joinedAt',
    rating: 'rating',
    fulfilment_rate: 'fulfilmentRate',
    reliability_score: 'reliabilityScore',
    avg_fulfilment_days: 'avgFulfilmentDays',
    total_gmv: 'totalGmv',
    orders_count: 'ordersCount',
    supplier_type: 'supplierType',
    categories: (value) => ({
      categories: ((value as string[]) ?? []).map((id) => ({
        _type: 'reference',
        _key: id,
        _ref: sanityId('categories', id),
      })),
    }),
    verification_docs: (value) => ({
      verificationDocs: ((value as Supplier['verification_docs']) ?? []).map((doc) => ({
        _type: 'verificationDoc',
        _key: doc.id,
        label: doc.label,
        status: doc.status,
        uploadedAt: doc.uploaded_at,
      })),
    }),
  },
  'supplier-offers': {
    product_id: ref('products'),
    supplier_id: ref('suppliers'),
    supplier_cost: 'supplierCost',
    stock: 'stock',
    fulfilment_days: 'fulfilmentDays',
    moq: 'moq',
    last_updated: 'lastUpdated',
    active: 'active',
  },
};

const SANITY_TYPE: Record<Exclude<SanityCollection, 'product-images'>, string> = {
  products: 'product',
  categories: 'category',
  brands: 'brand',
  suppliers: 'supplier',
  'supplier-offers': 'supplierOffer',
};

function toSanityFields(
  collection: Exclude<SanityCollection, 'product-images'>,
  row: Row,
  keys: string[],
): Record<string, unknown> {
  const map = FIELD_MAPS[collection];
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    const mapper = map[key];
    if (!mapper) continue;
    const value = row[key];
    if (typeof mapper === 'string') {
      if (value !== undefined) out[mapper] = value;
    } else {
      Object.assign(out, mapper(value, row));
    }
  }
  return out;
}

function changedKeys(before: Row, after: Row): string[] {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys].filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
}

/**
 * Persist the difference between two snapshots of a collection as Sanity
 * mutations, in one transaction. `mutate()` in lib/db.ts calls this with the
 * rows it read and the rows the caller handed back, so callers keep writing
 * against plain arrays.
 */
export async function applyToSanity(
  collection: SanityCollection,
  before: unknown[],
  after: unknown[],
): Promise<void> {
  if (collection === 'product-images') {
    throw new Error('Product images are managed in the Studio, not through the app.');
  }

  const previous = new Map((before as Row[]).map((row) => [row.id, row]));
  const next = new Map((after as Row[]).map((row) => [row.id, row]));

  const transaction = sanityWrite().transaction();
  let pending = 0;

  for (const [id, row] of next) {
    const was = previous.get(id);
    if (!was) {
      transaction.create({
        _id: sanityId(collection, id),
        _type: SANITY_TYPE[collection],
        ...toSanityFields(collection, row, Object.keys(row)),
      });
      pending += 1;
      continue;
    }
    const keys = changedKeys(was, row);
    if (keys.length === 0) continue;
    const fields = toSanityFields(collection, row, keys);
    if (Object.keys(fields).length === 0) continue;
    transaction.patch(sanityId(collection, id), (patch) => patch.set(fields));
    pending += 1;
  }

  for (const id of previous.keys()) {
    if (!next.has(id)) {
      transaction.delete(sanityId(collection, id));
      pending += 1;
    }
  }

  if (pending > 0) await transaction.commit({ visibility: 'sync' });
}
