import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Runner, Shipment } from '@/types';

import { getRunnerWorkspace } from './queries';

// The store is the boundary: each test hands `readAll` its own collections.
const store: Record<string, unknown[]> = {};
vi.mock('@/lib/db', () => ({ readAll: async (collection: string) => store[collection] ?? [] }));

const runner = (id: string, country: string, towns: string[], online = true): Runner =>
  ({ id, name: id, country, city: towns[0] ?? '', towns, online }) as Runner;

const job = (id: string, pickup: { country?: string; town?: string }, overrides: Partial<Shipment> = {}): Shipment =>
  ({
    id,
    order_id: `o-${id}`,
    supplier_order_id: `so-${id}`,
    runner_id: null,
    status: 'UNASSIGNED',
    pickup_name: 'Supplier',
    pickup_country: pickup.country,
    pickup_town: pickup.town,
    created_at: '2026-11-01T08:00:00.000Z',
    delivered_at: null,
    ...overrides,
  }) as Shipment;

const ids = (rows: { id: string }[]) => rows.map((row) => row.id).sort();

describe('getRunnerWorkspace: open delivery jobs (spec 0009, AC-6)', () => {
  beforeEach(() => {
    store.orders = [];
    store.suppliers = [];
    store.runners = [
      runner('gab', 'BW', ['Gaborone', 'Lobatse']),
      runner('mas', 'LS', ['Maseru']),
      runner('off', 'LS', ['Maseru', 'Teyateyaneng'], false),
    ];
    store.shipments = [
      job('gaborone', { country: 'BW', town: 'Gaborone' }),
      job('maseru', { country: 'LS', town: 'Maseru' }),
      job('teyateyaneng', { country: 'LS', town: 'Teyateyaneng' }),
      job('johannesburg', { country: 'ZA', town: 'Johannesburg' }),
      job('unknown', {}),
      job('taken', { country: 'BW', town: 'Gaborone' }, { runner_id: 'gab', status: 'ASSIGNED' }),
    ];
  });

  // covers: AC-6
  it('offers a runner the jobs in towns they serve, and not jobs in another runner’s town', async () => {
    const { available } = await getRunnerWorkspace('gab');

    expect(ids(available)).toContain('gaborone');
    expect(ids(available)).not.toContain('maseru');
  });

  // covers: AC-6
  it('offers a Maseru job to the Maseru runner', async () => {
    const { available } = await getRunnerWorkspace('mas');

    expect(ids(available)).toContain('maseru');
    expect(ids(available)).not.toContain('gaborone');
  });

  it('counts the viewing runner as online, so a runner who is offline still sees their own towns’ jobs', async () => {
    const { available } = await getRunnerWorkspace('off');

    expect(ids(available)).toEqual(expect.arrayContaining(['maseru', 'teyateyaneng']));
    expect(ids(available)).not.toContain('gaborone');
  });

  it('offers a job to every online runner while nobody serving its town is online', async () => {
    // Only the offline runner serves Teyateyaneng, so the job widens to everyone online.
    const gab = await getRunnerWorkspace('gab');
    const mas = await getRunnerWorkspace('mas');

    expect(ids(gab.available)).toContain('teyateyaneng');
    expect(ids(mas.available)).toContain('teyateyaneng');
  });

  it('offers a job in a town nobody serves to every online runner', async () => {
    const { available } = await getRunnerWorkspace('gab');

    expect(ids(available)).toContain('johannesburg');
  });

  it('offers a job with no known pickup place to every online runner', async () => {
    const { available } = await getRunnerWorkspace('mas');

    expect(ids(available)).toContain('unknown');
  });

  it('keeps a job another runner has taken out of the pool', async () => {
    const { available, active } = await getRunnerWorkspace('gab');

    expect(ids(available)).not.toContain('taken');
    expect(ids(active)).toEqual(['taken']);
  });

  it('offers nothing to a runner id the store does not know', async () => {
    const { runner: found, available } = await getRunnerWorkspace('ghost');

    expect(found).toBeNull();
    expect(ids(available)).not.toContain('gaborone');
    expect(ids(available)).not.toContain('maseru');
  });
});
