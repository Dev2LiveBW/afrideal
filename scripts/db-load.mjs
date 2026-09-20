/**
 * Load every collection in /data into Postgres.
 *
 *   npm run db:load                 # all 25 collections
 *   npm run db:load -- --only orders,order-items
 *
 * Each table is truncated and refilled in file order inside one transaction,
 * so a half-finished load never leaves a collection partly old and partly
 * new. `npm run seed` calls this itself when DB_DRIVER=postgres, so the usual
 * "reset the demo" command still does the whole job.
 *
 * Tables must already exist: `npm run db:migrate` first.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import nextEnv from '@next/env';
import { Pool } from '@neondatabase/serverless';

const ROOT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const SCHEMA = 'afrideal';
const CHUNK = 200;

nextEnv.loadEnvConfig(ROOT_DIR);

const tableFor = (collection) => collection.replaceAll('-', '_');

export async function loadAll({ only } = {}) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set in .env.local');

  const names = (await fs.readdir(DATA_DIR))
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.slice(0, -'.json'.length))
    .filter((name) => !only || only.includes(name))
    .sort();

  const pool = new Pool({ connectionString: url });
  const client = await pool.connect();
  const summary = [];

  try {
    for (const collection of names) {
      const rows = JSON.parse(await fs.readFile(path.join(DATA_DIR, `${collection}.json`), 'utf8'));
      const table = `"${SCHEMA}"."${tableFor(collection)}"`;

      const ids = new Set();
      for (const row of rows) {
        if (typeof row.id !== 'string') throw new Error(`${collection}: a row has no string id`);
        if (ids.has(row.id)) throw new Error(`${collection}: duplicate id ${row.id}`);
        ids.add(row.id);
      }

      await client.query('BEGIN');
      try {
        await client.query(`TRUNCATE ${table} RESTART IDENTITY`);
        for (let i = 0; i < rows.length; i += CHUNK) {
          const chunk = rows.slice(i, i + CHUNK);
          const values = chunk.map((_, j) => `($${j * 2 + 1}, $${j * 2 + 2}::jsonb)`).join(', ');
          const params = chunk.flatMap((row) => [row.id, JSON.stringify(row)]);
          await client.query(`INSERT INTO ${table} (id, data) VALUES ${values}`, params);
        }
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
      summary.push([collection, rows.length]);
    }
  } finally {
    client.release();
    await pool.end();
  }

  return summary;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const onlyArg = process.argv.find((a) => a.startsWith('--only'));
  const only = onlyArg
    ? (onlyArg.includes('=') ? onlyArg.split('=')[1] : process.argv[process.argv.indexOf(onlyArg) + 1])
        .split(',')
        .map((s) => s.trim())
    : undefined;

  const t0 = Date.now();
  const summary = await loadAll({ only });
  console.log(`Loaded ${summary.length} collection(s) into Postgres in ${((Date.now() - t0) / 1000).toFixed(1)}s\n`);
  for (const [name, count] of summary) console.log(`  ${name.padEnd(18)} ${String(count).padStart(4)} rows`);
}
