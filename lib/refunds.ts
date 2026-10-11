import 'server-only';

import { findById, insert, nextId, readAll, update } from '@/lib/db';
import { applyTransition } from '@/lib/payables';
import { EVENTS, audit, notify } from '@/lib/notifications';
import type { Order, SupplierPayable } from '@/types';

export interface ExecuteRefundInput {
  orderId: string;
  amount?: number;
  gatewayReference?: string;
  reason?: string;
  actor: {
    id: string;
    name: string;
    role: string;
  };
}

export interface RefundResult {
  ok: boolean;
  order?: Order | null;
  payablesAdjusted?: string[];
  creditNotesCreated?: string[];
  reason?: string;
}

/**
 * Execute a customer refund on an order.
 *
 * Merchants of record flow:
 * 1. Order status moves to REFUNDED, recording amount and gateway reference.
 * 2. Supplier payables are reversed:
 *    - PENDING / ON_HOLD payables are transitioned to CANCELLED.
 *    - SETTLED payables remain intact (financial history is immutable); instead,
 *      a supplier credit note payable (negative amount, PENDING) is issued against
 *      their next settlement payout.
 * 3. Any active dispute on the order is marked RESOLVED_CUSTOMER.
 * 4. Immutable audit log entry (EVENTS.REFUND_ISSUED) is recorded.
 * 5. Notifications are sent to customer and supplier.
 */
export async function executeRefund(input: ExecuteRefundInput): Promise<RefundResult> {
  const order = await findById('orders', input.orderId);
  if (!order) {
    return { ok: false, reason: 'Order not found.' };
  }

  if (order.status === 'REFUNDED') {
    return { ok: false, reason: 'This order has already been refunded.' };
  }

  const now = new Date().toISOString();
  const refundAmount = input.amount != null && input.amount > 0 ? input.amount : order.total;
  const gatewayRef =
    input.gatewayReference && input.gatewayReference.trim().length > 0
      ? input.gatewayReference.trim()
      : `REF-${Math.floor(100000 + Math.random() * 900000)}`;
  const refundReason = input.reason?.trim() || 'Dispute resolved in customer favour';

  // 1. Supplier payables adjustment
  const allPayables = await readAll('supplier-payables');
  const orderPayables = allPayables.filter((p) => p.order_id === order.id);

  const payablesAdjusted: string[] = [];
  const creditNotesCreated: string[] = [];

  for (const payable of orderPayables) {
    if (payable.status === 'PENDING' || payable.status === 'ON_HOLD') {
      const updated = applyTransition(
        payable,
        'CANCELLED',
        input.actor.name,
        `Order refunded (${refundReason}). Supplier invoice cancelled.`,
      );
      await update('supplier-payables', payable.id, updated);
      payablesAdjusted.push(payable.id);
    } else if (payable.status === 'SETTLED') {
      // Settled invoices are immutable: issue a supplier credit note payable
      const creditNote: SupplierPayable = {
        id: await nextId('supplier-payables', 'pay'),
        order_id: order.id,
        supplier_order_id: payable.supplier_order_id,
        supplier_id: payable.supplier_id,
        amount: -payable.amount,
        status: 'PENDING',
        gateway: payable.gateway,
        raised_at: now,
        settled_at: null,
        cancelled_at: null,
        terms_days: payable.terms_days,
        credit_note_for_payable_id: payable.id,
        reason: 'REFUND_CREDIT_NOTE',
        history: [
          {
            from: null,
            to: 'PENDING',
            at: now,
            actor: input.actor.name,
            note: `Credit note issued for refunded order ${order.reference}. Offset against next payout.`,
          },
        ],
      };
      await insert('supplier-payables', creditNote);
      creditNotesCreated.push(creditNote.id);
    }
  }

  // 2. Active dispute resolution
  const allDisputes = await readAll('disputes');
  const activeDisputes = allDisputes.filter(
    (d) => d.order_id === order.id && !d.status.startsWith('RESOLVED'),
  );
  for (const dispute of activeDisputes) {
    await update('disputes', dispute.id, {
      status: 'RESOLVED_CUSTOMER',
      resolved_at: now,
      resolution_note: `Refund issued to customer: BWP ${refundAmount.toFixed(2)} (Ref: ${gatewayRef}).`,
    });
  }

  // 3. Update order
  const updatedOrder = await update('orders', order.id, {
    status: 'REFUNDED',
    refund_amount: refundAmount,
    refund_reference: gatewayRef,
    refund_reason: refundReason,
    refunded_at: now,
    updated_at: now,
    timeline: [
      ...order.timeline,
      {
        status: 'REFUNDED',
        label: 'Order refunded',
        at: now,
        note: `BWP ${refundAmount.toFixed(2)} refunded. Gateway ref: ${gatewayRef}. Reason: ${refundReason}`,
        actor: input.actor.name,
      },
    ],
  });

  // 4. Audit log
  await audit({
    actorId: input.actor.id,
    actorName: input.actor.name,
    action: EVENTS.REFUND_ISSUED,
    entity: 'order',
    entityId: order.id,
    detail: `Refunded BWP ${refundAmount.toFixed(2)} for ${order.reference}. Gateway: ${gatewayRef}. Reason: ${refundReason}`,
  });

  // 5. Notifications
  await notify({
    userId: order.customer_id,
    title: 'Refund processed',
    body: `A refund of BWP ${refundAmount.toFixed(2)} has been processed for order ${order.reference}. Reference: ${gatewayRef}.`,
    kind: 'DISPUTE',
  });

  const users = await readAll('users');
  for (const payable of orderPayables) {
    const supplierUser = users.find((u) => u.supplier_id === payable.supplier_id);
    if (supplierUser) {
      await notify({
        userId: supplierUser.id,
        title: 'Order refunded',
        body: `Order ${order.reference} was refunded. Settlement ledger adjusted.`,
        kind: 'PAYMENT',
      });
    }
  }

  return {
    ok: true,
    order: updatedOrder,
    payablesAdjusted,
    creditNotesCreated,
  };
}
