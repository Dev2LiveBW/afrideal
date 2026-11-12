import { beforeEach, describe, expect, it, vi } from 'vitest';

import { openJobForLeg } from '@/lib/shipments';
import type { Order, Shipment, Supplier, SupplierOrder } from '@/types';

/*
 * The runner's job for one supplier's part of an order (spec 0011, AC-9). The
 * runner meets the person receiving the parcel, who may not be the buyer, so the
 * job carries that person's name, phone and instructions. A locker has no person.
 */

const store: Record<string, unknown[]> = {};

vi.mock('@/lib/db', () => ({
  readAll: async (collection: string) => structuredClone(store[collection] ?? []),
  findById: async (collection: string, id: string) =>
    structuredClone((store[collection] as { id: string }[] | undefined)?.find((row) => row.id === id) ?? null),
  nextId: async () => 'sh1',
  insert: async (collection: string, row: unknown) => {
    store[collection] = [...(store[collection] ?? []), row];
    return row;
  },
}));

vi.mock('@/lib/notifications', async (original) => ({
  ...(await original<typeof import('@/lib/notifications')>()),
  audit: async () => undefined,
  notifyMany: async () => undefined,
}));

const actor = { id: 'u-supplier', name: 'Naledi' };
const leg = { id: 'sup1', order_id: 'o1', supplier_id: 's1', status: 'READY_FOR_COLLECTION' } as SupplierOrder;

const order = (overrides: Partial<Order> = {}) =>
  ({
    id: 'o1',
    reference: 'AFD-1',
    customer_name: 'Kefilwe Dithebe',
    delivery_fee: 45,
    delivery_method: 'DOORSTEP',
    delivery_address: 'Kingsway 100',
    delivery_city: 'Maseru',
    delivery_country: 'LS',
    recipient_name: 'Mma Dithebe',
    delivery_phone: '+266 2231 2345',
    delivery_instructions: 'Blue gate',
    ...overrides,
  }) as Order;

beforeEach(() => {
  for (const key of Object.keys(store)) delete store[key];
  store.suppliers = [{ id: 's1', name: 'Naledi Beauty Supplies', city: 'Gaborone', country: 'BW' } as Supplier];
  store['supplier-orders'] = [leg];
  store.runners = [];
});

describe('openJobForLeg · covers AC-9', () => {
  it('gives the runner the recipient, their phone and the instructions', async () => {
    store.orders = [order()];

    const job = await openJobForLeg(leg, actor);

    expect(job).toMatchObject({
      dropoff_name: 'Mma Dithebe',
      dropoff_phone: '+266 2231 2345',
      delivery_instructions: 'Blue gate',
      dropoff_address: 'Kingsway 100, Maseru',
      dropoff_country: 'LS',
    });
  });

  it('falls back to the buyer when the order names no recipient', async () => {
    store.orders = [order({ recipient_name: undefined, delivery_phone: undefined, delivery_instructions: undefined })];

    const job = await openJobForLeg(leg, actor);

    expect(job).toMatchObject({ dropoff_name: 'Kefilwe Dithebe', dropoff_phone: null, delivery_instructions: null });
  });

  it('names the locker for a collection point order', async () => {
    store.orders = [
      order({
        delivery_method: 'COLLECTION_POINT',
        collection_point: 'Maseru Pioneer Mall Locker',
        delivery_address: 'Maseru Pioneer Mall Locker',
      }),
    ];

    const job = await openJobForLeg(leg, actor);

    expect(job?.dropoff_name).toBe('Maseru Pioneer Mall Locker');
  });

  it('opens one job per part, however often it is asked', async () => {
    store.orders = [order()];
    const first = await openJobForLeg(leg, actor);

    const second = await openJobForLeg(leg, actor);

    expect(second?.id).toBe(first?.id);
    expect(store.shipments as Shipment[]).toHaveLength(1);
  });
});
