import { describe, expect, it } from 'vitest';

import { DEFAULT_DELIVERY_COUNTRY, isCrossBorder, laneFor } from './lanes.mjs';

/** Spec 0009: a line is cross-border when the goods' country differs from the delivery country. */
describe('laneFor', () => {
  it('is domestic when goods and buyer share a country, Botswana or not', () => {
    expect(laneFor('BW', 'BW')).toEqual({ from: 'BW', to: 'BW', crossBorder: false });
    expect(laneFor('LS', 'LS').crossBorder).toBe(false);
    expect(laneFor('ZA', 'ZA').crossBorder).toBe(false);
  });

  it('is cross-border on any lane between two countries, not only into Botswana', () => {
    expect(laneFor('ZA', 'BW').crossBorder).toBe(true);
    expect(laneFor('ZA', 'LS').crossBorder).toBe(true);
    expect(laneFor('BW', 'LS').crossBorder).toBe(true);
    expect(laneFor('BW', 'ZA').crossBorder).toBe(true);
  });

  it('compares codes case-insensitively', () => {
    expect(laneFor('ls', 'LS').crossBorder).toBe(false);
    expect(laneFor(' za ', 'bw')).toEqual({ from: 'ZA', to: 'BW', crossBorder: true });
  });

  it('treats unknown goods as domestic rather than guessing a border', () => {
    expect(laneFor(undefined, 'LS')).toEqual({ from: null, to: 'LS', crossBorder: false });
    expect(isCrossBorder('', 'BW')).toBe(false);
  });

  it('delivers to the default country only when none is given', () => {
    expect(laneFor('ZA').to).toBe(DEFAULT_DELIVERY_COUNTRY);
    expect(laneFor('ZA', null).to).toBe(DEFAULT_DELIVERY_COUNTRY);
    expect(laneFor('ZA', 'LS').to).toBe('LS');
  });
});
