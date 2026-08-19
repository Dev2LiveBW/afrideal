'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Scale } from 'lucide-react';
import toast from 'react-hot-toast';

import { TabButton } from '@/app/(admin)/admin/_components/TabButton';
import { ConfirmDialog } from '@/components/brand/ConfirmDialog';
import { GoldButton } from '@/components/brand/GoldButton';
import { MoneyText } from '@/components/brand/MoneyText';
import { EmptyState, Panel } from '@/components/brand/Panel';
import { StatusBadge } from '@/components/brand/StatusBadge';
import { daysUntil, shortDate, slaTone } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Dispute, DisputeStatus } from '@/types';

export interface DisputeRow {
  dispute: Dispute;
  orderReference: string;
  supplierName: string;
  escrowAmount: number;
}

type Filter = 'ALL' | 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED';
type ResolveAction = 'UNDER_REVIEW' | 'RESOLVED_CUSTOMER' | 'RESOLVED_SUPPLIER';

const TABS: { id: Filter; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'OPEN', label: 'Open' },
  { id: 'UNDER_REVIEW', label: 'Under review' },
  { id: 'RESOLVED', label: 'Resolved' },
];

const TONE_BAR: Record<'ok' | 'warn' | 'critical', string> = {
  ok: 'bg-forest',
  warn: 'bg-gold',
  critical: 'bg-danger',
};

function inFilter(status: DisputeStatus, filter: Filter) {
  if (filter === 'ALL') return true;
  if (filter === 'RESOLVED') return status.startsWith('RESOLVED');
  return status === filter;
}

