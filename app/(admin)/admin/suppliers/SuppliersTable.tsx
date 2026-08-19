'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, Star } from 'lucide-react';
import toast from 'react-hot-toast';

import { ConfirmDialog } from '@/components/brand/ConfirmDialog';
import { GoldButton } from '@/components/brand/GoldButton';
import { MoneyText } from '@/components/brand/MoneyText';
import { EmptyState } from '@/components/brand/Panel';
import { StatusBadge } from '@/components/brand/StatusBadge';
import { cn } from '@/lib/utils';
import type { Supplier, SupplierStatus } from '@/types';

type Filter = 'ALL' | Extract<SupplierStatus, 'PENDING' | 'VERIFIED' | 'SUSPENDED'>;

const TABS: { id: Filter; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'PENDING', label: 'Pending' },
  { id: 'VERIFIED', label: 'Verified' },
  { id: 'SUSPENDED', label: 'Suspended' },
];

export function SuppliersTable({ suppliers, canDecide }: { suppliers: Supplier[]; canDecide: boolean }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('ALL');
  const [pending, setPending] = useState<{ supplier: Supplier; status: 'VERIFIED' | 'REJECTED' } | null>(null);
  const [saving, setSaving] = useState(false);

  const countFor = (id: Filter) => (id === 'ALL' ? suppliers.length : suppliers.filter((s) => s.status === id).length);

  const filtered = useMemo(
    () => (filter === 'ALL' ? suppliers : suppliers.filter((supplier) => supplier.status === filter)),
    [suppliers, filter],
  );

  async function confirm() {
    if (!pending) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/suppliers/${pending.supplier.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: pending.status }),
      });
      if (!response.ok) {
        const { error } = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error ?? 'Request failed');
      }
      toast.success(
        pending.status === 'VERIFIED'
          ? `${pending.supplier.name} approved and live`
          : `${pending.supplier.name}'s application rejected`,
      );
      setPending(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update this supplier');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-5 flex gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            className={cn(
              'shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-[12.5px] font-medium transition-colors duration-200',
              filter === tab.id
                ? 'bg-ink text-white'
                : 'bg-surface-raised text-body ring-1 ring-inset ring-hairline-strong hover:bg-ink/[0.04]',
            )}
          >
            {tab.label} ({countFor(tab.id)})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="panel">
          <EmptyState
            icon={<Building2 size={20} strokeWidth={1.5} />}
            title="No suppliers here"
            description="Nothing matches this filter right now."
          />
        </div>
      ) : (
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table min-w-[880px]">
              <thead>
                <tr>
                  <th className="w-[24%]">Supplier</th>
                  <th>Location</th>
                  <th>Rating</th>
                  <th>Reliability</th>
                  <th>Lifetime GMV</th>
                  <th>Orders</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((supplier) => (
                  <tr key={supplier.id}>
                    <td>
                      <Link href={`/admin/suppliers/${supplier.id}`} className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink/[0.06] font-mono text-[12px] font-semibold text-ink">
                          {supplier.initials}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[13.5px] font-medium text-ink transition-colors hover:text-gold-dark">
                            {supplier.name}
                          </span>
                          <span className="block truncate text-[11px] text-muted">{supplier.products_count} products listed</span>
                        </span>
                      </Link>
                    </td>
                    <td className="text-[12.5px] text-body">
                      {supplier.city}, {supplier.country}
                    </td>
                    <td>
                      <span className="inline-flex items-center gap-1 font-mono text-[12.5px] tabular-nums text-ink">
                        <Star size={11} strokeWidth={1.5} className="fill-gold text-gold" />
                        {supplier.rating > 0 ? supplier.rating.toFixed(1) : '—'}
                      </span>
                    </td>
                    <td className="font-mono text-[12.5px] tabular-nums text-ink">
                      {supplier.reliability_score > 0 ? `${supplier.reliability_score}/100` : '—'}
                    </td>
                    <td>
                      <MoneyText amount={supplier.total_gmv} size="sm" />
                    </td>
                    <td className="font-mono text-[12.5px] tabular-nums text-body">{supplier.orders_count}</td>
                    <td>
                      <StatusBadge status={supplier.status} size="sm" />
                    </td>
                    <td className="text-right">
                      {canDecide && supplier.status === 'PENDING' ? (
                        <div className="flex justify-end gap-2">
                          <GoldButton
                            size="sm"
                            variant="forest"
                            onClick={() => setPending({ supplier, status: 'VERIFIED' })}
                          >
                            Approve
                          </GoldButton>
                          <GoldButton
                            size="sm"
                            variant="danger"
                            onClick={() => setPending({ supplier, status: 'REJECTED' })}
                          >
                            Reject
                          </GoldButton>
                        </div>
                      ) : (
                        <Link
                          href={`/admin/suppliers/${supplier.id}`}
                          className="text-[12.5px] font-medium text-muted transition-colors hover:text-ink"
                        >
                          View →
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={pending !== null}
        onClose={() => setPending(null)}
        onConfirm={confirm}
        loading={saving}
        tone={pending?.status === 'VERIFIED' ? 'forest' : 'danger'}
        title={pending ? `${pending.status === 'VERIFIED' ? 'Approve' : 'Reject'} ${pending.supplier.name}?` : ''}
        description={
          pending?.status === 'VERIFIED'
            ? 'This verifies the supplier, makes their listings live to buyers, and allows them to be routed orders immediately.'
            : 'The supplier will be notified to review their verification documents. They will not be able to list products or receive orders until resubmitted and approved.'
        }
        confirmLabel={pending?.status === 'VERIFIED' ? 'Approve supplier' : 'Reject application'}
      />
    </div>
  );
}
