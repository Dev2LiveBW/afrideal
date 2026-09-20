import 'server-only';
import { inArray, sql } from 'drizzle-orm';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';

import { getHttpDb, getPoolDb } from './client';
import { tables, type PostgresCollection } from './schema';
import type * as schema from './schema';

/**
 * The Postgres adapter behind lib/db.ts.
 *
 * Same contract as the JSON files and the Sanity catalogue: a collection is
 * read whole, and a mutation hands back the whole collection to persist. Here
 * the write is a diff - rows whose JSON changed are upserted, rows that
 * disappeared are deleted - inside one transaction that first takes an
 * advisory lock on the collection. That lock is what the JSON store's
 * in-process promise chain could never give: one writer per collection across
 * every server instance, so two checkouts on two Vercel functions cannot
 * interleave and lose an update.
 *
 * Every call retries once or twice on a connection-class failure (a dropped
 * socket, a compute waking from scale-to-zero, a serialisation clash). A
 * retried transaction is safe: the callback is a pure function of the rows it
 * is handed, and the write is an upsert, so replaying after a lost COMMIT ack
 * changes nothing.
 */

type Row = { id: string };

// The HTTP client and a pool transaction share this base, so helpers take either.
type Executor = PgDatabase<PgQueryResultHKT, typeof schema>;

const RETRY_DELAYS_MS = [150, 600];

const TRANSIENT_CODES = new Set([
  '08000', '08003', '08006', '08001', '08004', // connection exceptions
  '57P01', '57P02', '57P03', // admin shutdown / crash shutdown / cannot connect now
  '40001', '40P01', // serialisation failure / deadlock
  'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'EPIPE',
]);

function isTransient(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; current && depth < 4; depth += 1) {
    const e = current as { code?: string; message?: string; type?: string; cause?: unknown };
    if (e.code && TRANSIENT_CODES.has(e.code)) return true;
    if (e.type === 'error' && !e.code) return true; // a WebSocket ErrorEvent
    if (typeof e.message === 'string' && /fetch failed|socket|websocket|terminat|timeout/i.test(e.message)) {
      return true;
    }
    current = e.cause;
  }
  return false;
}

async function withRetry<T>(label: string, work: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await work();
    } catch (error) {
      const delay = RETRY_DELAYS_MS[attempt];
      if (delay === undefined || !isTransient(error)) throw error;
      console.warn(`[postgres] ${label}: transient failure, retrying in ${delay}ms`, (error as Error).message);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

async function readWith<T extends Row>(exec: Executor, collection: PostgresCollection): Promise<T[]> {
  const table = tables[collection];
  const rows = await exec.select({ data: table.data }).from(table).orderBy(table.seq);
  return rows.map((row) => row.data as T);
}

/** Every row of a collection, in insertion order. */
export async function readFromPostgres<T extends Row>(collection: PostgresCollection): Promise<T[]> {
  return withRetry(`read ${collection}`, () => readWith<T>(getHttpDb(), collection));
}

/**
 * Serialised read-modify-write. Same signature as the callback `mutate()`
 * takes, run inside a transaction that holds the collection's lock.
 */
export async function mutateInPostgres<T extends Row, R>(
  collection: PostgresCollection,
  fn: (rows: T[]) => Promise<{ rows: T[]; result: R }> | { rows: T[]; result: R },
): Promise<R> {
  return withRetry(`mutate ${collection}`, () =>
    getPoolDb().transaction(async (tx) => {
      // Transaction-scoped, so it works through Neon's transaction-mode pooler
      // (a session-level lock would not).
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`afrideal:${collection}`}))`);

      const before = await readWith<T>(tx, collection);
      const { rows: after, result } = await fn(before);
      await applyWith(tx, collection, before, after);
      return result;
    }),
  );
}

async function applyWith<T extends Row>(
  exec: Executor,
  collection: PostgresCollection,
  before: T[],
  after: T[],
): Promise<void> {
  const table = tables[collection];
  const previous = new Map(before.map((row) => [row.id, row]));
  const kept = new Set(after.map((row) => row.id));

  // Untouched rows come back as the same object, so the cheap check catches
  // most of them; the stringify handles a row rebuilt with the same content.
  const changed = after.filter((row) => {
    const was = previous.get(row.id);
    if (was === row) return false;
    return was === undefined || JSON.stringify(was) !== JSON.stringify(row);
  });
  const removed = before.filter((row) => !kept.has(row.id)).map((row) => row.id);

  if (changed.length > 0) {
    await exec
      .insert(table)
      .values(changed.map((row) => ({ id: row.id, data: row as Record<string, unknown> })))
      .onConflictDoUpdate({
        target: table.id,
        set: { data: sql`excluded.data`, updatedAt: sql`now()` },
      });
  }

  if (removed.length > 0) {
    await exec.delete(table).where(inArray(table.id, removed));
  }
}
