'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Unlock } from 'lucide-react';
import toast from 'react-hot-toast';

import { TabButton } from '@/app/(admin)/admin/_components/TabButton';
import { ConfirmDialog } from '@/components/brand/ConfirmDialog';
import { GoldButton } from '@/components/brand/GoldButton';
import { MoneyText } from '@/components/brand/MoneyText';
import { EmptyState } from '@/components/brand/Panel';
import { StatusBadge } from '@/components/brand/StatusBadge';
import { PAYMENT_LABELS, humanise, shortDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Order, OrderStatus, SupplierOrderStatus } from '@/types';

export interface OrderRow {
  order: Order;
  itemCount: number;
  legs: { id: string; supplierName: string; status: SupplierOrderStatus }[];
  heldEscrowIds: string[];
  heldEscrowTotal: number;
}

const STATUS_TABS: { id: OrderStatus | 'ALL'; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'PENDING', label: 'Pending' },
  { id: 'PROCESSING', label: 'Processing' },
  { id: 'IN_TRANSIT', label: 'In transit' },
  { id: 'DELIVERED', label: 'Delivered' },
  { id: 'DISPUTED', label: 'Disputed' },
  { id: 'CANCELLED', label: 'Cancelled' },
];

export function OrdersTable({ rows }: { rows: OrderRow[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<OrderStatus | 'ALL'>('ALL');
  const [pending, setPending] = useState<OrderRow | null>(null);
  const [saving, setSaving] = useState(false);

  const countFor = (id: OrderStatus | 'ALL') =>
    id === 'ALL' ? rows.length : rows.filter((row) => row.order.status === id).length;

  const filtered = useMemo(
    () => (filter === 'ALL' ? rows : rows.filter((row) => row.order.status === filter)),
    [rows, filter],
  );

  async function confirmRelease() {
    if (!pending) return;
    setSaving(true);
    try {
      const response = await fetch('/api/escrow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: pending.heldEscrowIds,
          status: 'RELEASED',
          note: `Released from the orders queue for ${pending.order.reference}.`,
        }),
      });
      if (!response.ok) {
        const { error } = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error ?? 'Request failed');
      }
      const { moved, skipped } = (await response.json()) as { moved: string[]; skipped: { id: string; reason: string }[] };

      if (skipped.length === 0) {
        toast.success(`Released ${moved.length} escrow leg${moved.length === 1 ? '' : 's'} for ${pending.order.reference}`);
      } else if (moved.length === 0) {
        toast.error(`Nothing released — ${skipped.length} leg${skipped.length === 1 ? '' : 's'} could not move.`);
      } else {
        toast(`Released ${moved.length} of ${moved.length + skipped.length} legs for ${pending.order.reference}. ${skipped.length} could not move.`, { icon: '⚠️' });
      }

      setPending(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not release escrow');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="no-scrollbar mb-5 flex gap-2 overflow-x-auto pb-1">
        {STATUS_TABS.map((tab) => (
          <TabButton key={tab.id} label={`${tab.label} (${countFor(tab.id)})`} active={filter === tab.id} onClick={() => setFilter(tab.id)} />
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="panel">
          <EmptyState
            icon={<ShoppingCart size={20} strokeWidth={1.5} />}
            title="No orders here"
            description="Nothing matches this filter right now."
          />
        </div>
      ) : (
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table min-w-[980px]">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Items</th>
                  <th>Payment</th>
                  <th className="w-[22%]">Supplier legs</th>
                  <th>Status</th>
                  <th className="text-right">Escrow</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.order.id}>
                    <td>
                      <Link
                        href={`/admin/orders/${row.order.id}`}
                        className="font-mono text-[12.5px] font-medium text-ink transition-colors hover:text-gold-dark"
                      >
                        {row.order.reference}
                      </Link>
                      <p className="mt-0.5 text-[11px] text-muted">{shortDate(row.order.placed_at)}</p>
                    </td>
                    <td className="text-[13px] text-ink">{row.order.customer_name}</td>
                    <td>
                      <MoneyText amount={row.order.total} size="sm" />
                    </td>
                    <td className="font-mono text-[12.5px] tabular-nums text-body">{row.itemCount}</td>
                    <td>
                      <span className="rounded-full bg-ink/[0.05] px-2.5 py-1 text-[11px] font-medium text-body">
                        {PAYMENT_LABELS[row.order.payment_method] ?? row.order.payment_method}
                      </span>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {row.legs.map((leg) => (
                          <span
                            key={leg.id}
                            className="whitespace-nowrap rounded-full bg-ink/[0.05] px-2 py-0.5 text-[10.5px] font-medium text-body"
                            title={`${leg.supplierName} — ${humanise(leg.status)}`}
                          >
                            {leg.supplierName} · {humanise(leg.status)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={row.order.status} size="sm" />
                    </td>
                    <td className="text-right">
                      {row.heldEscrowIds.length > 0 ? (
                        <GoldButton
                          size="sm"
                          variant="forest"
                          icon={<Unlock size={13} strokeWidth={1.5} />}
                          onClick={() => setPending(row)}
                        >
                          Release
                        </GoldButton>
                      ) : (
                        <span className="text-[11.5px] text-muted">—</span>
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
        onConfirm={confirmRelease}
        loading={saving}
        tone="forest"
        title={pending ? `Release escrow for ${pending.order.reference}?` : ''}
        description={
          pending
            ? `${pending.heldEscrowIds.length} escrow leg${pending.heldEscrowIds.length === 1 ? '' : 's'} totalling ${new Intl.NumberFormat('en-BW', { minimumFractionDigits: 2 }).format(pending.heldEscrowTotal)} BWP will be released to the supplier(s) immediately. This cannot be reversed from here.`
            : ''
        }
        confirmLabel="Release funds"
      />
    </div>
  );
}
