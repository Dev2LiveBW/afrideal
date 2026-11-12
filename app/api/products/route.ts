import { handled, ok } from '@/lib/api';
import { auth } from '@/lib/auth';
import { readAll } from '@/lib/db';
import { ADMIN_ROLES } from '@/lib/roles';

export const dynamic = 'force-dynamic';

/**
 * GET /api/products - the catalogue.
 *
 * Public, like the storefront it mirrors, so it lists only what the storefront
 * sells. Drafts, products awaiting approval and archived ones are the team's.
 */
export const GET = handled(async () => {
  const session = await auth();
  const products = await readAll('products');

  if (session?.user && ADMIN_ROLES.includes(session.user.role)) return ok(products);
  return ok(products.filter((product) => product.status === 'ACTIVE'));
});
