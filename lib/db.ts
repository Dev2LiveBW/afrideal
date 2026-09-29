import 'server-only';
import fs from 'node:fs/promises';
import path from 'node:path';
import { cache } from 'react';

import { mutateInPostgres, readFromPostgres, reserveIds } from '@/lib/postgres/store';
import { tables as postgresTables } from '@/lib/postgres/schema';
import { applyToSanity, isSanityBacked, readFromSanity } from '@/lib/sanity/catalogue';

import type {
  AppNotification,
  AuditEntry,
  Brand,
  Category,
  CustomerPrice,
  Dispute,
  SupplierPayable,
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
  RunnerRequest,
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
 * Every collection is one file under /data. Reads are memoised only within a
 * request, never across them, so a write from one request is visible to the
 * next - which is the whole point of a demo you can drive live in front of a
 * room.
 *
 * Writes go through a per-file promise chain. Node is single-threaded, but an
 * `await` inside read-modify-write is a yield point, so two concurrent POSTs to
 * the same collection can interleave and lose an update. `mutate()` serialises
 * them and is the only sanctioned way to change a collection.
 *
 * With `CATALOGUE_SOURCE=sanity` the six catalogue collections (products and
 * their images, categories, brands, suppliers, supplier offers) are read from
 * and written to the Sanity dataset the Studio edits instead - see
 * lib/sanity/catalogue.ts.
 *
 * With `DB_DRIVER=postgres` every collection Sanity does not own lives in
 * Neon Postgres instead of a file - see lib/postgres/store.ts. Same
 * signatures, same read-whole-then-diff write, plus a database-level lock so
 * the serialisation holds across server instances, not just inside one.
 *
 * Routing is by collection name, so nothing outside this file knows which
 * store it hit.
 */

const DATA_DIR = path.join(process.cwd(), 'data');

const CATALOGUE_SOURCE = process.env.CATALOGUE_SOURCE ?? 'json';
const DB_DRIVER = process.env.DB_DRIVER ?? 'json';

function viaSanity(collection: Collection): boolean {
  return CATALOGUE_SOURCE === 'sanity' && isSanityBacked(collection);
}

function viaPostgres(collection: Collection): boolean {
  return DB_DRIVER === 'postgres' && !viaSanity(collection);
}

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
  'supplier-payables': SupplierPayable;
  disputes: Dispute;
  runners: Runner;
  'runner-requests': RunnerRequest;
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

// Adding a collection above without a table in lib/postgres/schema.ts fails here.
const _everyCollectionHasATable: Record<Collection, unknown> = postgresTables;
void _everyCollectionHasATable;

function fileFor(collection: Collection): string {
  return path.join(DATA_DIR, `${collection}.json`);
}

/** Read a whole collection from whichever store owns it. Never memoised. */
async function readFresh<C extends Collection>(collection: C): Promise<Schema[C][]> {
  if (viaSanity(collection)) {
    return (await readFromSanity(collection as Parameters<typeof readFromSanity>[0])) as Schema[C][];
  }
  if (viaPostgres(collection)) {
    return readFromPostgres<Schema[C] & { id: string }>(collection);
  }
  const raw = await fs.readFile(fileFor(collection), 'utf8');
  return JSON.parse(raw) as Schema[C][];
}

/**
 * Reads already made in this request, keyed by collection. React scopes
 * `cache()` to one server render, so a page's layout, page and components
 * share one read per collection instead of each paying a round trip; outside
 * a render (a script, a test) it is a fresh Map every call and nothing is
 * memoised. A mutation drops its collection's entry so the next read in the
 * same request sees the write.
 */
const requestReads = cache(() => new Map<Collection, Promise<unknown[]>>());

/** Read a whole collection, once per request. Callers get their own array. */
export async function readAll<C extends Collection>(collection: C): Promise<Schema[C][]> {
  const memo = requestReads();
  let pending = memo.get(collection);
  if (!pending) {
    pending = readFresh(collection);
    memo.set(collection, pending);
  }
  const rows = (await pending) as Schema[C][];
  return [...rows];
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
  const memo = requestReads();

  const next = previous.then(async () => {
    try {
      if (viaPostgres(collection)) {
        // Read, fn and write all happen inside one locked transaction.
        return await mutateInPostgres<Schema[C] & { id: string }, R>(collection, fn as never);
      }
      // Fresh, not memoised: a read taken before the lock could predate
      // another request's write, and fn would then overwrite it.
      const rows = await readFresh(collection);
      const { rows: updated, result } = await fn(rows);
      if (viaSanity(collection)) {
        await applyToSanity(collection as Parameters<typeof applyToSanity>[0], rows, updated);
      } else {
        await writeAll(collection, updated);
      }
      return result;
    } finally {
      memo.delete(collection);
    }
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

/**
 * Refuse to append an id that is already there. Runs inside the mutation, so
 * it sees every committed row; on Postgres a silent duplicate would otherwise
 * become an upsert over someone else's record.
 */
function assertNewIds<C extends Collection>(collection: C, rows: Schema[C][], incoming: Schema[C][]): void {
  const taken = new Set(rows.map((row) => (row as { id: string }).id));
  for (const row of incoming) {
    const id = (row as { id: string }).id;
    if (taken.has(id)) throw new Error(`${collection}: id ${id} already exists`);
    taken.add(id);
  }
}

/** Append a row. */
export async function insert<C extends Collection>(
  collection: C,
  row: Schema[C],
): Promise<Schema[C]> {
  return mutate(collection, (rows) => {
    assertNewIds(collection, rows, [row]);
    return { rows: [...rows, row], result: row };
  });
}

/** Append several rows in one write. */
export async function insertMany<C extends Collection>(
  collection: C,
  incoming: Schema[C][],
): Promise<Schema[C][]> {
  return mutate(collection, (rows) => {
    assertNewIds(collection, rows, incoming);
    return { rows: [...rows, ...incoming], result: incoming };
  });
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
 * The next `count` ids for a collection, e.g. `nextIds('order-items', 'oi', 3)`
 * → `['oi024', 'oi025', 'oi026']`. Scans existing ids rather than counting
 * rows, so deletes cannot cause a clash. On Postgres the numbers are reserved
 * through an atomic counter as well, so two server instances minting at the
 * same moment cannot both get `o016`; a scan alone cannot promise that.
 */
export async function nextIds<C extends Collection>(
  collection: C,
  prefix: string,
  count: number,
  width = 3,
): Promise<string[]> {
  const rows = await readAll(collection);
  const highest = rows.reduce((max, row) => {
    const id = (row as { id: string }).id;
    if (!id.startsWith(prefix)) return max;
    const n = Number.parseInt(id.slice(prefix.length), 10);
    return Number.isFinite(n) && n > max ? n : max;
  }, 0);

  const last =
    DB_DRIVER === 'postgres' ? await reserveIds(`${collection}:${prefix}`, count, highest) : highest + count;
  const first = last - count + 1;
  return Array.from({ length: count }, (_, i) => `${prefix}${String(first + i).padStart(width, '0')}`);
}

/** Next id for a collection, e.g. `nextId('orders', 'o')` → `o016`. */
export async function nextId<C extends Collection>(
  collection: C,
  prefix: string,
  width = 3,
): Promise<string> {
  const [id] = await nextIds(collection, prefix, 1, width);
  return id;
}
