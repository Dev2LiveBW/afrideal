import type { Metadata } from 'next';

import { auth } from '@/lib/auth';
import { readAll } from '@/lib/db';

import { CartClient } from './CartClient';

export const metadata: Metadata = { title: 'Cart' };
export const dynamic = 'force-dynamic';

/**
 * Server shell over the client cart.
 *
 * The cart itself has to stay a client component — it reads a basket persisted
 * to localStorage. But the price ladder lives in `data/`, and the whole point
 * of this storefront is telling a buyer how close they are to the next rung
 * while the quantity is still editable. So the bands are read here and handed
 * down, rather than fetched from the browser after paint.
 *
 * Customer type comes from the session, never the client: a visitor who could
 * set their own type in localStorage could quote themselves wholesale.
 */
export default async function CartPage() {
  const [bands, products, session] = await Promise.all([
    readAll('customer-prices'),
    readAll('products'),
    auth(),
  ]);

  return (
    <CartClient
      bands={bands}
      products={products}
      customerType={session?.user?.customer_type ?? 'GUEST'}
    />
  );
}
