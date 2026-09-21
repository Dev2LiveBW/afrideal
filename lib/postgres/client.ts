import 'server-only';
import { neon, Pool } from '@neondatabase/serverless';
import { drizzle as drizzleHttp, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { drizzle as drizzleWs, type NeonDatabase } from 'drizzle-orm/neon-serverless';

import { allowSlowHandshakes } from './network.mjs';
import * as schema from './schema';

/**
 * Two ways into the same database, each created on first use so that
 * `DB_DRIVER=json` never opens a connection.
 *
 * Reads go over Neon's HTTP driver: one fetch per query, nothing to keep
 * alive, nothing for a scale-to-zero pause or a flaky link to kill under us.
 * That is what a serverless function wants for a `SELECT`.
 *
 * Mutations need an interactive transaction (lock, read, run the caller's
 * function, write), which HTTP cannot do, so they use the WebSocket pool.
 * Node 22 has a global WebSocket; no `ws` shim needed.
 *
 * Both hang off `globalThis` because Next's dev server re-evaluates modules
 * on every edit and would otherwise leak a client per reload.
 */

type HttpDb = NeonHttpDatabase<typeof schema>;
type PoolDb = NeonDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { __afridealHttp?: HttpDb; __afridealPool?: PoolDb };

function connectionString(): string {
  allowSlowHandshakes();
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set - DB_DRIVER=postgres needs the Neon connection string in .env.local');
  }
  return url;
}

/** Stateless HTTP client for reads. */
export function getHttpDb(): HttpDb {
  if (!globalForDb.__afridealHttp) {
    globalForDb.__afridealHttp = drizzleHttp({ client: neon(connectionString()), schema });
  }
  return globalForDb.__afridealHttp;
}

/** Pooled WebSocket client for transactions. */
export function getPoolDb(): PoolDb {
  if (!globalForDb.__afridealPool) {
    const pool = new Pool({ connectionString: connectionString() });
    // A pool client that dies while idle must not take the process with it.
    pool.on('error', () => undefined);
    globalForDb.__afridealPool = drizzleWs({ client: pool, schema });
  }
  return globalForDb.__afridealPool;
}
