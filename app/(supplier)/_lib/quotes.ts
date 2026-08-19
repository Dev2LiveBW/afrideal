import { daysUntil, slaTone } from '@/lib/format';
import type { getSupplierWorkspace } from '@/lib/queries';

/**
 * The supplier quote inbox.
 *
 * There is no `quotes` collection in /data. A quote request in this MVP is
 * modelled as a supplier order sitting in AWAITING_CONFIRMATION — responding
 * to one and confirming it are the same action. Two illustrative direct-RFQ
 * rows are layered on top, built from products this supplier already lists,
 * so the inbox reads like a real one. Those rows are flagged `kind: 'RFQ'`
 * and carry no `supplierOrderId`, so nothing about "sending a quote" on them
 * can write to a real record — full RFQ capture is Phase 2.
 */

type Workspace = Awaited<ReturnType<typeof getSupplierWorkspace>>;

export interface QuoteRow {
  id: string;
  kind: 'ORDER' | 'RFQ';
  productName: string;
  variantLabel: string;
  emoji: string;
  qty: number;
  orderRef: string | null;
  customerCity: string | null;
  requestedAt: string;
  expiresAt: string;
  supplierOrderId: string | null;
  referenceCost: number;
  suggestedPrice: number;
  stockHint: number | null;
  leadTimeHint: number | null;
}

/** Business rule for this MVP: a supplier has 48 hours to respond to a request. */
const RESPONSE_WINDOW_HOURS = 48;

function expiryFor(requestedAt: string): string {
  return new Date(new Date(requestedAt).getTime() + RESPONSE_WINDOW_HOURS * 3_600_000).toISOString();
}

export function getQuoteInbox(workspace: Workspace): QuoteRow[] {
  const real: QuoteRow[] = workspace.legs
    .filter((leg) => leg.status === 'AWAITING_CONFIRMATION')
    .map((leg) => {
      const first = leg.items[0] ?? null;
      const qty = leg.items.reduce((sum, item) => sum + item.qty, 0);
      const offer = workspace.offers.find((candidate) => candidate.product_id === first?.product_id) ?? null;

      return {
        id: leg.id,
        kind: 'ORDER' as const,
        productName:
          leg.items.length > 1
            ? `${first?.product_name ?? 'Order'} +${leg.items.length - 1} more`
            : (first?.product_name ?? 'Order'),
        variantLabel: first?.variant_label ?? '',
        emoji: first?.emoji ?? '📦',
        qty,
        orderRef: leg.order?.reference ?? null,
        customerCity: leg.order?.delivery_city ?? null,
        requestedAt: leg.created_at,
        expiresAt: expiryFor(leg.created_at),
        supplierOrderId: leg.id,
        referenceCost: first?.supplier_cost ?? 0,
        suggestedPrice: first?.unit_price ?? 0,
        stockHint: offer?.stock ?? null,
        leadTimeHint: offer?.fulfilment_days ?? null,
      };
    });

  // Two illustrative direct RFQs so the inbox isn't empty the moment a
  // supplier has no order awaiting confirmation. Built from live offers so
  // the reference numbers are at least internally consistent.
  const synthetic: QuoteRow[] = workspace.offers.slice(0, 2).map((offer, index) => {
    const product = workspace.products.find((candidate) => candidate.id === offer.product_id) ?? null;
    const requestedAt = new Date(Date.now() - (index + 1) * 5 * 3_600_000).toISOString();
    const bulkQty = 20 * (index + 1);

    return {
      id: `rfq-${offer.id}`,
      kind: 'RFQ' as const,
      productName: product?.name ?? 'Bulk enquiry',
      variantLabel: `Direct enquiry · ${bulkQty} units`,
      emoji: product?.emoji ?? '📦',
      qty: bulkQty,
      orderRef: null,
      customerCity: index === 0 ? 'Gaborone' : 'Francistown',
      requestedAt,
      expiresAt: expiryFor(requestedAt),
      supplierOrderId: null,
      referenceCost: offer.supplier_cost,
      suggestedPrice: product?.price ?? offer.supplier_cost,
      stockHint: offer.stock,
      leadTimeHint: offer.fulfilment_days,
    };
  });

  return [...real, ...synthetic].sort((a, b) => a.expiresAt.localeCompare(b.expiresAt));
}

/** Countdown-chip label and tone class, shared by the dashboard, quotes and orders pages. */
export function slaChip(expiresAt: string): { label: string; className: string } {
  const days = daysUntil(expiresAt);
  const tone = slaTone(days);

  const label = days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Due today' : `${days}d left`;

  const className =
    tone === 'ok'
      ? 'bg-forest-wash text-forest'
      : tone === 'warn'
        ? 'bg-gold-50 text-gold-700'
        : 'bg-danger-wash text-danger-ink';

  return { label, className };
}
