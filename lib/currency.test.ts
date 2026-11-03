import { describe, expect, it } from 'vitest';

import { BASE_CURRENCY, fromPula, moneyLong, moneyTag, pulaPerUnit, toPula } from './currency.mjs';

/** Spec 0009, answer 1: pula for Botswana buyers, rand for South Africa, Lesotho and Eswatini. */
describe('fromPula', () => {
  it('leaves pula alone', () => {
    expect(BASE_CURRENCY).toBe('BWP');
    expect(fromPula(420, 'BWP')).toBe(420);
    expect(fromPula(420, null)).toBe(420);
  });

  it('converts to rand at the temporary 1:1 rate (spec 0007)', () => {
    expect(fromPula(420, 'ZAR')).toBe(420);
    expect(fromPula(1312.5, 'ZAR')).toBe(1312.5);
  });
});

describe('formatting', () => {
  it('labels the long form with the currency code', () => {
    expect(moneyLong(420, 'BWP')).toBe('BWP 420.00');
    expect(moneyLong(420, 'ZAR')).toBe('ZAR 420.00');
    expect(moneyLong(-45, 'ZAR')).toBe('-ZAR 45.00');
  });

  it('tags the shelf price with the currency symbol', () => {
    expect(moneyTag(420, 'BWP')).toBe('P420');
    expect(moneyTag(1299.5, 'ZAR')).toBe('R1,299.50');
  });
});

/** Review 2026-11-03: the ledgers book a rand order in pula at the rate it was charged at. */
describe('toPula', () => {
  it('books a rand amount in pula at the order’s own rate, not today’s', () => {
    expect(toPula(182, 0.75)).toBe(136.5);
    expect(toPula(100, 1.37)).toBe(137);
  });

  it('rounds to the cent', () => {
    expect(toPula(10.01, 0.333)).toBe(3.33);
  });

  it('reads an order with no recorded rate as 1:1, which every earlier order was', () => {
    expect(toPula(420, undefined)).toBe(420);
    expect(toPula(420, null)).toBe(420);
  });

  it('is undone by fromPula at the same rate', () => {
    expect(toPula(fromPula(420, 'ZAR'), pulaPerUnit('ZAR'))).toBe(420);
  });
});

describe('pulaPerUnit', () => {
  it('is 1 for pula and for a missing currency', () => {
    expect(pulaPerUnit('BWP')).toBe(1);
    expect(pulaPerUnit(null)).toBe(1);
  });
});
