import { describe, expect, it } from 'vitest';

import { BASE_CURRENCY, fromPula, moneyLong, moneyTag } from './currency.mjs';

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
