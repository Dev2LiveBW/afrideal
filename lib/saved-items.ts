import type { SavedItem } from '@/types';

/**
 * A buyer's saved items (spec 0011, AC-14 to AC-16). Plain functions over the
 * rows, so `mutate()` runs them under its lock: the one row per product and the
 * limit only hold if they are read and written together. Both are idempotent,
 * because a double tap on a heart is not an error.
 */

export const MAX_SAVED_ITEMS = 200;

export type SaveResult = { ok: true; item: SavedItem } | { ok: false; reason: 'FULL' };

export function saveItem(
  rows: SavedItem[],
  input: { id: string; userId: string; productId: string; now: string },
): { rows: SavedItem[]; result: SaveResult } {
  const mine = rows.filter((row) => row.user_id === input.userId);

  const existing = mine.find((row) => row.product_id === input.productId);
  if (existing) return { rows, result: { ok: true, item: existing } };

  if (mine.length >= MAX_SAVED_ITEMS) return { rows, result: { ok: false, reason: 'FULL' } };

  const item: SavedItem = {
    id: input.id,
    user_id: input.userId,
    product_id: input.productId,
    created_at: input.now,
  };
  return { rows: [...rows, item], result: { ok: true, item } };
}

export function removeItem(
  rows: SavedItem[],
  userId: string,
  productId: string,
): { rows: SavedItem[]; result: null } {
  return {
    rows: rows.filter((row) => !(row.user_id === userId && row.product_id === productId)),
    result: null,
  };
}

/** Newest first, the order the account lists them in. */
export function savedNewestFirst(rows: SavedItem[]): SavedItem[] {
  return [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at));
}
