'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Package2, Receipt, ShieldCheck, UserCheck } from 'lucide-react';

import { MoneyText } from '@/components/brand/MoneyText';
import { EmptyState, Panel } from '@/components/brand/Panel';
import { StatusBadge } from '@/components/brand/StatusBadge';
import { PerformanceRadar } from '@/components/charts/Charts';
import { PerformanceScore, type PerformanceMetric } from '@/components/supplier/PerformanceScore';
import { VerificationChecklist } from '@/components/supplier/VerificationChecklist';
import { dateTime, shortDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { EscrowRecord, Product, Settlement, Supplier, SupplierOffer } from '@/types';

const TABS = [
  { id: 'verification', label: 'Verification', icon: ShieldCheck },
  { id: 'performance', label: 'Performance', icon: UserCheck },
  { id: 'products', label: 'Products', icon: Package2 },
  { id: 'transactions', label: 'Transactions', icon: Receipt },
] as const;

type TabId = (typeof TABS)[number]['id'];

export function SupplierDetailTabs({
  supplier,
  offers,
  products,
  settlements,
  escrow,
  performanceMetrics,
  radarData,
  canDecide,
}: {
  supplier: Supplier;
  offers: SupplierOffer[];
  products: Product[];
  settlements: Settlement[];
  escrow: EscrowRecord[];
  performanceMetrics: PerformanceMetric[];
  radarData: { metric: string; value: number }[];
  canDecide: boolean;
}) {
  const [tab, setTab] = useState<TabId>('verification');
  const productById = new Map(products.map((product) => [product.id, product]));

  return (
    <Panel className="overflow-hidden">
      <div className="no-scrollbar flex gap-1 overflow-x-auto border-b border-hairline px-3 pt-3">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-1.5 whitespace-nowrap rounded-t-md px-3.5 py-2.5 text-[13px] font-medium transition-colors',
                tab === t.id ? 'bg-surface text-ink' : 'text-muted hover:text-ink',
              )}
            >
              <Icon size={14} strokeWidth={1.5} />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="bg-surface p-5">
        {tab === 'verification' && (
          <VerificationChecklist
            supplierId={supplier.id}
            supplierName={supplier.name}
            documents={supplier.verification_docs}
            currentStatus={supplier.status}
            canDecide={canDecide}
          />
        )}

        {tab === 'performance' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-md border border-hairline bg-surface-raised p-2">
              <PerformanceRadar data={radarData} />
            </div>
            <PerformanceScore metrics={performanceMetrics} />
          </div>
        )}

        {tab === 'products' &&
          (offers.length === 0 ? (
            <EmptyState
              icon={<Package2 size={20} strokeWidth={1.5} />}
              title="No listed products"
              description="This supplier has not submitted an offer yet."
            />
          ) : (
            <div className="overflow-x-auto rounded-md border border-hairline bg-surface-raised">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="w-[32%]">Product</th>
                    <th>Cost</th>
                    <th>Stock</th>
                    <th>Lead time</th>
                    <th>MOQ</th>
                    <th>Updated</th>
                    <th className="text-right">Live</th>
                  </tr>
                </thead>
                <tbody>
                  {offers.map((offer) => {
                    const product = productById.get(offer.product_id);
                    return (
                      <tr key={offer.id}>
                        <td>
                          <Link
                            href={`/admin/products/${offer.product_id}`}
                            className="font-medium text-ink transition-colors hover:text-gold-dark"
                          >
                            {product?.emoji} {product?.name ?? offer.product_id}
                          </Link>
                        </td>
                        <td>
                          <MoneyText amount={offer.supplier_cost} size="sm" />
                        </td>
                        <td
                          className={cn(
                            'font-mono text-[12.5px] tabular-nums',
                            offer.stock <= 0 ? 'text-danger-ink' : 'text-ink',
                          )}
                        >
                          {offer.stock <= 0 ? 'Out of stock' : offer.stock.toLocaleString('en-GB')}
                        </td>
                        <td className="font-mono text-[12.5px] tabular-nums text-ink">{offer.fulfilment_days}d</td>
                        <td className="font-mono text-[12.5px] tabular-nums text-ink">{offer.moq}</td>
                        <td className="text-[12px] text-muted">{shortDate(offer.last_updated)}</td>
                        <td className="text-right">
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-[11px] font-medium',
                              offer.active ? 'bg-forest-wash text-forest-ink' : 'bg-inert-wash text-inert-ink',
                            )}
                          >
                            {offer.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}

        {tab === 'transactions' && (
          <div className="space-y-6">
            <div>
              <p className="eyebrow mb-2">Settlements</p>
              {settlements.length === 0 ? (
                <p className="text-[12.5px] text-muted">No settlement periods recorded yet.</p>
              ) : (
                <div className="overflow-x-auto rounded-md border border-hairline bg-surface-raised">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Period</th>
                        <th>Gross</th>
                        <th>Commission</th>
                        <th>Net</th>
                        <th>Paid</th>
                        <th className="text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {settlements.map((settlement) => (
                        <tr key={settlement.id}>
                          <td className="font-mono text-[12.5px] text-ink">{settlement.period}</td>
                          <td>
                            <MoneyText amount={settlement.gross} size="sm" />
                          </td>
                          <td>
                            <MoneyText amount={settlement.commission} size="sm" tone="muted" />
                          </td>
                          <td>
                            <MoneyText amount={settlement.net} size="sm" tone="forest" />
                          </td>
                          <td className="text-[12px] text-muted">
                            {settlement.paid_at ? shortDate(settlement.paid_at) : '—'}
                          </td>
                          <td className="text-right">
                            <StatusBadge status={settlement.status} size="sm" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div>
              <p className="eyebrow mb-2">Escrow legs</p>
              {escrow.length === 0 ? (
                <p className="text-[12.5px] text-muted">No escrow activity recorded yet.</p>
              ) : (
                <div className="overflow-x-auto rounded-md border border-hairline bg-surface-raised">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Order</th>
                        <th>Amount</th>
                        <th>Held since</th>
                        <th>Window</th>
                        <th className="text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {escrow.map((record) => (
                        <tr key={record.id}>
                          <td>
                            <Link
                              href={`/admin/orders/${record.order_id}`}
                              className="font-mono text-[12.5px] font-medium text-ink transition-colors hover:text-gold-dark"
                            >
                              {record.order_id}
                            </Link>
                          </td>
                          <td>
                            <MoneyText amount={record.amount} size="sm" />
                          </td>
                          <td className="text-[12px] text-muted">{dateTime(record.held_at)}</td>
                          <td className="font-mono text-[12px] tabular-nums text-ink">
                            {record.hold_window_days}d
                          </td>
                          <td className="text-right">
                            <StatusBadge status={record.status} size="sm" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}
