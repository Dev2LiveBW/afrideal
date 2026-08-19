import { ShieldAlert } from 'lucide-react';

import { EmptyState, PageHeader } from '@/components/brand/Panel';
import { auth } from '@/lib/auth';
import { readAll } from '@/lib/db';
import { getSupplierWorkspace } from '@/lib/queries';
import { photoUrl } from '@/components/storefront/Swatch';
import { OrdersClient } from './OrdersClient';

export const dynamic = 'force-dynamic';

/** Actionable statuses float to the top; terminal ones sink to the bottom. */
const PRIORITY: Record<string, number> = {
  AWAITING_CONFIRMATION: 0,
  CONFIRMED: 1,
  PREPARING: 2,
  READY_FOR_COLLECTION: 3,
  COLLECTED: 4,
  DELIVERED: 5,
  CANCELLED: 6,
};

export default async function SupplierOrdersPage() {
  const session = await auth();
  const supplierId = session?.user.supplier_id ?? null;
  const workspace = supplierId ? await getSupplierWorkspace(supplierId) : null;

  if (!workspace?.supplier) {
    return (
      <EmptyState
        icon={<ShieldAlert size={22} strokeWidth={1.5} />}
        title="No supplier profile linked"
        description="This account isn't linked to a supplier record, so there are no orders to show."
      />
    );
  }

  /*
   * A plain productId → url map rather than the image rows themselves: this
   * crosses into a client component, and the rows carry fields the browser has
   * no use for.
   */
  const images = await readAll('product-images');
  const photos: Record<string, string> = {};

  for (const image of images) {
    if (image.sort_order !== 0) continue;
    const url = photoUrl(image);
    if (url) photos[image.product_id] = url;
  }

  const legs = [...workspace.legs].sort((a, b) => {
    const priorityDelta = (PRIORITY[a.status] ?? 9) - (PRIORITY[b.status] ?? 9);
    if (priorityDelta !== 0) return priorityDelta;
    return b.created_at.localeCompare(a.created_at);
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Fulfilment"
        title="Your orders"
        description="Confirm, prepare and hand off to collection — a runner takes it from there."
      />

      <OrdersClient legs={legs} supplierName={workspace.supplier.name} photos={photos} />
    </div>
  );
}
