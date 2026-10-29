import { describe, expect, it } from 'vitest';

import type { Country } from '@/types';

import { DEFAULT_DELIVER_TO, decodeDeliverTo, encodeDeliverTo } from './deliver-to';

const country = (code: string, towns: string[]) =>
  ({ id: code, code, name: code, towns }) as unknown as Country;

const COUNTRIES = [country('BW', ['Gaborone', 'Francistown']), country('LS', ['Maseru', "Mohale's Hoek"])];

describe('the Deliver to cookie', () => {
  it('round-trips a town, spaces and apostrophes included', () => {
    const choice = { country: 'LS', city: "Mohale's Hoek" };
    expect(decodeDeliverTo(encodeDeliverTo(choice), COUNTRIES)).toEqual(choice);
  });

  it('accepts a value the framework has already decoded', () => {
    expect(decodeDeliverTo("LS:Mohale's Hoek", COUNTRIES)).toEqual({ country: 'LS', city: "Mohale's Hoek" });
  });

  it('falls back to the default for anything it cannot trust', () => {
    for (const value of [undefined, '', 'Maseru', 'ZZ:Maseru', 'LS:Gaborone', 'LS:%E0%A4%A']) {
      expect(decodeDeliverTo(value, COUNTRIES)).toEqual(DEFAULT_DELIVER_TO);
    }
  });
});
