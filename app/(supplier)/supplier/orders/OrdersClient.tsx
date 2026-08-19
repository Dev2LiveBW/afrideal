'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Ban,
  CheckCircle2,
  ClipboardList,
  MapPin,
  PackageCheck,
  PackageSearch,
  Truck,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { EmptyState, Panel, PanelBody, PanelHeader } from '@/components/brand/Panel';
import { GoldButton } from '@/components/brand/GoldButton';
import { MoneyText } from '@/components/brand/MoneyText';
import { StatusBadge } from '@/components/brand/StatusBadge';
import { EscrowPanel } from '@/components/orders/EscrowPanel';
import { dateTime, humanise } from '@/lib/format';
import type { EscrowRecord, Order, OrderItem, SupplierOrder, SupplierOrderStatus } from '@/types';

/**
 * Order fulfilment list.
 *
 * Each card exposes exactly one forward action — the next step in
 * Confirm → Preparing → Ready for collection — because that's the whole
 * supplier-side flow; a runner takes it from READY_FOR_COLLECTION onward.
 * The escrow banner underneath is always read-only here: a supplier cannot
 * release or refund their own escrow.
 */

type Leg = SupplierOrder & {
  order: Order | null;
  items: OrderItem[];
  escrow: EscrowRecord | null;
};

const NEXT_ACTION: Partial<Record<SupplierOrderStatus, { status: SupplierOrderStatus; label: string }>> = {
  AWAITING_CONFIRMATION: { status: 'CONFIRMED', label: 'Confirm order' },
  CONFIRMED: { status: 'PREPARING', label: 'Start preparing' },
  PREPARING: { status: 'READY_FOR_COLLECTION', label: 'Mark ready for collection' },
};

function statusCaption(status: SupplierOrderStatus): { icon: React.ReactNode; text: string } {
  switch (status) {
    case 'READY_FOR_COLLECTION':
      return { icon: <PackageSearch size={14} strokeWidth={1.5} />, text: 'Waiting for a runner to collect.' };
    case 'COLLECTED':
      return { icon: <Truck size={14} strokeWidth={1.5} />, text: 'Collected — on its way to the customer.' };
    case 'DELIVERED':
      return { icon: <PackageCheck size={14} strokeWidth={1.5} />, text: 'Delivered to the customer.' };
    case 'CANCELLED':
      return { icon: <Ban size={14} strokeWidth={1.5} />, text: 'This order was cancelled.' };
    default:
      return { icon: <ClipboardList size={14} strokeWidth={1.5} />, text: '' };
  }
}

export function OrdersClient({ legs, supplierName }: { legs: Leg[]; supplierName: string }) {
  const router = useRouter();
  const [savingId, setSavingId] = useState<string | null>(null);

  async function advance(legId: string, nextStatus: SupplierOrderStatus) {
    setSavingId(legId);

    try {
      const response = await fetch(`/api/supplier-orders/${legId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!response.ok) {
        const { error } = await response.json().catch(() => ({ error: 'Could not update this order.' }));
        throw new Error(error ?? 'Could not update this order.');
      }

      toast.success(`Order moved to ${humanise(nextStatus)}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update this order.');
    } finally {
      setSavingId(null);
    }
  }

  if (legs.length === 0) {
    return (
      <EmptyState
        icon={<ClipboardList size={22} strokeWidth={1.5} />}
        title="No orders yet"
        description="Orders routed to you will appear here, starting from the moment they need your confirmation."
      />
    );
  }

  return (
    <div className="space-y-5">
      {legs.map((leg) => {
        const action = NEXT_ACTION[leg.status];
        const caption = statusCaption(leg.status);
        const qty = leg.items.reduce((sum, item) => sum + item.qty, 0);

        return (
          <Panel key={leg.id}>
            <PanelHeader
              title={leg.order?.reference ?? leg.id}
              description={
                leg.order
                  ? `${leg.order.customer_name} · ${leg.order.delivery_city} · placed ${dateTime(leg.created_at)}`
                  : `Placed ${dateTime(leg.created_at)}`
              }
              action={<StatusBadge status={leg.status} />}
            />
            <PanelBody className="space-y-4">
              <ul className="divide-y divide-hairline rounded border border-hairline">
                {leg.items.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 px-3.5 py-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink/[0.05] text-[15px]">
                      {item.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-ink">{item.product_name}</p>
                      <p className="truncate text-[11.5px] text-muted">
                        {item.variant_label} · qty {item.qty}
                      </p>
                    </div>
                    <MoneyText amount={item.supplier_cost * item.qty} size="sm" tone="gold" />
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-[11px] text-muted">Your subtotal</p>
                    <MoneyText amount={leg.supplier_subtotal} size="md" tone="gold" />
                  </div>
                  <div className="text-[11.5px] text-muted">
                    {qty} unit{qty === 1 ? '' : 's'}
                  </div>
                  {leg.order?.delivery_address && (
                    <p className="hidden items-center gap-1 text-[11.5px] text-muted sm:flex">
                      <MapPin size={12} strokeWidth={1.5} />
                      {leg.order.delivery_address}
                    </p>
                  )}
                </div>

                {action ? (
                  <GoldButton
                    size="sm"
                    variant="forest"
                    icon={<CheckCircle2 size={14} strokeWidth={1.5} />}
                    loading={savingId === leg.id}
                    onClick={() => advance(leg.id, action.status)}
                  >
                    {action.label}
                  </GoldButton>
                ) : (
                  caption.text && (
                    <p className="flex items-center gap-1.5 text-[12.5px] text-body">
                      {caption.icon}
                      {caption.text}
                    </p>
                  )
                )}
              </div>

              {leg.escrow ? (
                <EscrowPanel record={leg.escrow} supplierName={supplierName} canAct={false} />
              ) : (
                <p className="rounded border border-hairline bg-surface px-3.5 py-2.5 text-[12px] text-muted">
                  No escrow record for this order yet.
                </p>
              )}
            </PanelBody>
          </Panel>
        );
      })}
    </div>
  );
}