export function DisputeQueue({ rows, canResolve }: { rows: DisputeRow[]; canResolve: boolean }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('ALL');
  const [resolving, setResolving] = useState<{ row: DisputeRow; status: ResolveAction } | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const countFor = (id: Filter) => rows.filter((row) => inFilter(row.dispute.status, id)).length;
  const filtered = useMemo(() => rows.filter((row) => inFilter(row.dispute.status, filter)), [rows, filter]);

  function close() {
    setResolving(null);
    setNote('');
  }

  async function confirm() {
    if (!resolving) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/disputes/${resolving.row.dispute.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: resolving.status, ...(note ? { resolution_note: note } : {}) }),
      });
      if (!response.ok) {
        const { error } = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error ?? 'Request failed');
      }
      toast.success(
        resolving.status === 'UNDER_REVIEW'
          ? `${resolving.row.orderReference} moved to under review`
          : resolving.status === 'RESOLVED_CUSTOMER'
            ? "Resolved in the customer's favour — escrow refunded"
            : "Resolved in the supplier's favour — escrow released",
      );
      close();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update this dispute');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <TabButton
            key={tab.id}
            label={`${tab.label} (${countFor(tab.id)})`}
            active={filter === tab.id}
            onClick={() => setFilter(tab.id)}
          />
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="panel">
          <EmptyState
            icon={<Scale size={20} strokeWidth={1.5} />}
            title="No disputes here"
            description="Nothing matches this filter right now."
          />
        </div>
      ) : (
        <Panel className="divide-y divide-hairline overflow-hidden">
          {filtered.map((row) => {
            const daysLeft = daysUntil(row.dispute.sla_due_at);
            const tone = slaTone(daysLeft);
            const resolved = row.dispute.status.startsWith('RESOLVED');

            return (
              <div key={row.dispute.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
                <div className="flex shrink-0 items-center gap-2.5 sm:w-24 sm:flex-col sm:items-start">
                  <span className={cn('h-5 w-1 shrink-0 rounded-full', resolved ? 'bg-hairline-strong' : TONE_BAR[tone])} />
                  <div>
                    <p
                      className={cn(
                        'font-mono text-[15px] font-semibold tabular-nums',
                        resolved ? 'text-muted' : daysLeft < 0 ? 'text-danger-ink' : 'text-ink',
                      )}
                    >
                      {resolved ? '—' : daysLeft < 0 ? `${Math.abs(daysLeft)}d over` : `${daysLeft}d`}
                    </p>
                    <p className="text-[10.5px] text-muted">{resolved ? 'closed' : 'SLA remaining'}</p>
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/orders/${row.dispute.order_id}`}
                      className="font-mono text-[12.5px] font-medium text-ink transition-colors hover:text-gold-dark"
                    >
                      {row.orderReference}
                    </Link>
                    <StatusBadge status={row.dispute.status} size="sm" />
                    <span className="text-[11.5px] text-muted">opened {shortDate(row.dispute.opened_at)}</span>
                  </div>
                  <p className="mt-1.5 text-[13.5px] font-medium text-ink">{row.dispute.reason}</p>
                  <p className="mt-0.5 text-[12.5px] leading-5 text-body">{row.dispute.detail}</p>
                  <p className="mt-1.5 text-[11.5px] text-muted">
                    {row.dispute.customer_name} vs{' '}
                    <Link
                      href={`/admin/suppliers/${row.dispute.supplier_id}`}
                      className="text-ink transition-colors hover:text-gold-dark"
                    >
                      {row.supplierName}
                    </Link>
                  </p>
                  {row.dispute.resolution_note && (
                    <p className="mt-2 rounded bg-surface px-3 py-2 text-[12px] text-body">
                      {row.dispute.resolution_note}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 flex-col items-end gap-2">
                  <MoneyText amount={row.escrowAmount} size="md" tone={resolved ? 'muted' : 'gold'} />
                  {canResolve && !resolved && (
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {row.dispute.status === 'OPEN' && (
                        <GoldButton size="sm" variant="ghost" onClick={() => setResolving({ row, status: 'UNDER_REVIEW' })}>
                          Review
                        </GoldButton>
                      )}
                      <GoldButton size="sm" variant="forest" onClick={() => setResolving({ row, status: 'RESOLVED_SUPPLIER' })}>
                        Favour supplier
                      </GoldButton>
                      <GoldButton size="sm" variant="danger" onClick={() => setResolving({ row, status: 'RESOLVED_CUSTOMER' })}>
                        Favour customer
                      </GoldButton>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </Panel>
      )}

      <ConfirmDialog
        open={resolving !== null}
        onClose={close}
        onConfirm={confirm}
        loading={saving}
        tone={resolving?.status === 'RESOLVED_SUPPLIER' ? 'forest' : resolving?.status === 'RESOLVED_CUSTOMER' ? 'danger' : 'gold'}
        title={
          resolving
            ? resolving.status === 'UNDER_REVIEW'
              ? `Move ${resolving.row.orderReference} to under review?`
              : `Resolve ${resolving.row.orderReference} in the ${
                  resolving.status === 'RESOLVED_CUSTOMER' ? "customer's" : "supplier's"
                } favour?`
            : ''
        }
        description={
          resolving?.status === 'UNDER_REVIEW'
            ? 'Marks the dispute as actively being investigated. No funds move yet.'
            : resolving?.status === 'RESOLVED_CUSTOMER'
              ? `The held escrow will be refunded to ${resolving.row.dispute.customer_name} and the order will be marked cancelled. This cannot be undone from here.`
              : resolving?.status === 'RESOLVED_SUPPLIER'
                ? `The held escrow will be released to ${resolving.row.supplierName} and the order will be marked delivered. This cannot be undone from here.`
                : ''
        }
        confirmLabel={resolving?.status === 'UNDER_REVIEW' ? 'Mark under review' : 'Resolve dispute'}
      >
        {resolving && resolving.status !== 'UNDER_REVIEW' && (
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Resolution note (optional) — what tipped the decision…"
            rows={3}
            className="w-full rounded border border-hairline-strong bg-surface px-3 py-2 text-[13px] text-ink outline-none focus:border-gold"
          />
        )}
      </ConfirmDialog>
    </div>
  );
}
