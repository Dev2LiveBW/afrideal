/**
 * Turns the storefront's demo seed (`v2/afrideal/afrideal/data/*.json`) into a
 * Sanity NDJSON import so the Studio opens with the same catalogue, suppliers
 * and people the app already renders.
 *
 *   node scripts/seed-from-app.mjs            # writes seed/afrideal.ndjson + seed/products/*
 *   pnpm exec sanity dataset import seed/afrideal.ndjson --dataset production --replace
 *
 * Document ids are deterministic (`product-p001`, `supplier-s001`, …) so the
 * import is idempotent with --replace and references stay stable across runs.
 * Passwords in users.json are deliberately not carried over — Clerk owns
 * credentials.
 */
import {copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const APP = path.resolve(here, '../../v2/afrideal/afrideal')
const DATA = path.join(APP, 'data')
const OUT = path.resolve(here, '../seed')
const OUT_IMAGES = path.join(OUT, 'products')

const read = (name) => JSON.parse(readFileSync(path.join(DATA, `${name}.json`), 'utf8'))
const ref = (id) => ({_type: 'reference', _ref: id})
const slug = (current) => ({_type: 'slug', current})
const key = (id, i) => ({_key: String(id ?? i)})

const categories = read('categories')
const brands = read('brands')
const products = read('products')
const productImages = read('product-images')
const suppliers = read('suppliers')
const supplierOffers = read('supplier-offers')
const runners = read('runners')
const users = read('users')
const supplierUsers = read('supplier-users')

mkdirSync(OUT_IMAGES, {recursive: true})

const docs = []

for (const c of categories) {
  docs.push({
    _id: `category-${c.id}`,
    _type: 'category',
    name: c.name,
    slug: slug(c.slug),
    emoji: c.emoji,
    blurb: c.blurb,
    sortOrder: c.sort_order,
  })
}

for (const b of brands) {
  docs.push({_id: `brand-${b.id}`, _type: 'brand', name: b.name, slug: slug(b.slug)})
}

let copied = 0
let missing = 0
for (const p of products) {
  const images = productImages
    .filter((img) => img.product_id === p.id)
    .sort((a, b) => a.sort_order - b.sort_order)
    .flatMap((img) => {
      const file = path.basename(img.image_url)
      const src = path.join(APP, 'public', img.image_url)
      if (!existsSync(src)) {
        missing++
        return []
      }
      copyFileSync(src, path.join(OUT_IMAGES, file))
      copied++
      return [
        {
          _type: 'image',
          ...key(img.id),
          _sanityAsset: `image@file://./products/${file}`,
          imageType: img.image_type,
          alt: p.name,
        },
      ]
    })

  docs.push({
    _id: `product-${p.id}`,
    _type: 'product',
    name: p.name,
    slug: slug(p.slug),
    category: ref(`category-${p.category_id}`),
    ...(p.brand_id ? {brand: ref(`brand-${p.brand_id}`)} : {}),
    status: p.status,
    featured: Boolean(p.featured),
    shortDescription: p.short_description,
    description: p.description,
    specs: (p.specs ?? []).map((s, i) => ({_type: 'spec', ...key(null, i), label: s.label, value: s.value})),
    emoji: p.emoji,
    swatch: p.swatch,
    productType: p.product_type ?? 'PHYSICAL',
    countryOfOrigin: p.country_of_origin,
    price: p.price,
    ...(p.compare_at_price ? {compareAtPrice: p.compare_at_price} : {}),
    variants: (p.variants ?? []).map((v) => ({
      _type: 'variant',
      ...key(v.id),
      label: v.label,
      sku: v.sku,
      price: v.price,
    })),
    images,
    rating: p.rating,
    reviewCount: p.review_count,
    createdAt: p.created_at,
  })
}

for (const s of suppliers) {
  docs.push({
    _id: `supplier-${s.id}`,
    _type: 'supplier',
    name: s.name,
    legalName: s.legal_name,
    initials: s.initials,
    status: s.status,
    supplierType: s.supplier_type,
    categories: (s.categories ?? []).map((cid) => ({...ref(`category-${cid}`), _key: cid})),
    country: s.country,
    city: s.city,
    contactEmail: s.contact_email,
    contactPhone: s.contact_phone,
    registrationNo: s.registration_no,
    verificationDocs: (s.verification_docs ?? []).map((d) => ({
      _type: 'verificationDoc',
      ...key(d.id),
      label: d.label,
      status: d.status,
      uploadedAt: d.uploaded_at,
    })),
    joinedAt: s.joined_at,
    rating: s.rating,
    fulfilmentRate: s.fulfilment_rate,
    reliabilityScore: s.reliability_score,
    avgFulfilmentDays: s.avg_fulfilment_days,
    ordersCount: s.orders_count,
    totalGmv: s.total_gmv,
  })
}

for (const o of supplierOffers) {
  docs.push({
    _id: `offer-${o.id}`,
    _type: 'supplierOffer',
    product: ref(`product-${o.product_id}`),
    supplier: ref(`supplier-${o.supplier_id}`),
    supplierCost: o.supplier_cost,
    stock: o.stock,
    moq: o.moq,
    fulfilmentDays: o.fulfilment_days,
    active: o.active !== false,
    lastUpdated: o.last_updated,
  })
}

const supplierByUser = new Map(supplierUsers.map((su) => [su.user_id, su.supplier_id]))
for (const u of users) {
  const supplierId = supplierByUser.get(u.id)
  docs.push({
    _id: `user-${u.id}`,
    _type: 'user',
    name: u.name,
    email: u.email,
    role: u.role,
    status: u.status,
    avatar: u.avatar,
    ...(supplierId ? {supplier: ref(`supplier-${supplierId}`)} : {}),
  })
}

for (const r of runners) {
  docs.push({
    _id: `runner-${r.id}`,
    _type: 'runner',
    name: r.name,
    initials: r.initials,
    phone: r.phone,
    city: r.city,
    vehicle: r.vehicle,
    plate: r.plate,
    online: Boolean(r.online),
    rating: r.rating,
    deliveriesCompleted: r.deliveries_completed,
    ...(r.user_id ? {account: ref(`user-${r.user_id}`)} : {}),
  })
}

const outFile = path.join(OUT, 'afrideal.ndjson')
writeFileSync(outFile, docs.map((d) => JSON.stringify(d)).join('\n') + '\n')

const counts = docs.reduce((acc, d) => ((acc[d._type] = (acc[d._type] ?? 0) + 1), acc), {})
console.log(`wrote ${docs.length} documents to ${path.relative(process.cwd(), outFile)}`)
console.log(counts)
console.log(`images: ${copied} copied, ${missing} missing`)
