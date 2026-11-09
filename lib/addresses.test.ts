import { describe, expect, it } from 'vitest';

import type { Address } from '@/types';

import {
  AddressFieldsSchema,
  MAX_ADDRESSES,
  addAddress,
  inBookOrder,
  removeAddress,
  samePlace,
  updateAddress,
} from './addresses';

const fields = {
  label: 'Home',
  recipient_name: 'Kefilwe Dithebe',
  phone: '+267 71 234 567',
  country: 'BW',
  town: 'Gaborone',
  street: 'Plot 5412, Extension 12',
};

const row = (id: string, overrides: Partial<Address> = {}): Address => ({
  id,
  user_id: 'u1',
  ...fields,
  is_default: false,
  created_at: '2026-11-01T00:00:00.000Z',
  updated_at: '2026-11-01T00:00:00.000Z',
  ...overrides,
});

const NOW = '2026-11-04T00:00:00.000Z';
const add = (rows: Address[], extra = {}) => addAddress(rows, { id: 'new', userId: 'u1', fields, now: NOW, ...extra });

// covers: AC-1
describe('adding', () => {
  it('keeps the address for its owner', () => {
    const { result } = add([]);
    expect(result).toMatchObject({ ok: true, address: { id: 'new', user_id: 'u1', town: 'Gaborone' } });
  });

  it('refuses an eleventh address', () => {
    const rows = Array.from({ length: MAX_ADDRESSES }, (_, index) => row(`a${index}`));
    expect(add(rows)).toEqual({ rows, result: { ok: false, reason: 'FULL' } });
  });

  it("counts only the buyer's own addresses towards the limit", () => {
    const rows = Array.from({ length: MAX_ADDRESSES }, (_, index) => row(`a${index}`, { user_id: 'u2' }));
    expect(add(rows).result.ok).toBe(true);
  });

  // covers: AC-4
  it('skips a place already in the book when checkout saves in passing', () => {
    const rows = [row('a1', { street: 'PLOT 5412, extension 12 ', recipient_name: 'Someone else' })];
    expect(add(rows, { refuseDuplicates: true }).result).toEqual({ ok: false, reason: 'DUPLICATE' });
  });

  it('allows the same place twice from the address book itself', () => {
    expect(add([row('a1')]).result.ok).toBe(true);
  });
});

// covers: AC-2
describe('the default', () => {
  it('makes the first address the default', () => {
    expect(add([]).result).toMatchObject({ address: { is_default: true } });
  });

  it('leaves the default alone when another address is added', () => {
    const { rows } = add([row('a1', { is_default: true })]);
    expect(rows.filter((entry) => entry.is_default).map((entry) => entry.id)).toEqual(['a1']);
  });

  it('moves when a new address is added as the default', () => {
    const { rows } = add([row('a1', { is_default: true })], { makeDefault: true });
    expect(rows.filter((entry) => entry.is_default).map((entry) => entry.id)).toEqual(['new']);
  });

  it("moves on an edit, and never touches another buyer's default", () => {
    const start = [row('a1', { is_default: true }), row('a2'), row('b1', { user_id: 'u2', is_default: true })];
    const { rows } = updateAddress(start, { id: 'a2', userId: 'u1', fields: {}, makeDefault: true, now: NOW });
    expect(rows.filter((entry) => entry.is_default).map((entry) => entry.id).sort()).toEqual(['a2', 'b1']);
  });

  it('cannot be cleared by an edit, so a book always has one', () => {
    const start = [row('a1', { is_default: true }), row('a2')];
    const { rows } = updateAddress(start, { id: 'a1', userId: 'u1', fields: { label: 'Work' }, makeDefault: false, now: NOW });
    expect(rows.find((entry) => entry.id === 'a1')?.is_default).toBe(true);
  });

  it('goes to the most recently updated address when the default is deleted', () => {
    const start = [
      row('a1', { is_default: true }),
      row('old', { updated_at: '2026-10-01T00:00:00.000Z' }),
      row('recent', { updated_at: '2026-11-02T00:00:00.000Z' }),
    ];
    const { rows } = removeAddress(start, { id: 'a1', userId: 'u1' });
    expect(rows.find((entry) => entry.id === 'recent')?.is_default).toBe(true);
    expect(rows.find((entry) => entry.id === 'old')?.is_default).toBe(false);
  });

  it('leaves an empty book empty', () => {
    expect(removeAddress([row('a1', { is_default: true })], { id: 'a1', userId: 'u1' }).rows).toEqual([]);
  });
});

describe('ownership', () => {
  it("will not edit or delete another buyer's address", () => {
    const start = [row('a1', { user_id: 'u2' })];
    expect(updateAddress(start, { id: 'a1', userId: 'u1', fields: { label: 'Mine' }, now: NOW })).toEqual({
      rows: start,
      result: { ok: false, reason: 'NOT_FOUND' },
    });
    expect(removeAddress(start, { id: 'a1', userId: 'u1' })).toEqual({ rows: start, result: { ok: false } });
  });
});

describe('edits', () => {
  it('stamps the change', () => {
    const { result } = updateAddress([row('a1')], { id: 'a1', userId: 'u1', fields: { town: 'Maun' }, now: NOW });
    expect(result).toMatchObject({ ok: true, address: { town: 'Maun', updated_at: NOW } });
  });
});

describe('inBookOrder', () => {
  it('puts the default first, then the most recently changed', () => {
    const book = inBookOrder([
      row('old', { updated_at: '2026-10-01T00:00:00.000Z' }),
      row('main', { is_default: true, updated_at: '2026-09-01T00:00:00.000Z' }),
      row('recent', { updated_at: '2026-11-02T00:00:00.000Z' }),
    ]);
    expect(book.map((entry) => entry.id)).toEqual(['main', 'recent', 'old']);
  });
});

describe('samePlace', () => {
  it('ignores case and stray spaces, but not the town', () => {
    expect(samePlace(row('a'), { ...row('b'), street: ' plot 5412, EXTENSION 12' })).toBe(true);
    expect(samePlace(row('a'), { ...row('b'), town: 'Maun' })).toBe(false);
  });
});

describe('field rules', () => {
  it('upper cases the country and trims what was typed', () => {
    const parsed = AddressFieldsSchema.parse({ ...fields, country: 'ls', label: '  Mum ' });
    expect(parsed).toMatchObject({ country: 'LS', label: 'Mum' });
  });

  it.each(['12', 'not a phone', '+'])('refuses %s as a phone number', (phone) => {
    expect(AddressFieldsSchema.safeParse({ ...fields, phone }).success).toBe(false);
  });

  it.each(['+266 2231 2345', '71234567', '(267) 71-234-567'])('accepts %s as a phone number', (phone) => {
    expect(AddressFieldsSchema.safeParse({ ...fields, phone }).success).toBe(true);
  });
});
