'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileText } from 'lucide-react';
import toast from 'react-hot-toast';

import { TabButton } from '@/app/(admin)/admin/_components/TabButton';
import { ConfirmDialog } from '@/components/brand/ConfirmDialog';
import { GoldButton } from '@/components/brand/GoldButton';
import { MoneyText } from '@/components/brand/MoneyText';
import { EmptyState } from '@/components/brand/Panel';
import { StatusBadge } from '@/components/brand/StatusBadge';
import { openDays, isOverdue } from '@/lib/payables';
import { PAYMENT_LABELS, dateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { SupplierPayable } from '@/types';

export interface PayableRow {
  record: SupplierPayable;
  supplierName: string;
  orderReference: string;
}

type Filter = 'OUTSTANDING' | 'ON_HOLD' | 'OVERDUE' | 'ALL';

const TABS: { id: Filter; label: string }[] = [
  { id: 'OUTSTANDING', label: 'Outstanding' },
  { id: 'ON_HOLD', label: 'On hold' },
  { id: 'OVERDUE', label: 'Overdue' },
  { id: 'ALL', label: 'All' },
];

function matches(row: PayableRow, id: Filter) {
  if (id === 'ALL') return true;
  if (id === 'OUTSTANDING') return row.record.status === 'PENDING';
  if (id === 'ON_HOLD') return row.record.status === 'ON_HOLD';
  return isOverdue(row.record);
}

function actionable(row: PayableRow) {
  return row.record.status === 'PENDING' || row.record.status === 'ON_HOLD';
}

export function PayablesQueue({ rows }: { rows: PayableRow[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('OUTSTANDING');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [action, setAction] = useState<'SETTLED' | 'CANCELLED' | null>(null);
  const [saving, setSaving] = useState(false);

  const countFor = (id: Filter) => rows.filter((row) => matches(row, id)).length;
  const filtered = useMemo(() => rows.filter((row) => matches(row, filter)), [rows, filter]);
  const actionableInView = filtered.filter(actionable);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    const ids = actionableInView.map((row) => row.record.id);
    const allSelected = ids.length > 0 && ids.every((id) => selected.has(id));
    setSelected(allSelected ? new Set() : new Set(ids));
  }

  const selectedRows = rows.filter((row) => selected.has(row.record.id));
  const selectedTotal = selectedRows.reduce((sum, row) => sum + row.record.amount, 0);

  async function confirmBatch() {
    if (!action || selected.size === 0) return;
    setSaving(true);
    try {
      const response = await fetch('/api/payables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: Array.from(selected),
          status: action,
          note: `Batch ${action.toLowerCase()} from the supplier payables queue.`,
        }),
      });
      if (!response.ok) {
        const { error } = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error ?? 'Request failed');
      }
      const { moved, skipped } = (await response.json()) as {
        moved: string[];
        skipped: { id: string; reason: string }[];
      };

      if (skipped.length === 0) {
        toast.success(
          `${moved.length} invoice${moved.length === 1 ? '' : 's'} ${action === 'SETTLED' ? 'settled' : 'cancelled'}`,
        );
      } else if (moved.length === 0) {
        toast.error(`Nothing moved — all ${skipped.length} invoice(s) were skipped (${skipped[0]?.reason}).`);
      } else {
        toast(`${moved.length} moved, ${skipped.length} skipped — ${skipped.map((s) => s.reason).join(', ')}`, {
          icon: '⚠️',
        });
      }

      setSelected(new Set());
      setAction(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Batch action failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <TabButton
              key={tab.id}
              label={`${tab.label} (${countFor(tab.id)})`}
              active={filter === tab.id}
              onClick={() => {
                setFilter(tab.id);
                setSelected(new Set());
              }}
            />
          ))}
        </div>

        {selected.size > 0 && (
          <div className="flex items-center gap-2 rounded-full bg-ink/[0.05] py-1.5 pl-4 pr-1.5">
            <span className="text-[12.5px] font-medium text-ink">{selected.size} selected</span>
            <GoldButton size="sm" variant="forest" onClick={() => setAction('SETTLED')}>
              Settle
            </GoldButton>
            <GoldButton size="sm" variant="danger" onClick={() => setAction('CANCELLED')}>
              Cancel
            </GoldButton>
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="panel">
          <EmptyState
            icon={<FileText size={20} strokeWidth={1.5} />}
            title="Nothing in this view"
            description="No supplier invoices match this filter right now."
          />
        </div>
      ) : (
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table min-w-[880px]">
              <thead>
                <tr>
                  <th className="w-10">
                    <input
                      type="checkbox"
                      aria-label="Select all open invoices"
                      checked={actionableInView.length > 0 && actionableInView.every((row) => selected.has(row.record.id))}
                      onChange={toggleAll}
                      className="h-3.5 w-3.5 accent-gold"
                    />
                  </th>
                  <th>Order</th>
                  <th>Supplier</th>
                  <th>Amount</th>
                  <th>Customer paid via</th>
                  <th>Raised</th>
                  <th>Age</th>
                  <th className="text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const overdue = isOverdue(row.record);
                  return (
                    <tr key={row.record.id} className={cn(overdue && 'bg-danger-wash/30')}>
                      <td>
                        {actionable(row) && (
                          <input
                            type="checkbox"
                            aria-label={`Select ${row.orderReference}`}
                            checked={selected.has(row.record.id)}
                            onChange={() => toggle(row.record.id)}
                            className="h-3.5 w-3.5 accent-gold"
                          />
                        )}
                      </td>
                      <td>
                        <Link
                          href={`/admin/orders/${row.record.order_id}`}
                          className="font-mono text-[12.5px] font-medium text-ink transition-colors hover:text-gold-dark"
                        >
                          {row.orderReference}
                        </Link>
                      </td>
                      <td>
                        <Link
                          href={`/admin/suppliers/${row.record.supplier_id}`}
                          className="text-[13px] text-ink transition-colors hover:text-gold-dark"
                        >
                          {row.supplierName}
                        </Link>
                      </td>
                      <td>
                        <MoneyText amount={row.record.amount} size="sm" />
                      </td>
                      <td className="text-[12px] text-body">
                        {PAYMENT_LABELS[row.record.gateway] ?? row.record.gateway}
                      </td>
                      <td className="text-[12px] text-muted">{dateTime(row.record.raised_at)}</td>
                      <td>
                        <span
                          className={cn(
                            'font-mono text-[12.5px] tabular-nums',
                            overdue ? 'font-semibold text-danger-ink' : 'text-ink',
                          )}
                        >
                          {openDays(row.record)}d{overdue && ' · overdue'}
                        </span>
                      </td>
                      <td className="text-right">
                        <StatusBadge status={row.record.status} size="sm" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={action !== null}
        onClose={() => setAction(null)}
        onConfirm={confirmBatch}
        loading={saving}
        tone={action === 'SETTLED' ? 'forest' : 'danger'}
        title={
          action
            ? `${action === 'SETTLED' ? 'Settle' : 'Cancel'} ${selected.size} supplier invoice${selected.size === 1 ? '' : 's'}?`
            : ''
        }
        description={
          action
            ? `BWP ${new Intl.NumberFormat('en-BW', { minimumFractionDigits: 2 }).format(selectedTotal)} across ${selected.size} invoice(s) will ${
                action === 'SETTLED' ? 'be paid to the suppliers' : 'be written off and not paid'
              } immediately. Any invoice already closed will be skipped and reported back to you.`
            : ''
        }
        confirmLabel={action === 'SETTLED' ? 'Settle invoices' : 'Cancel invoices'}
      />
    </div>
  );
}
