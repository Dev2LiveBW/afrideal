import { photoUrl } from '@/components/storefront/Swatch';
import { fail, guard, handled, ok } from '@/lib/api';
import { findById, readAll } from '@/lib/db';
import { reorderLines } from '@/lib/reorder';

export const dynamic = 'force-dynamic';

/**
 * Spec 0011, AC-11 and AC-12: what a delivered order would cost today.
 *
 * A read, because the cart is in the browser: the client adds the lines this
 * returns. Only the order's own buyer may ask, staff included in the refusal,
 * since a reorder prices the lines for the account that makes it.
 */
export const GET = handled(async (_request: Request, { params }: { params: { id: string } }) => {
  const { actor, response } = await guard();
  if (response) return response;

  const order = await findById('orders', params.id);
  if (!order) return fail('That order does not exist.', 404);
  if (order.customer_id !== actor.id) return fail('That order is not yours to reorder.', 403);
  if (order.status !== 'DELIVERED') return fail('Only a delivered order can be reordered.', 409);

  const [allItems, products, offers, suppliers, bands, images] = await Promise.all([
    readAll('order-items'),
    readAll('products'),
    readAll('supplier-offers'),
    readAll('suppliers'),
    readAll('customer-prices'),
    readAll('product-images'),
  ]);

  return ok(
    reorderLines({
      items: allItems.filter((item) => item.order_id === order.id),
      products,
      offers,
      suppliers,
      bands,
      customerType: actor.customerType,
      imageUrlOf: (productId) =>
        photoUrl(images.find((image) => image.product_id === productId && image.sort_order === 0)),
    }),
  );
});
