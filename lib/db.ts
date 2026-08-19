import 'server-only';
import fs from 'node:fs/promises';
import path from 'node:path';

import type {
  AppNotification,
  AuditEntry,
  Brand,
  Category,
  CustomerPrice,
  Dispute,
  EscrowRecord,
  InventoryRecord,
  MarginRule,
  Order,
  OrderItem,
  PricingRule,
  Product,
  ProductImage,
  Rfq,
  RfqResponse,
  Runner,
  Settlement,
  Shipment,
  Supplier,
  SupplierOffer,
  SupplierOrder,
  SupplierUser,
  User,
} from '@/types';

/**
 * The JSON store.
 *
 * Every collection is one file under /data. Reads are uncached so a write from
 * one request is visible to the next — which is the whole point of a demo you
 * can drive live in front of a room.
 *
 * Writes go through a per-file promise chain. Node is single-threaded, but an
 * `await` inside read-modify-write is a yield point, so two concurrent POSTs to
 * the same collection can interleave and lose an update. `mutate()` serialises
 * them and is the only sanctioned way to change a collection.
 */

const DATA_DIR = path.join(process.cwd(), 'data');

export interface Schema {
  users: User;
  products: Product;
  categories: Category;
  suppliers: Supplier;
  'supplier-offers': SupplierOffer;
  inventory: InventoryRecord;
  orders: Order;
  'order-items': OrderItem;
  'supplier-orders': SupplierOrder;
  'pricing-rules': PricingRule;
  escrow: EscrowRecord;
  disputes: Dispute;
  runners: Runner;
  shipments: Shipment;
  settlements: Settlement;
  'audit-log': AuditEntry;
  notifications: AppNotification;

  // Procurement model (revised spec §3–§27).
  'customer-prices': CustomerPrice;
  'margin-rules': MarginRule;
  rfqs: Rfq;
  'rfq-responses': RfqResponse;
  brands: Brand;
  'product-images': ProductImage;
  'supplier-users': SupplierUser;
}

export type Collection = keyof Schema;

function fileFor(collection: Collection): string {
  return path.join(DATA_DIR, `${collection}.json`);
}

/** Read a whole collection. */
export async function readAll<C extends Collection>(collection: C): Promise<Schema[C][]> {
  const raw = await fs.readFile(fileFor(collection), 'utf8');
  return JSON.parse(raw) as Schema[C][];
}

/** Overwrite a whole collection. Prefer `mutate()` unless you already hold the lock. */
async function writeAll<C extends Collection>(collection: C, rows: Schema[C][]): Promise<void> {
  const tmp = `${fileFor(collection)}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(rows, null, 2)}\n`, 'utf8');
  await fs.rename(tmp, fileFor(collection));
}

// One tail-promise per collection. Each mutation appends to its chain.
const locks = new Map<Collection, Promise<unknown>>();

/**
 * Serialised read-modify-write. The callback receives the current rows and
 * returns the rows to persist; whatever it returns as `result` is handed back.
 */
export async function mutate<C extends Collection, R>(
  collection: C,
  fn: (rows: Schema[C][]) => Promise<{ rows: Schema[C][]; result: R }> | { rows: Schema[C][]; result: R },
): Promise<R> {
  const previous = locks.get(collection) ?? Promise.resolve();

  const next = previous.then(async () => {
    const rows = await readAll(collection);
    const { rows: updated, result } = await fn(rows);
    await writeAll(collection, updated);
    return result;
  });

  // Keep the chain alive even if this link rejects, so one failure does not
  // wedge every later write to the same collection.
  locks.set(
    collection,
    next.catch(() => undefined),
  );

  return next;
}

/** First row matching a predicate, or null. */
export async function findOne<C extends Collection>(
  collection: C,
  predicate: (row: Schema[C]) => boolean,
): Promise<Schema[C] | null> {
  const rows = await readAll(collection);
  return rows.find(predicate) ?? null;
}

/** Row by `id`, or null. */
export async function findById<C extends Collection>(
  collection: C,
  id: string,
): Promise<Schema[C] | null> {
  return findOne(collection, (row) => (row as { id: string }).id === id);
}

/** All rows matching a predicate. */
export async function findMany<C extends Collection>(
  collection: C,
  predicate: (row: Schema[C]) => boolean,
): Promise<Schema[C][]> {
  const rows = await readAll(collection);
  return rows.filter(predicate);
}

/** Append a row. */
export async function insert<C extends Collection>(
  collection: C,
  row: Schema[C],
): Promise<Schema[C]> {
  return mutate(collection, (rows) => ({ rows: [...rows, row], result: row }));
}

/** Append several rows in one write. */
export async function insertMany<C extends Collection>(
  collection: C,
  incoming: Schema[C][],
): Promise<Schema[C][]> {
  return mutate(collection, (rows) => ({ rows: [...rows, ...incoming], result: incoming }));
}

/** Shallow-merge a patch into the row with `id`. Returns null when not found. */
export async function update<C extends Collection>(
  collection: C,
  id: string,
  patch: Partial<Schema[C]> | ((row: Schema[C]) => Partial<Schema[C]>),
): Promise<Schema[C] | null> {
  return mutate(collection, (rows) => {
    const index = rows.findIndex((row) => (row as { id: string }).id === id);
    if (index === -1) return { rows, result: null };

    const current = rows[index];
    const delta = typeof patch === 'function' ? patch(current) : patch;
    const merged = { ...current, ...delta };

    const updated = [...rows];
    updated[index] = merged;
    return { rows: updated, result: merged };
  });
}

/** Remove the row with `id`. Returns whether anything was removed. */
export async function remove<C extends Collection>(collection: C, id: string): Promise<boolean> {
  return mutate(collection, (rows) => {
    const kept = rows.filter((row) => (row as { id: string }).id !== id);
    return { rows: kept, result: kept.length !== rows.length };
  });
}

/**
 * Next id for a collection, e.g. `nextId('orders', 'o')` → `o016`.
 * Scans existing ids rather than counting rows, so deletes cannot cause a clash.
 */
export async function nextId<C extends Collection>(
  collection: C,
  prefix: string,
  width = 3,
): Promise<string> {
  const rows = await readAll(collection);
  const highest = rows.reduce((max, row) => {
    const id = (row as { id: string }).id;
    if (!id.startsWith(prefix)) return max;
    const n = Number.parseInt(id.slice(prefix.length), 10);
    return Number.isFinite(n) && n > max ? n : max;
  }, 0);

  return `${prefix}${String(highest + 1).padStart(width, '0')}`;
}
