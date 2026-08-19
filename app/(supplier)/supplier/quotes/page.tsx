import { ShieldAlert } from 'lucide-react';

import { EmptyState, PageHeader } from '@/components/brand/Panel';
import { auth } from '@/lib/auth';
import { getSupplierWorkspace } from '@/lib/queries';
import { getQuoteInbox } from '../../_lib/quotes';
import { QuotesClient } from './QuotesClient';

export const dynamic = 'force-dynamic';

export default async function SupplierQuotesPage() {
  const session = await auth();
  const supplierId = session?.user.supplier_id ?? null;
  const workspace = supplierId ? await getSupplierWorkspace(supplierId) : null;

  if (!workspace?.supplier) {
    return (
      <EmptyState
        icon={<ShieldAlert size={22} strokeWidth={1.5} />}
        title="No supplier profile linked"
        description="This account isn't linked to a supplier record, so there's no quote inbox to show."
      />
    );
  }

  const rows = getQuoteInbox(workspace);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Requests"
        title="Quote inbox"
        description="Respond with your price, availability and delivery timeline before the request expires."
      />

      <QuotesClient rows={rows} />
    </div>
  );
}
