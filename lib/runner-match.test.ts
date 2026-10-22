import { describe, expect, it } from 'vitest';

import type { Runner } from '@/types';

import { runnersForJob, servesPlace } from './runner-match';

const runner = (id: string, country: string, towns: string[], online = true): Runner => ({
  id,
  user_id: `u-${id}`,
  name: id,
  initials: id.slice(0, 2).toUpperCase(),
  phone: '',
  vehicle: '',
  plate: '',
  city: towns[0] ?? '',
  country,
  towns,
  online,
  rating: 5,
  deliveries_completed: 0,
  earnings_mtd: 0,
  earnings_total: 0,
});

const GABORONE = runner('gab', 'BW', ['Gaborone', 'Lobatse']);
const FRANCISTOWN = runner('fra', 'BW', ['Francistown']);
const MASERU = runner('mas', 'LS', ['Maseru', 'Teyateyaneng']);
const OFFLINE_MASERU = runner('off', 'LS', ['Maseru'], false);

describe('servesPlace', () => {
  it('needs the same country and one of the runner’s towns', () => {
    expect(servesPlace(MASERU, 'LS', 'maseru')).toBe(true);
    expect(servesPlace(MASERU, 'BW', 'Maseru')).toBe(false);
    expect(servesPlace(GABORONE, 'BW', 'Francistown')).toBe(false);
  });
});

describe('runnersForJob', () => {
  const all = [GABORONE, FRANCISTOWN, MASERU, OFFLINE_MASERU];

  it('alerts only the online runners serving the pickup town', () => {
    expect(runnersForJob(all, { country: 'LS', town: 'Maseru' }).map((r) => r.id)).toEqual(['mas']);
    expect(runnersForJob(all, { country: 'BW', town: 'Lobatse' }).map((r) => r.id)).toEqual(['gab']);
  });

  it('falls back to every online runner when nobody serves the town, so no job goes unseen', () => {
    expect(runnersForJob(all, { country: 'ZA', town: 'Johannesburg' }).map((r) => r.id)).toEqual([
      'gab',
      'fra',
      'mas',
    ]);
  });

  it('alerts every online runner for a job with no known pickup place', () => {
    expect(runnersForJob(all, { country: null, town: null })).toHaveLength(3);
  });
});
