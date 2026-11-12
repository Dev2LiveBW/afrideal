import { z } from 'zod';

import { fail, guard, handled, ok } from '@/lib/api';
import { throttle } from '@/lib/rate-limit';
import { findById, mutate, nextIds, readAll } from '@/lib/db';
import { MAX_SAVED_ITEMS, saveItem, savedNewestFirst, type SaveResult } from '@/lib/saved-items';

export const dynamic = 'force-dynamic';

const SaveSchema = z.object({ product_id: z.string().trim().min(1) });

/** The signed in buyer's saved items: the ids for the hearts, the products for a list. */
export const GET = handled(async () => {
  const { actor, response } = await guard(['CUSTOMER']);
  if (response) return response;

  const [rows, products] = await Promise.all([readAll('saved-items'), readAll('products')]);
  const productIds = savedNewestFirst(rows.filter((row) => row.user_id === actor.id)).map((row) => row.product_id);

  return ok({
    product_ids: productIds,
    products: products.filter((product) => productIds.includes(product.id)),
  });
});

/** Spec 0011, AC-14 and AC-16: save an item, up to the limit. Saving twice is one save. */
export const POST = handled(async (request: Request) => {
  const { actor, response } = await guard(['CUSTOMER']);
  if (response) return response;

  const throttled = throttle('accountWrite', actor.id);
  if (throttled) return throttled;

  const parsed = SaveSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail('Choose a product to save.', 422);

  const product = await findById('products', parsed.data.product_id);
  if (!product || product.status !== 'ACTIVE') return fail('That product is no longer sold.', 404);

  const [id] = await nextIds('saved-items', 'sav', 1);
  const now = new Date().toISOString();
  const result = await mutate<'saved-items', SaveResult>('saved-items', (rows) =>
    saveItem(rows, { id, userId: actor.id, productId: product.id, now }),
  );

  if (!result.ok) return fail(`You can save up to ${MAX_SAVED_ITEMS} items. Remove one to add another.`, 409);
  return ok(result.item, { status: 201 });
});
