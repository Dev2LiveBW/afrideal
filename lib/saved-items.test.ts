import { describe, expect, it } from 'vitest';

import { MAX_SAVED_ITEMS, removeItem, saveItem, savedNewestFirst } from '@/lib/saved-items';
import type { SavedItem } from '@/types';

const row = (id: string, userId: string, productId: string, createdAt = '2026-11-01T08:00:00.000Z'): SavedItem => ({
  id,
  user_id: userId,
  product_id: productId,
  created_at: createdAt,
});

const save = (rows: SavedItem[], userId = 'u1', productId = 'p1') =>
  saveItem(rows, { id: 'new', userId, productId, now: '2026-11-04T08:00:00.000Z' });

describe('saveItem', () => {
  it('adds a row for the buyer', () => {
    const { rows, result } = save([]);
    expect(rows).toHaveLength(1);
    expect(result).toMatchObject({ ok: true, item: { id: 'new', user_id: 'u1', product_id: 'p1' } });
  });

  it('saving the same product twice keeps one row and returns the first', () => {
    const existing = [row('sav1', 'u1', 'p1')];
    const { rows, result } = save(existing);
    expect(rows).toBe(existing);
    expect(result).toMatchObject({ ok: true, item: { id: 'sav1' } });
  });

  it('lets two buyers save the same product', () => {
    expect(save([row('sav1', 'u2', 'p1')]).rows).toHaveLength(2);
  });

  it('refuses the 201st item, but still accepts one already saved', () => {
    const full = Array.from({ length: MAX_SAVED_ITEMS }, (_, index) => row(`sav${index}`, 'u1', `p${index}`));
    expect(save(full, 'u1', 'another').result).toEqual({ ok: false, reason: 'FULL' });
    expect(save(full, 'u1', 'p3').result).toMatchObject({ ok: true });
  });

  it('counts the limit per buyer', () => {
    const full = Array.from({ length: MAX_SAVED_ITEMS }, (_, index) => row(`sav${index}`, 'u2', `p${index}`));
    expect(save(full).result).toMatchObject({ ok: true });
  });
});

describe('removeItem', () => {
  it("removes only that buyer's row", () => {
    const { rows } = removeItem([row('a', 'u1', 'p1'), row('b', 'u2', 'p1')], 'u1', 'p1');
    expect(rows.map((entry) => entry.id)).toEqual(['b']);
  });

  it('is fine with something already gone', () => {
    expect(removeItem([], 'u1', 'p1').rows).toEqual([]);
  });
});

describe('savedNewestFirst', () => {
  it('puts the latest save on top without touching the input', () => {
    const rows = [row('old', 'u1', 'p1', '2026-01-01T00:00:00.000Z'), row('new', 'u1', 'p2', '2026-02-01T00:00:00.000Z')];
    expect(savedNewestFirst(rows).map((entry) => entry.id)).toEqual(['new', 'old']);
    expect(rows[0].id).toBe('old');
  });
});
