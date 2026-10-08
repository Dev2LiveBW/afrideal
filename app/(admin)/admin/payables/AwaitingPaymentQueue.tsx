'use client';

import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { Landmark } from 'lucide-react';
import toast from 'react-hot-toast';

import { ActionButton } from '@/components/brand/ActionButton';
import { ConfirmDialog } from '@/components/brand/ConfirmDialog';
import { MoneyText } from '@/components/brand/MoneyText';
import { PAYMENT_LABELS } from '@/lib/format';
import type { Order } from '@/types';

/**
 * Orders waiting on a bank transfer, and the control that confirms one (spec 0003).
 *
 * This lives beside the supplier payables rather than on the order screen because a
 * finance admin cannot reach `/admin/orders/[id]` at all: `FINANCE_ALLOWED_PREFIXES`
 * is analytics, payables and settlements. It is also the screen someone reconciling a
 * bank statement actually wants, since it lists exactly the orders whose money has
 * not arrived yet.
 */
export type AwaitingRow = {
  order: Order;
  /** Pre-formatted on the server so the table needs no date arithmetic. */
  waitingFor: string;
  /** A bank transfer whose payment window closed. Marking it paid reopens it. */
  late: boolean;
};

export function AwaitingPaymentQueue({
  rows,
  canConfirm,
}: {
  rows: AwaitingRow[];
  canConfirm: boolean;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState<AwaitingRow | null>(null);
  const [reference, setReference] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const referenceId = useId();
  const amountId = useId();
  const noteId = useId();

  function close() {
    setConfirming(null);
    setReference('');
    setAmount('');
    setNote('');
  }

  async function markPaid() {
    if (!confirming) return;

    // Guarded here rather than by disabling the confirm button, because
    // ConfirmDialog does not take a disabled state and inventing one would mean
    // changing a component five other screens rely on.
    if (reference.trim() === '') {
      toast.error('Enter the bank reference from the statement first.');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`/api/orders/${confirming.order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'MARK_PAID',
          reference: reference.trim(),
          // Omitted when blank so the server defaults it to the order total,
          // rather than reading an empty field as zero.
          ...(amount.trim() === '' ? {} : { amount: Number(amount) }),
          ...(note.trim() === '' ? {} : { paid_note: note.trim() }),
        }),
      });

      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error ?? 'Could not mark that order paid.');

      // Said plainly, because an underpayment that reads as a clean success is how
      // a shortfall goes unchased.
      toast.success(
        body?.amount_matches === false
          ? 'Marked paid, but the amount does not match the order total. Flagged for follow up.'
          : body?.late
            ? 'Marked paid and the order reopened. The supplier has been asked to confirm.'
            : 'Marked paid. The supplier has been asked to confirm.',
      );

      close();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not mark that order paid.');
    } finally {
      setSaving(false);
    }
  }

  if (rows.length === 0) {
    return (
      <p className="px-4 py-6 text-[12.5px] text-muted">
        No orders are waiting for payment. A bank transfer shows up here as soon as a buyer
        places one.
      </p>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="data-table min-w-[760px]">
          <caption className="sr-only">
            Orders waiting for payment, with the reference each buyer was asked to quote
          </caption>
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Method</th>
              <th>Expected</th>
              <th>Waiting</th>
              {canConfirm && <th>Action</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const { order, waitingFor, late } = row;
              return (
                <tr key={order.id}>
                  <td className="font-mono text-[12.5px] text-ink">{order.reference}</td>
                  <td className="text-ink">{order.customer_name}</td>
                  <td className="text-[12.5px] text-muted">
                    {PAYMENT_LABELS[order.payment_method] ?? order.payment_method}
                  </td>
                  <td>
                    <MoneyText amount={order.total} size="sm" tone="ink" />
                  </td>
                  <td className="text-[12.5px] text-muted">
                    {waitingFor}
                    {late && (
                      <span className="ml-2 rounded-full bg-gold-50 px-2 py-0.5 text-[11px] font-medium text-gold-700">
                        Window closed
                      </span>
                    )}
                  </td>
                  {canConfirm && (
                    <td>
                      <ActionButton
                        size="sm"
                        variant="ghost"
                        onClick={() => setConfirming(row)}
                        icon={<Landmark size={14} strokeWidth={1.5} />}
                      >
                        Mark paid
                      </ActionButton>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={confirming !== null}
        onClose={close}
        onConfirm={markPaid}
        loading={saving}
        title={`Mark ${confirming?.order.reference ?? ''} as paid`}
        description={
          confirming
            ? `Confirms that ${confirming.order.customer_name}'s transfer has landed. The supplier will be asked to prepare the goods and a procurement invoice will be raised. This is the same path the card gateway uses.${confirming.late ? ' The payment window for this order has closed, so marking it paid reopens it and records the payment as late.' : ''}`
            : ''
        }
        confirmLabel="Mark paid"
      >
        <div className="space-y-3">
          <div>
            <label htmlFor={referenceId} className="mb-1.5 block text-[11.5px] font-medium text-muted">
              Bank reference (required)
            </label>
            <input
              id={referenceId}
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="As it appears on the statement"
              className="w-full rounded border border-hairline-strong bg-surface px-3 py-2 font-mono text-[13px] text-ink outline-none focus:border-gold"
            />
          </div>

          <div>
            <label htmlFor={amountId} className="mb-1.5 block text-[11.5px] font-medium text-muted">
              Amount received, in Pula (optional)
            </label>
            <input
              id={amountId}
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder={confirming ? String(confirming.order.total) : ''}
              aria-describedby={`${amountId}-hint`}
              className="w-full rounded border border-hairline-strong bg-surface px-3 py-2 font-mono text-[13px] tabular-nums text-ink outline-none focus:border-gold"
            />
            <p id={`${amountId}-hint`} className="mt-1 text-[11px] text-muted">
              Leave blank if the full amount arrived. A different figure is recorded and
              flagged, never refused.
            </p>
          </div>

          <div>
            <label htmlFor={noteId} className="mb-1.5 block text-[11.5px] font-medium text-muted">
              Note (optional)
            </label>
            <textarea
              id={noteId}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={2}
              placeholder="Anything the next person should know"
              className="w-full resize-y rounded border border-hairline-strong bg-surface px-3 py-2 text-[13px] text-ink outline-none focus:border-gold"
            />
          </div>
        </div>
      </ConfirmDialog>
    </>
  );
}
