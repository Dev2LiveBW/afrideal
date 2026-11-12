import { describe, expect, it } from 'vitest';

import type { Runner } from '@/types';

import { offeredTo, runnersForJob, servesPlace } from './runner-match';

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

describe('servesPlace on a runner from before spec 0009', () => {
  it('reads a runner with no country as Botswana, where every earlier runner worked', () => {
    const legacy = { ...GABORONE, country: undefined } as unknown as Runner;

    expect(servesPlace(legacy, 'BW', 'Gaborone')).toBe(true);
    expect(servesPlace(legacy, 'LS', 'Gaborone')).toBe(false);
  });

  it('serves its own city when it lists no towns', () => {
    const legacy = { ...FRANCISTOWN, towns: undefined } as unknown as Runner;

    expect(servesPlace(legacy, 'BW', 'Francistown')).toBe(true);
  });
});

// covers: AC-6, and review 2026-11-03 (a request in a town nobody serves was stranded)
describe('offeredTo', () => {
  const all = [GABORONE, FRANCISTOWN, MASERU, OFFLINE_MASERU];

  it('offers work in a town to the online runners who serve it, and not to others', () => {
    const place = { country: 'BW', town: 'Francistown' };

    expect(offeredTo(all, 'fra', place)).toBe(true);
    expect(offeredTo(all, 'gab', place)).toBe(false);
  });

  it('counts the asking runner as online, so an offline runner still sees their own towns', () => {
    expect(offeredTo(all, 'off', { country: 'LS', town: 'Maseru' })).toBe(true);
  });

  it('widens to every online runner while nobody serving the town is online', () => {
    const onlyOfflineServes = [GABORONE, OFFLINE_MASERU];

    expect(offeredTo(onlyOfflineServes, 'gab', { country: 'LS', town: 'Maseru' })).toBe(true);
  });

  it('widens to every online runner for a town nobody lists', () => {
    expect(offeredTo(all, 'gab', { country: 'BW', town: 'Mogoditshane' })).toBe(true);
  });

  it('offers nothing to a runner id it does not know', () => {
    expect(offeredTo(all, 'ghost', { country: 'BW', town: 'Gaborone' })).toBe(false);
  });
});
