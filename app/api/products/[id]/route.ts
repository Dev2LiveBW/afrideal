import { fail, handled, ok } from '@/lib/api';
import { getProductDetail } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export const GET = handled(async (_request: Request, { params }: { params: { id: string } }) => {
  const detail = await getProductDetail(params.id);
  if (!detail) return fail('Product not found.', 404);
  return ok(detail);
});
