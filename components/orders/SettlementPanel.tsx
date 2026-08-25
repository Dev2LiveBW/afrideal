'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FileText, HandCoins, RotateCcw, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

import { ConfirmDialog } from '@/components/brand/ConfirmDialog';
import { GoldButton } from '@/components/brand/GoldButton';
import { MoneyText } from '@/components/brand/MoneyText';
import { StatusBadge } from '@/components/brand/StatusBadge';
import { Enclosure } from '@/components/brand/Panel';
import { PAYMENT_LABELS, dateTime, daysSince } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { SupplierPayable, PayableStatus } from '@/types';

/**
 * Supplier settlement panel.
 *
 * One procurement invoice: what AfriDeal owes this supplier for the goods it
 * bought from them on this order. Both actions sit behind a confirmation that
 * names the amount and the counterparty, because the failure mode is paying the
 * wrong supplier and there is no undo.
 */

const COPY: Record<
  'SETTLED' | 'CANCELLED',
  { title: string; body: (n: string, s: string) => string; label: string }
> = {
  SETTLED: {
    title: 'Settle this supplier invoice?',
    body: (amount, supplier) =>
      `BWP ${amount} will be paid to ${supplier}. The payment is issued immediately and cannot be reversed from here - a payment made in error has to be recovered separately.`,
    label: 'Settle invoice',
  },
  CANCELLED: {
    title: 'Cancel this supplier invoice?',
    body: (amount, supplier) =>
      `The BWP ${amount} owed to ${supplier} will be written off and nothing will be paid on this leg. Use this when the goods were never supplied, or when a claim resolves in the customer's favour.`,
    label: 'Cancel invoice',
  },
};

export function SettlementPanel({
  record,
  supplierName,
  canAct = true,
  className,
}: {
  record: SupplierPayable;
  supplierName: string;
  canAct?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [action, setAction] = useState<'SETTLED' | 'CANCELLED' | null>(null);
  const [saving, setSaving] = useState(false);

  const open = record.status === 'PENDING' || record.status === 'ON_HOLD';
  const ageDays = daysSince(record.raised_at);
  const overdue = record.status === 'PENDING' && ageDays > record.terms_days;

  async function submit() {
    if (!action) return;
    setSaving(true);

    try {
      const response = await fetch(`/api/payables/${record.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: action,
          note:
            action === 'SETTLED'
              ? 'Supplier invoice settled by operations.'
              : 'Supplier invoice cancelled by operations.',
        }),
      });

      if (!response.ok) {
        const { error } = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error);
      }

      toast.success(action === 'SETTLED' ? 'Invoice settled' : 'Invoice cancelled');
      setAction(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update the invoice');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Enclosure className={className}>
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full',
                  open ? 'bg-gold-50 text-gold-dark' : 'bg-forest-wash text-forest',
                )}
              >
                {open ? <FileText size={18} strokeWidth={1.5} /> : <ShieldCheck size={18} strokeWidth={1.5} />}
              </span>
              <div>
                <p className="eyebrow">Supplier invoice</p>
                <p className="mt-1 text-[15px] font-semibold text-ink">{supplierName}</p>
              </div>
            </div>
            <StatusBadge status={record.status} />
          </div>

          <div className="mt-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-[12px] text-muted">Amount owed</p>
              <MoneyText amount={record.amount} size="xl" tone={open ? 'gold' : 'forest'} />
            </div>
            <div className="text-right">
              <p className="text-[12px] text-muted">Paid by customer via</p>
              <p className="text-[13.5px] font-medium text-ink">
                {PAYMENT_LABELS[record.gateway] ?? record.gateway}
              </p>
            </div>
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-hairline pt-4 text-[12.5px]">
            <div>
              <dt className="text-muted">Raised</dt>
              <dd className="mt-0.5 font-mono tabular-nums text-ink">{dateTime(record.raised_at)}</dd>
            </div>
            <div>
              <dt className="text-muted">Age</dt>
              <dd
                className={cn(
                  'mt-0.5 font-mono tabular-nums',
                  overdue ? 'font-semibold text-danger-ink' : 'text-ink',
                )}
              >
                {ageDays} of {record.terms_days}
                {overdue && ' · overdue'}
              </dd>
            </div>
            {record.settled_at && (
              <div>
                <dt className="text-muted">Settled</dt>
                <dd className="mt-0.5 font-mono tabular-nums text-forest">
                  {dateTime(record.settled_at)}
                </dd>
              </div>
            )}
            {record.cancelled_at && (
              <div>
                <dt className="text-muted">Cancelled</dt>
                <dd className="mt-0.5 font-mono tabular-nums text-slateish-ink">
                  {dateTime(record.cancelled_at)}
                </dd>
              </div>
            )}
          </dl>

          {canAct && open && (
            <div className="mt-5 flex flex-wrap gap-2 border-t border-hairline pt-4">
              <GoldButton
                size="sm"
                variant="forest"
                icon={<HandCoins size={14} strokeWidth={1.5} />}
                onClick={() => setAction('SETTLED')}
              >
                Settle invoice
              </GoldButton>
              <GoldButton
                size="sm"
                variant="ghost"
                icon={<RotateCcw size={14} strokeWidth={1.5} />}
                onClick={() => setAction('CANCELLED')}
              >
                Cancel invoice
              </GoldButton>
            </div>
          )}

          {!open && (
            <p className="mt-5 border-t border-hairline pt-4 text-[12.5px] text-body">
              This invoice is closed and can no longer be moved.
            </p>
          )}
        </div>

        {record.history.length > 0 && (
          <div className="border-t border-hairline bg-surface px-5 py-4">
            <p className="eyebrow mb-3">Ledger</p>
            <ol className="space-y-2.5">
              {record.history.map((entry, index) => (
                <li key={index} className="flex items-start gap-2.5 text-[12.5px]">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                  <div className="min-w-0">
                    <p className="text-ink">
                      <span className="font-medium">
                        {entry.from ? `${entry.from} → ${entry.to}` : entry.to}
                      </span>{' '}
                      <span className="text-muted">· {entry.actor}</span>
                    </p>
                    <p className="mt-0.5 text-body">{entry.note}</p>
                    <p className="mt-0.5 font-mono text-[10.5px] tabular-nums text-muted">
                      {dateTime(entry.at)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}
      </Enclosure>

      <ConfirmDialog
        open={action !== null}
        onClose={() => setAction(null)}
        onConfirm={submit}
        loading={saving}
        title={action ? COPY[action].title : ''}
        description={
          action
            ? COPY[action].body(
                new Intl.NumberFormat('en-BW', { minimumFractionDigits: 2 }).format(record.amount),
                supplierName,
              )
            : ''
        }
        confirmLabel={action ? COPY[action].label : 'Confirm'}
        tone={action === 'SETTLED' ? 'forest' : 'danger'}
      />
    </>
  );
}
