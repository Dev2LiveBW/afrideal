import { describe, expect, it } from 'vitest';

import type { Courier } from '@/types';

import { courierFee, couriersForLane, routeFor } from './couriers.mjs';

/** Gorosa as the product owner described it (spec 0008, 2026-10-21). */
const GOROSA: Courier = {
  id: 'cr001',
  name: 'Gorosa Express Logistics',
  role: 'CROSS_BORDER_CLEARANCE',
  sort_order: 1,
  active: true,
  trips_per_week: 2,
  insured: true,
  phone: '+27 73 932 7292',
  depot: { country: 'ZA', city: 'Johannesburg', address: '2A Kikuyu Road, Sunninghill' },
  consignee_format: '{first} {last} Gorosa',
  payment_options: ['AT_CHECKOUT', 'ON_ARRIVAL'],
  routes: [
    {
      from: { country: 'ZA' },
      to: { country: 'BW', city: 'Gaborone' },
      fee: { threshold: 2000, flat: 250, pct: 0.16, launch_flat: 200, launch_until: null },
      payable: { flat: 130, pct: null },
    },
    {
      from: { country: 'ZA' },
      to: { country: 'BW', city: 'Francistown' },
      fee: { threshold: 2000, flat: 300, pct: 0.21 },
    },
  ],
};

const lane = (toCountry: string, toCity: string, fromCountry = 'ZA') => ({
  fromCountry,
  fromCity: 'Johannesburg',
  toCountry,
  toCity,
});

describe('couriersForLane', () => {
  it('offers Gorosa on its routes, case-insensitively', () => {
    expect(couriersForLane([GOROSA], lane('BW', 'Gaborone'))).toHaveLength(1);
    expect(couriersForLane([GOROSA], lane('bw', ' francistown '))[0]?.route.fee.flat).toBe(300);
  });

  it('offers nobody where no route runs: Maseru, Maun, or a domestic lane', () => {
    expect(couriersForLane([GOROSA], lane('LS', 'Maseru'))).toEqual([]);
    expect(couriersForLane([GOROSA], lane('BW', 'Maun'))).toEqual([]);
    expect(couriersForLane([GOROSA], lane('BW', 'Gaborone', 'BW'))).toEqual([]);
  });

  it('skips an inactive courier', () => {
    expect(routeFor({ ...GOROSA, active: false }, lane('BW', 'Gaborone'))).toBeNull();
  });
});

describe('courierFee', () => {
  const [gaborone, francistown] = GOROSA.routes;

  it('charges the launch price at or below P2,000 while it lasts, and records the subsidy', () => {
    expect(courierFee(gaborone!, 1800)).toEqual({ fee: 200, basis: 'FLAT', subsidy: 50 });
    expect(courierFee(gaborone!, 2000)).toEqual({ fee: 200, basis: 'FLAT', subsidy: 50 });
  });

  it('charges the full flat fee once the launch price has ended', () => {
    const ended = { ...gaborone!, fee: { ...gaborone!.fee, launch_until: '2026-01-01T00:00:00Z' } };
    expect(courierFee(ended, 1800, new Date('2026-10-22'))).toEqual({ fee: 250, basis: 'FLAT', subsidy: 0 });
  });

  it('charges a share of the goods above P2,000: 16% to Gaborone, 21% to Francistown', () => {
    expect(courierFee(gaborone!, 2500)).toEqual({ fee: 400, basis: 'PCT', subsidy: 0 });
    expect(courierFee(francistown!, 2500)).toEqual({ fee: 525, basis: 'PCT', subsidy: 0 });
    expect(courierFee(francistown!, 1500)).toEqual({ fee: 300, basis: 'FLAT', subsidy: 0 });
  });

  it('rounds a percentage fee up to the pula', () => {
    expect(courierFee(gaborone!, 2001)).toEqual({ fee: 321, basis: 'PCT', subsidy: 0 });
  });
});
