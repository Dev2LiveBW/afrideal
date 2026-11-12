import { guard, handled, ok } from '@/lib/api';
import { readAll } from '@/lib/db';
import { ADMIN_ROLES } from '@/lib/roles';

export const dynamic = 'force-dynamic';

/**
 * GET /api/supplier-offers - what suppliers charge AfriDeal.
 *
 * A supplier's cost is confidential (§5): the team reads every offer, a supplier
 * reads their own, and nobody else reads any.
 */
export const GET = handled(async () => {
  const { actor, response } = await guard([...ADMIN_ROLES, 'SUPPLIER_OWNER']);
  if (response) return response;

  const offers = await readAll('supplier-offers');
  if (actor.role === 'SUPPLIER_OWNER') {
    return ok(offers.filter((offer) => offer.supplier_id === actor.supplierId));
  }
  return ok(offers);
});
