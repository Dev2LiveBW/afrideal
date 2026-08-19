'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Lock, RotateCcw, ShieldCheck, Unlock } from 'lucide-react';
import toast from 'react-hot-toast';

import { ConfirmDialog } from '@/components/brand/ConfirmDialog';
import { GoldButton } from '@/components/brand/GoldButton';
import { MoneyText } from '@/components/brand/MoneyText';
import { StatusBadge } from '@/components/brand/StatusBadge';
import { Enclosure } from '@/components/brand/Panel';
import { PAYMENT_LABELS, dateTime, daysSince } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { EscrowRecord, EscrowStatus } from '@/types';

/**
 * Escrow control panel.
 *
 * Both destructive-ish actions are behind a confirmation that names the amount
 * and the counterparty, because the failure mode here is releasing the wrong
 * supplier's money and there is no undo.
 */

const COPY: Record<'RELEASED' | 'REFUNDED', { title: string; body: (n: string, s: string) => string; label: string }> = {
  RELEASED: {
    title: 'Release escrow to supplier?',
    body: (amount, supplier) =>
      `${amount} will be released to ${supplier}. Funds leave the platform account immediately and this cannot be reversed from here — a mistaken release has to be recovered as a new payment.`,
    label: 'Release funds',
  },
  REFUNDED: {
    title: 'Refund escrow to customer?',
    body: (amount, supplier) =>
      `${amount} will be returned to the customer and ${supplier} will not be paid for this leg. Use this when a dispute resolves in the customer's favour.`,
    label: 'Refund customer',
  },
};

export function EscrowPanel({
  record,
  supplierName,
  canAct = true,
  className,
}: {
  record: EscrowRecord;
  supplierName: string;
  canAct?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [action, setAction] = useState<'RELEASED' | 'REFUNDED' | null>(null);
  const [saving, setSaving] = useState(false);

  const held = record.status === 'HELD' || record.status === 'DISPUTED';
  const ageDays = daysSince(record.held_at);
  const overdue = record.status === 'HELD' && ageDays > record.hold_window_days;

  async function submit() {
    if (!action) return;
    setSaving(true);

    try {
      const response = await fetch(`/api/escrow/${record.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: action,
          note: action === 'RELEASED' ? 'Released by operations.' : 'Refunded by operations.',
        }),
      });

      if (!response.ok) {
        const { error } = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error);
      }

      toast.success(action === 'RELEASED' ? 'Escrow released' : 'Escrow refunded');
      setAction(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update escrow');
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
                  held ? 'bg-gold-50 text-gold-dark' : 'bg-forest-wash text-forest',
                )}
              >
                {held ? <Lock size={18} strokeWidth={1.5} /> : <ShieldCheck size={18} strokeWidth={1.5} />}
              </span>
              <div>
                <p className="eyebrow">Escrow</p>
                <p className="mt-1 text-[15px] font-semibold text-ink">{supplierName}</p>
              </div>
            </div>
            <StatusBadge status={record.status} />
          </div>

          <div className="mt-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-[12px] text-muted">Amount held</p>
              <MoneyText amount={record.amount} size="xl" tone={held ? 'gold' : 'forest'} />
            </div>
            <div className="text-right">
              <p className="text-[12px] text-muted">Gateway</p>
              <p className="text-[13.5px] font-medium text-ink">
                {PAYMENT_LABELS[record.gateway] ?? record.gateway}
              </p>
            </div>
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-hairline pt-4 text-[12.5px]">
            <div>
              <dt className="text-muted">Held since</dt>
              <dd className="mt-0.5 font-mono tabular-nums text-ink">{dateTime(record.held_at)}</dd>
            </div>
            <div>
              <dt className="text-muted">Days held</dt>
              <dd
                className={cn(
                  'mt-0.5 font-mono tabular-nums',
                  overdue ? 'font-semibold text-danger-ink' : 'text-ink',
                )}
              >
                {ageDays} of {record.hold_window_days}
                {overdue && ' · overdue'}
              </dd>
            </div>
            {record.released_at && (
              <div>
                <dt className="text-muted">Released</dt>
                <dd className="mt-0.5 font-mono tabular-nums text-forest">
                  {dateTime(record.released_at)}
                </dd>
              </div>
            )}
            {record.refunded_at && (
              <div>
                <dt className="text-muted">Refunded</dt>
                <dd className="mt-0.5 font-mono tabular-nums text-slateish-ink">
                  {dateTime(record.refunded_at)}
                </dd>
              </div>
            )}
          </dl>

          {canAct && held && (
            <div className="mt-5 flex flex-wrap gap-2 border-t border-hairline pt-4">
              <GoldButton
                size="sm"
                variant="forest"
                icon={<Unlock size={14} strokeWidth={1.5} />}
                onClick={() => setAction('RELEASED')}
              >
                Release to supplier
              </GoldButton>
              <GoldButton
                size="sm"
                variant="ghost"
                icon={<RotateCcw size={14} strokeWidth={1.5} />}
                onClick={() => setAction('REFUNDED')}
              >
                Refund customer
              </GoldButton>
            </div>
          )}

          {!held && (
            <p className="mt-5 border-t border-hairline pt-4 text-[12.5px] text-body">
              This escrow reached a terminal state and can no longer be moved.
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
        tone={action === 'RELEASED' ? 'forest' : 'danger'}
      />
    </>
  );
}
