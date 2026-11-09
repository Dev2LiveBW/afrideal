import { beforeEach, describe, expect, it, vi } from 'vitest';

import { insertUnless, readAll } from '@/lib/db';

/*
 * The JSON store over an in-memory disk. `insertUnless` carries the once per buyer
 * rule on promo codes, so what matters is that overlapping calls cannot both pass.
 */

const disk = vi.hoisted(() => new Map<string, string>());

vi.mock('react', async (original) => ({ ...(await original<typeof import('react')>()), cache: (fn: unknown) => fn }));
vi.mock('@/lib/postgres/store', () => ({}));
vi.mock('@/lib/postgres/schema', () => ({ tables: {} }));
vi.mock('@/lib/sanity/catalogue', () => ({ isSanityBacked: () => false }));
vi.mock('node:fs/promises', () => {
  const fs = {
    readFile: async (file: string) => disk.get(file) ?? '[]',
    writeFile: async (file: string, text: string) => void disk.set(file, text),
    rename: async (from: string, to: string) => {
      disk.set(to, disk.get(from) ?? '[]');
      disk.delete(from);
    },
  };
  return { default: fs, ...fs };
});

const row = (id: string, buyer: string) => ({ id, customer_id: buyer }) as never;
const sameBuyer = (buyer: string) => (rows: { customer_id: string }[]) => rows.some((entry) => entry.customer_id === buyer);

beforeEach(() => disk.clear());

describe('insertUnless', () => {
  it('adds the row when nothing refuses it', async () => {
    expect(await insertUnless('orders', row('o1', 'u1'), sameBuyer('u1') as never)).toBe(true);
    expect(await readAll('orders')).toHaveLength(1);
  });

  it('leaves the store alone when refused', async () => {
    await insertUnless('orders', row('o1', 'u1'), sameBuyer('u1') as never);
    expect(await insertUnless('orders', row('o2', 'u1'), sameBuyer('u1') as never)).toBe(false);
    expect(await readAll('orders')).toHaveLength(1);
  });

  it('lets exactly one of many overlapping calls through', async () => {
    const results = await Promise.all(
      Array.from({ length: 8 }, (_, index) => insertUnless('orders', row(`o${index}`, 'u1'), sameBuyer('u1') as never)),
    );
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await readAll('orders')).toHaveLength(1);
  });

  it('still refuses an id that already exists', async () => {
    await insertUnless('orders', row('o1', 'u1'), () => false);
    await expect(insertUnless('orders', row('o1', 'u2'), () => false)).rejects.toThrow('already exists');
  });
});
