import Link from 'next/link';
import { BadgeCheck, ChevronRight, Store, Truck } from 'lucide-react';

import { MoneyText } from '@/components/brand/MoneyText';
import type { PublicOffer } from '@/lib/queries';

/** Breadcrumb, delivery estimate and seller card for the product detail page. */

export function Breadcrumb({ trail }: { trail: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex flex-wrap items-center gap-1.5 text-[12.5px]">
        {trail.map((crumb, index) => (
          <li key={crumb.label} className="flex items-center gap-1.5">
            {index > 0 && <ChevronRight size={13} strokeWidth={1.5} className="text-muted" />}
            {crumb.href ? (
              <Link href={crumb.href} className="text-body transition-colors hover:text-ink">
                {crumb.label}
              </Link>
            ) : (
              <span className="text-muted">{crumb.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/**
 * Delivery estimate.
 *
 * The window comes from the fastest in-stock offer's real fulfilment time, plus
 * a day in transit, so it moves when stock does rather than being a fixed
 * marketing promise.
 */
export function DeliveryEstimate({
  offers,
  city,
  fee = 45,
}: {
  offers: PublicOffer[];
  city: string;
  fee?: number;
}) {
  const inStock = offers.filter((offer) => offer.in_stock);

  if (inStock.length === 0) {
    return (
      <div className="mt-4 rounded-md border border-hairline bg-surface p-4">
        <p className="text-[13px] text-body">
          No supplier is currently holding stock, so we cannot quote a delivery window. Request a
          quotation and we will source it.
        </p>
      </div>
    );
  }

  const fastest = Math.min(...inStock.map((offer) => offer.fulfilment_days));
  const slowest = Math.max(...inStock.map((offer) => offer.fulfilment_days));
  const low = fastest + 1;
  const high = Math.max(low, slowest + 1);

  return (
    <div className="mt-4 rounded-md border border-hairline bg-surface p-4">
      <div className="flex items-center gap-2.5">
        <Truck size={16} strokeWidth={1.5} className="shrink-0 text-muted" />
        <div>
          <p className="text-[13px] font-medium text-ink">Delivery estimate</p>
          <p className="text-[11.5px] text-muted">To {city}</p>
        </div>
      </div>

      <dl className="mt-3.5 space-y-2 border-t border-hairline pt-3 text-[13px]">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-body">Standard delivery</dt>
          <dd className="font-mono font-medium tabular-nums text-forest">
            {low === high ? `${low} business days` : `${low}–${high} business days`}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-body">Cost</dt>
          <dd>
            <MoneyText amount={fee} size="sm" />
          </dd>
        </div>
      </dl>

      <p className="mt-3 text-[11.5px] leading-4 text-muted">
        Flat per order, not per supplier. An order that splits across two suppliers is charged once.
      </p>
    </div>
  );
}

/**
 * Seller card.
 *
 * Names the supplier the engine would route to today. Deliberately shows no
 * price of theirs: what a supplier charges AfriDeal is confidential (§5).
 */
export function SellerCard({ offer }: { offer: PublicOffer | undefined }) {
  if (!offer) return null;

  return (
    <div className="mt-3 flex items-center gap-3 rounded-md border border-hairline bg-surface-raised p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-forest-wash font-mono text-[12px] font-semibold text-forest">
        {offer.supplier_initials}
      </span>

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-[13.5px] font-medium text-ink">
          <span className="truncate">{offer.supplier_name}</span>
          <BadgeCheck size={13} strokeWidth={1.5} className="shrink-0 text-forest" />
        </p>
        <p className="text-[11.5px] text-muted">
          {offer.city}, {offer.country} · {offer.fulfilment_rate}% fulfilled on time
        </p>
      </div>

      <Link
        href="/browse"
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-hairline-strong px-3 py-1.5 text-[12px] font-medium text-ink transition-colors hover:bg-ink/[0.04]"
      >
        <Store size={13} strokeWidth={1.5} />
        Visit store
      </Link>
    </div>
  );
}
