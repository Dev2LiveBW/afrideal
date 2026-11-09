import { guard, handled, ok } from '@/lib/api';
import { mutate } from '@/lib/db';
import { removeItem } from '@/lib/saved-items';

export const dynamic = 'force-dynamic';

/**
 * Remove a saved item. Keyed by product and scoped to the session, so a buyer can
 * only ever touch their own list, and removing what is already gone is still ok.
 */
export const DELETE = handled(async (_request: Request, { params }: { params: { productId: string } }) => {
  const { actor, response } = await guard(['CUSTOMER']);
  if (response) return response;

  await mutate('saved-items', (rows) => removeItem(rows, actor.id, params.productId));
  return ok({ ok: true });
});
