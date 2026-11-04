import { describe, expect, it } from 'vitest';

import { orderMapLink } from '@/lib/map-link';

const queryOf = (url: string) => new URL(url).searchParams.get('query');

describe('orderMapLink', () => {
  it('stops at the town and country for a doorstep order', () => {
    const order = {
      delivery_method: 'DOORSTEP' as const,
      collection_point: null,
      delivery_city: 'Maseru',
      delivery_address: 'Kingsway 100, the blue gate',
    };
    const url = orderMapLink(order, 'Lesotho');
    expect(queryOf(url)).toBe('Maseru, Lesotho');
    expect(url).not.toContain('Kingsway');
    expect(url).not.toContain('gate');
  });

  it('treats an old order with no method as a doorstep order', () => {
    expect(queryOf(orderMapLink({ collection_point: 'Maun Airport Locker', delivery_city: 'Gaborone' }, 'Botswana'))).toBe(
      'Gaborone, Botswana',
    );
  });

  it('gives a locker its name and address', () => {
    const url = orderMapLink(
      { delivery_method: 'COLLECTION_POINT', collection_point: 'Maseru Pioneer Mall Locker', delivery_city: 'Maseru' },
      'Lesotho',
    );
    expect(queryOf(url)).toBe('Maseru Pioneer Mall Locker, Pioneer Mall, Pioneer Road, Maseru, Lesotho');
  });

  it('falls back to the town for a locker no longer on the list', () => {
    const url = orderMapLink(
      { delivery_method: 'COLLECTION_POINT', collection_point: 'A closed locker', delivery_city: 'Maun' },
      'Botswana',
    );
    expect(queryOf(url)).toBe('Maun, Botswana');
  });

  it('encodes what it is given', () => {
    const url = orderMapLink({ delivery_method: 'DOORSTEP', delivery_city: 'Ha Thetsane & Co' }, 'Lesotho');
    expect(url).toContain('Ha%20Thetsane%20%26%20Co');
    expect(queryOf(url)).toBe('Ha Thetsane & Co, Lesotho');
  });
});
