import { fail, handled, ok } from '@/lib/api';
import { auth } from '@/lib/auth';
import { getProductDetail, toPublicOffers } from '@/lib/queries';
import { ADMIN_ROLES } from '@/lib/roles';

export const dynamic = 'force-dynamic';

/**
 * GET /api/products/:id - one product and who can supply it.
 *
 * The team gets the ranked offers with their costs, which is what routing
 * decisions are made on. Everyone else gets what the product page shows: an
 * active product and its suppliers with the confidential parts removed (§5).
 */
export const GET = handled(async (_request: Request, { params }: { params: { id: string } }) => {
  const detail = await getProductDetail(params.id);
  if (!detail) return fail('Product not found.', 404);

  const session = await auth();
  if (session?.user && ADMIN_ROLES.includes(session.user.role)) return ok(detail);

  if (detail.product.status !== 'ACTIVE') return fail('Product not found.', 404);

  return ok({
    product: detail.product,
    categoryName: detail.categoryName,
    offers: toPublicOffers(detail.selection.all),
  });
});
