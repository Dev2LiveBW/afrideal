import { BadgeCheck, PackageX, Star, Truck } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { PublicOffer } from '@/lib/queries';

/**
 * Customer-facing supplier comparison (§22/§24).
 *
 * Two rules govern what appears here.
 *
 * §5 — supplier acquisition costs are confidential. This component only ever
 * receives `PublicOffer`, which has no `supplier_cost` field to leak. That is
 * enforced by the type, not by remembering not to render it, because a server
 * component serialises whatever it passes down into the page payload whether or
 * not anything displays it.
 *
 * §23 — transparent procurement is a commercial decision AfriDeal makes per
 * supplier agreement, never a control a shopper can toggle. If that mode ships,
 * it arrives as server-resolved props on a separate B2B surface.
 *
 * So this is a fulfilment comparison, not a price comparison: who can supply
 * it, how fast, and how reliably. Under Model A the customer pays one AfriDeal
 * price regardless of which supplier is routed.
 */

const STOCK_COPY: Record<PublicOffer['stock_band'], { label: string; tone: string }> = {
  OUT_OF_STOCK: { label: 'Out of stock', tone: 'text-inert-ink' },
  LOW: { label: 'Limited stock', tone: 'text-gold-700' },
  AVAILABLE: { label: 'In stock', tone: 'text-forest' },
  BULK_READY: { label: 'Bulk quantities', tone: 'text-forest' },
};

const SUPPLIER_TYPE_COPY: Record<string, string> = {
  MANUFACTURER: 'Manufacturer',
  WHOLESALER: 'Wholesaler',
  DISTRIBUTOR: 'Distributor',
  RETAILER: 'Retailer',
  IMPORTER: 'Importer',
  BRAND: 'Brand',
  AGENT: 'Agent',
};

export function SupplierComparisonMatrix({
  productName,
  offers,
}: {
  productName: string;
  offers: PublicOffer[];
}) {
  if (offers.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-md border border-hairline bg-surface-raised px-5 py-6 text-[13px] text-body">
        <PackageX size={18} strokeWidth={1.5} className="shrink-0 text-muted" />
        No verified supplier is currently carrying this product.
      </div>
    );
  }

  const fastest = Math.min(...offers.filter((o) => o.in_stock).map((o) => o.fulfilment_days));

  return (
    <div>
      <h2 className="font-display text-headline-md font-semibold text-ink">Who can supply this</h2>
      <p className="measure mt-2 text-[13.5px] leading-6 text-body">
        {offers.length} verified {offers.length === 1 ? 'supplier carries' : 'suppliers carry'}{' '}
        {productName}. Your order routes to whichever is most likely to deliver on the day, which is
        not always the one quoting lowest. You pay the same price either way.
      </p>

      <div className="mt-5 overflow-x-auto">
        <table className="data-table min-w-[620px]">
          <thead>
            <tr>
              <th>Supplier</th>
              <th>Type</th>
              <th>Reliability</th>
              <th>Lead time</th>
              <th>Availability</th>
              <th className="text-right">Routing</th>
            </tr>
          </thead>

          <tbody>
            {offers.map((entry) => {
              const stock = STOCK_COPY[entry.stock_band];

              return (
                <tr
                  key={entry.offer_id}
                  className={cn(entry.is_primary && 'bg-forest-wash/60 hover:bg-forest-wash')}
                >
                  <td>
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-semibold',
                          entry.is_primary ? 'bg-forest text-white' : 'bg-ink/[0.06] text-ink',
                        )}
                      >
                        {entry.supplier_initials}
                      </span>
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 font-medium text-ink">
                          <span className="truncate">{entry.supplier_name}</span>
                          <BadgeCheck size={13} strokeWidth={1.5} className="shrink-0 text-forest" />
                        </p>
                        <p className="text-[11.5px] text-muted">
                          {entry.city}, {entry.country}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="text-body">
                    {SUPPLIER_TYPE_COPY[entry.supplier_type] ?? 'Supplier'}
                  </td>

                  <td>
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-14 overflow-hidden rounded-full bg-ink/[0.08]">
                        <span
                          className="block h-full rounded-full bg-forest"
                          style={{ width: `${entry.reliability_score}%` }}
                        />
                      </span>
                      <span className="font-mono text-[12.5px] tabular-nums text-ink">
                        {entry.reliability_score}
                      </span>
                    </div>
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-muted">
                      <Star size={10} strokeWidth={1.5} className="fill-gold text-gold" />
                      <span className="font-mono tabular-nums">{entry.rating.toFixed(1)}</span>
                      <span>· {entry.fulfilment_rate}% fulfilled</span>
                    </p>
                  </td>

                  <td>
                    <span className="inline-flex items-center gap-1.5 font-mono text-[13px] tabular-nums text-ink">
                      {entry.in_stock && entry.fulfilment_days === fastest && (
                        <Truck size={12} strokeWidth={1.5} className="text-forest" />
                      )}
                      {entry.fulfilment_days}d
                    </span>
                  </td>

                  <td className={cn('text-[12.5px] font-medium', stock.tone)}>{stock.label}</td>

                  <td className="text-right">
                    {entry.is_primary ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-forest px-2.5 py-1 text-[11px] font-medium text-white">
                        <BadgeCheck size={12} strokeWidth={2} />
                        Preferred
                      </span>
                    ) : (
                      <span className="rounded-full bg-ink/[0.06] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-body">
                        {entry.label}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[11.5px] leading-5 text-muted">
        Supplier pricing is commercially confidential and is not shown. Minimum order quantities
        apply on some offers and are resolved automatically at checkout.
      </p>
    </div>
  );
}
