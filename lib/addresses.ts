import { z } from 'zod';

import type { Address } from '@/types';

/**
 * A buyer's address book (spec 0011). The rules live here as plain functions
 * over the rows, so `mutate()` can run them under its lock: the limit and the
 * one default can only hold if they are read and written together.
 */

export const MAX_ADDRESSES = 10;

/** Digits with the usual separators, and an optional leading plus. */
export const PHONE_PATTERN = /^\+?[(0-9][0-9 ()-]{5,28}$/;

export const AddressFieldsSchema = z.object({
  label: z.string().trim().min(1, 'Give this address a label.').max(40, 'Keep the label under 40 characters.'),
  recipient_name: z.string().trim().min(2, 'Enter who receives the delivery.').max(120),
  phone: z.string().trim().regex(PHONE_PATTERN, 'Enter a phone number we can reach.'),
  country: z.string().trim().toUpperCase().length(2, 'Choose a country.'),
  town: z.string().trim().min(2, 'Enter a city or town.').max(120),
  street: z.string().trim().min(4, 'Enter a street address or plot number.').max(200),
});

export type AddressFields = z.infer<typeof AddressFieldsSchema>;

export type AddressResult =
  | { ok: true; address: Address }
  | { ok: false; reason: 'FULL' | 'DUPLICATE' | 'NOT_FOUND' };

type Change<R> = { rows: Address[]; result: R };

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Whether two addresses are the same place, ignoring who it is for. */
export function samePlace(
  a: Pick<Address, 'street' | 'town' | 'country'>,
  b: Pick<Address, 'street' | 'town' | 'country'>,
): boolean {
  return same(a.street, b.street) && same(a.town, b.town) && same(a.country, b.country);
}

/** The default first, then the most recently changed. */
export function inBookOrder(addresses: Address[]): Address[] {
  return [...addresses].sort(
    (a, b) => Number(b.is_default) - Number(a.is_default) || b.updated_at.localeCompare(a.updated_at),
  );
}

/** Moves the default to `id`, leaving every other buyer's rows alone. */
function withDefault(rows: Address[], userId: string, id: string): Address[] {
  return rows.map((row) => (row.user_id === userId ? { ...row, is_default: row.id === id } : row));
}

export function addAddress(
  rows: Address[],
  args: {
    id: string;
    userId: string;
    fields: AddressFields;
    now: string;
    makeDefault?: boolean;
    /** Checkout saves in passing, so it skips a place already in the book. */
    refuseDuplicates?: boolean;
  },
): Change<AddressResult> {
  const mine = rows.filter((row) => row.user_id === args.userId);
  if (mine.length >= MAX_ADDRESSES) return { rows, result: { ok: false, reason: 'FULL' } };
  if (args.refuseDuplicates && mine.some((row) => samePlace(row, args.fields))) {
    return { rows, result: { ok: false, reason: 'DUPLICATE' } };
  }

  const address: Address = {
    id: args.id,
    user_id: args.userId,
    ...args.fields,
    // AC-2: the first address is the default, so a book is never without one.
    is_default: mine.length === 0,
    created_at: args.now,
    updated_at: args.now,
  };
  const next = [...rows, address];
  if (!args.makeDefault) return { rows: next, result: { ok: true, address } };

  const moved = withDefault(next, args.userId, address.id);
  return { rows: moved, result: { ok: true, address: { ...address, is_default: true } } };
}

export function updateAddress(
  rows: Address[],
  args: { id: string; userId: string; fields: Partial<AddressFields>; makeDefault?: boolean; now: string },
): Change<AddressResult> {
  const current = rows.find((row) => row.id === args.id && row.user_id === args.userId);
  if (!current) return { rows, result: { ok: false, reason: 'NOT_FOUND' } };

  const edited = rows.map((row) =>
    row.id === current.id ? { ...row, ...args.fields, updated_at: args.now } : row,
  );
  // Only ever moved, never cleared: taking the default off with no other
  // chosen would leave the book without one.
  const next = args.makeDefault ? withDefault(edited, args.userId, current.id) : edited;
  const address = next.find((row) => row.id === current.id) as Address;
  return { rows: next, result: { ok: true, address } };
}

export function removeAddress(
  rows: Address[],
  args: { id: string; userId: string },
): Change<{ ok: boolean }> {
  const target = rows.find((row) => row.id === args.id && row.user_id === args.userId);
  if (!target) return { rows, result: { ok: false } };

  const remaining = rows.filter((row) => row.id !== target.id);
  if (!target.is_default) return { rows: remaining, result: { ok: true } };

  // AC-2: the default goes to the address the buyer touched most recently.
  const heir = remaining
    .filter((row) => row.user_id === args.userId)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];
  return { rows: heir ? withDefault(remaining, args.userId, heir.id) : remaining, result: { ok: true } };
}
