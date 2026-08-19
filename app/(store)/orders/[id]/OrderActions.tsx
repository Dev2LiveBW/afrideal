'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CheckCircle2, MessageSquareWarning } from 'lucide-react';
import toast from 'react-hot-toast';

import { ConfirmDialog } from '@/components/brand/ConfirmDialog';
import { GoldButton } from '@/components/brand/GoldButton';
import { bwp } from '@/lib/format';
import { cn } from '@/lib/utils';

const REASONS = [
  'Item not as described',
  'Short delivery',
  'Damaged on arrival',
  'Never arrived',
  'Wrong item sent',
];

export function OrderActions({
  orderId,
  reference,
  heldAmount,
  canConfirm,
  canDispute,
}: {
  orderId: string;
  reference: string;
  heldAmount: number;
  canConfirm: boolean;
  canDispute: boolean;
}) {
  const router = useRouter();

  const [dialog, setDialog] = useState<'confirm' | 'dispute' | null>(null);
  const [saving, setSaving] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [detail, setDetail] = useState('');

  async function send(body: Record<string, unknown>, success: string) {
    setSaving(true);

    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? 'That did not work.');

      toast.success(success);
      setDialog(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  if (!canConfirm && !canDispute) return null;

  return (
    <>
      <div className="space-y-2">
        {canConfirm && (
          <GoldButton
            variant="forest"
            size="md"
            className="w-full"
            icon={<CheckCircle2 size={15} strokeWidth={1.5} />}
            onClick={() => setDialog('confirm')}
          >
            Confirm delivery
          </GoldButton>
        )}

        {canDispute && (
          <GoldButton
            variant="ghost"
            size="md"
            className="w-full"
            icon={<MessageSquareWarning size={15} strokeWidth={1.5} />}
            onClick={() => setDialog('dispute')}
          >
            Report a problem
          </GoldButton>
        )}
      </div>

      <ConfirmDialog
        open={dialog === 'confirm'}
        onClose={() => setDialog(null)}
        onConfirm={() => send({ action: 'CONFIRM_DELIVERY' }, 'Delivery confirmed')}
        loading={saving}
        tone="forest"
        title="Confirm this order arrived?"
        description={`This releases ${bwp(heldAmount)} from escrow to the supplier for ${reference}. Only confirm once you have the goods and they are what you ordered, because a release cannot be undone from here.`}
        confirmLabel="Yes, release the payment"
      />

      <ConfirmDialog
        open={dialog === 'dispute'}
        onClose={() => setDialog(null)}
        onConfirm={() => send({ action: 'RAISE_DISPUTE', reason, detail }, 'Dispute raised')}
        loading={saving}
        tone="danger"
        title="Report a problem with this order"
        description={`This freezes ${bwp(heldAmount)} in escrow so the supplier cannot be paid while we look into it. Our team responds within five days.`}
        confirmLabel="Raise dispute"
      >
        <div className="space-y-3">
          <div>
            <label htmlFor="reason" className="mb-1.5 block text-[12.5px] font-medium text-ink">
              What went wrong
            </label>
            <select
              id="reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="w-full rounded border border-hairline-strong bg-surface px-3 py-2.5 text-[13.5px] text-ink outline-none focus:border-gold/60"
            >
              {REASONS.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="detail" className="mb-1.5 block text-[12.5px] font-medium text-ink">
              Anything else that would help <span className="text-muted">(optional)</span>
            </label>
            <textarea
              id="detail"
              rows={3}
              value={detail}
              onChange={(event) => setDetail(event.target.value)}
              placeholder="Four sheets arrived instead of six."
              className={cn(
                'w-full resize-none rounded border border-hairline-strong bg-surface px-3 py-2.5',
                'text-[13.5px] text-ink outline-none placeholder:text-muted focus:border-gold/60',
              )}
            />
          </div>
        </div>
      </ConfirmDialog>
    </>
  );
}
