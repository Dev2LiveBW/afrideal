'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, PackageX, Repeat2, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

import { ConfirmDialog } from '@/components/brand/ConfirmDialog';
import { GoldButton } from '@/components/brand/GoldButton';
import { MoneyText } from '@/components/brand/MoneyText';
import { shortDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { ScoredOffer } from '@/types';

/**
 * Ranked supplier offers for one product.
 *
 * The platform does not route to the cheapest offer, so this table has to earn
 * that decision in front of an operator: the composite score is shown broken
 * into its five parts, and the selected row states its reason in plain words.
 */

export function SupplierOfferTable({
  offers,
  productName,
  onOverride,
}: {
  offers: ScoredOffer[];
  productName: string;
  /** Omit to render read-only (supplier-facing views). */
  onOverride?: (supplierId: string) => Promise<void>;
}) {
  const [pending, setPending] = useState<ScoredOffer | null>(null);
  const [saving, setSaving] = useState(false);

  async function confirmOverride() {
    if (!pending || !onOverride) return;
    setSaving(true);
    try {
      await onOverride(pending.supplier.id);
      toast.success(`Routing moved to ${pending.supplier.name}`);
      setPending(null);
    } catch {
      toast.error('Could not reassign the supplier. Try again.');
    } finally {
      setSaving(false);
    }
  }

  if (offers.length === 0) {
    return (
      <div className="flex items-center gap-3 px-5 py-8 text-[13px] text-body">
        <PackageX size={18} strokeWidth={1.5} className="text-muted" />
        No verified supplier currently offers this product.
      </div>
    );
  }

  const best = offers[0].score;

  return (
    <>
      <div className="overflow-x-auto">
        <table className="data-table min-w-[860px]">
          <thead>
            <tr>
              <th className="w-[26%]">Supplier</th>
              <th>Cost</th>
              <th>Stock</th>
              <th>Lead time</th>
              <th>Rating</th>
              <th className="w-[18%]">Composite score</th>
              <th className="text-right">Routing</th>
            </tr>
          </thead>
          <tbody>
            {offers.map((entry, index) => {
              const isPrimary = entry.rank === 1;
              const outOfStock = entry.offer.stock <= 0;

              return (
                <motion.tr
                  key={entry.offer.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.045, duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                  className={cn(isPrimary && 'bg-forest-wash/60 hover:bg-forest-wash')}
                >
                  <td>
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-mono text-[12px] font-semibold',
                          isPrimary ? 'bg-forest text-white' : 'bg-ink/[0.06] text-ink',
                        )}
                      >
                        {entry.supplier.initials}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink">{entry.supplier.name}</p>
                        <p className="flex items-center gap-1 text-[12px] text-muted">
                          <ShieldCheck size={12} strokeWidth={1.5} className="text-forest" />
                          {entry.supplier.city}, {entry.supplier.country}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td>
                    <MoneyText amount={entry.offer.supplier_cost} size="sm" />
                    <p className="mt-0.5 text-[11px] text-muted">MOQ {entry.offer.moq}</p>
                  </td>

                  <td>
                    <span
                      className={cn(
                        'font-mono text-[13px] tabular-nums',
                        outOfStock ? 'text-danger-ink' : 'text-ink',
                      )}
                    >
                      {outOfStock ? 'Out of stock' : entry.offer.stock.toLocaleString('en-GB')}
                    </span>
                  </td>

                  <td className="font-mono text-[13px] tabular-nums text-ink">
                    {entry.offer.fulfilment_days}d
                  </td>

                  <td className="font-mono text-[13px] tabular-nums text-ink">
                    {entry.supplier.rating.toFixed(1)}★
                  </td>

                  <td>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-full max-w-[90px] overflow-hidden rounded-full bg-ink/[0.08]">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(entry.score / best) * 100}%` }}
                          transition={{ delay: 0.15 + index * 0.045, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                          className={cn('h-full rounded-full', isPrimary ? 'bg-forest' : 'bg-gold')}
                        />
                      </div>
                      <span className="font-mono text-[13px] font-medium tabular-nums text-ink">
                        {entry.score.toFixed(1)}
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                      rel {entry.breakdown.reliability.toFixed(0)} · spd{' '}
                      {entry.breakdown.speed.toFixed(0)} · cost {entry.breakdown.cost.toFixed(1)}
                    </p>
                  </td>

                  <td className="text-right">
                    {isPrimary ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-forest px-2.5 py-1 text-[11px] font-medium text-white">
                        <CheckCircle2 size={12} strokeWidth={2} />
                        AUTO-SELECTED
                      </span>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <span className="rounded-full bg-ink/[0.06] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-body">
                          {entry.label}
                        </span>
                        {onOverride && (
                          <GoldButton
                            variant="ghost"
                            size="sm"
                            icon={<Repeat2 size={13} strokeWidth={1.5} />}
                            onClick={() => setPending(entry)}
                          >
                            Override
                          </GoldButton>
                        )}
                      </div>
                    )}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* The engine's justification, stated once beneath the table. */}
      <div className="flex items-start gap-2.5 border-t border-hairline bg-forest-wash/40 px-5 py-3.5">
        <CheckCircle2 size={15} strokeWidth={1.5} className="mt-0.5 shrink-0 text-forest" />
        <p className="text-[13px] leading-5 text-forest-ink">
          <span className="font-medium">{offers[0].supplier.name}</span> — {offers[0].reason}
        </p>
      </div>

      <ConfirmDialog
        open={pending !== null}
        onClose={() => setPending(null)}
        onConfirm={confirmOverride}
        loading={saving}
        title="Override supplier routing?"
        description={`This moves ${productName} from ${offers[0].supplier.name} to ${pending?.supplier.name}. The change is written to the supplier order and recorded in the audit log against your name.`}
        confirmLabel="Reassign supplier"
        tone="gold"
      >
        {pending && (
          <dl className="grid grid-cols-2 gap-3 rounded border border-hairline bg-surface p-3 text-[12.5px]">
            <div>
              <dt className="text-muted">Composite score</dt>
              <dd className="font-mono tabular-nums text-ink">
                {pending.score.toFixed(1)}{' '}
                <span className="text-danger-ink">
                  ({(pending.score - offers[0].score).toFixed(1)})
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-muted">Unit cost</dt>
              <dd>
                <MoneyText amount={pending.offer.supplier_cost} size="xs" />
              </dd>
            </div>
            <div>
              <dt className="text-muted">Lead time</dt>
              <dd className="font-mono tabular-nums text-ink">
                {pending.offer.fulfilment_days} days
              </dd>
            </div>
            <div>
              <dt className="text-muted">Offer updated</dt>
              <dd className="text-ink">{shortDate(pending.offer.last_updated)}</dd>
            </div>
          </dl>
        )}
      </ConfirmDialog>
    </>
  );
}
