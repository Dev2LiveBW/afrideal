'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import toast from 'react-hot-toast';

import { ConfirmDialog } from '@/components/brand/ConfirmDialog';
import { GoldButton } from '@/components/brand/GoldButton';
import { bwp } from '@/lib/format';
import type { RunnerRequest } from '@/types';

/**
 * The two decisions a buyer actually makes on a sourcing request: approve the
 * price a runner found, and confirm the goods arrived. Both are behind a
 * confirmation that names the figure, because approving is the moment the buyer
 * takes on the cost.
 */
export function RequestActions({ request }: { request: RunnerRequest }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<'approve' | 'confirm' | 'cancel' | null>(null);
  const [saving, setSaving] = useState(false);

  const canApprove = request.status === 'QUOTED' && request.quote != null;
  const canConfirm = request.status === 'DELIVERING';
  const canCancel = !['CONFIRMED', 'CANCELLED'].includes(request.status);

  async function send(status: string, success: string) {
    setSaving(true);

    try {
      const response = await fetch(`/api/runner-requests/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
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

  if (!canApprove && !canConfirm && !canCancel) return null;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {canApprove && (
          <GoldButton
            size="sm"
            variant="gold"
            icon={<CheckCircle2 size={14} strokeWidth={1.5} />}
            onClick={() => setDialog('approve')}
          >
            Approve the price
          </GoldButton>
        )}

        {canConfirm && (
          <GoldButton
            size="sm"
            variant="forest"
            icon={<CheckCircle2 size={14} strokeWidth={1.5} />}
            onClick={() => setDialog('confirm')}
          >
            It arrived
          </GoldButton>
        )}

        {canCancel && (
          <GoldButton
            size="sm"
            variant="ghost"
            icon={<X size={14} strokeWidth={1.5} />}
            onClick={() => setDialog('cancel')}
          >
            Cancel request
          </GoldButton>
        )}
      </div>

      <ConfirmDialog
        open={dialog === 'approve'}
        onClose={() => setDialog(null)}
        onConfirm={() => send('APPROVED', 'Approved. Your runner is buying it now')}
        loading={saving}
        tone="forest"
        title="Approve this purchase?"
        description={
          request.quote
            ? `${request.runner_name ?? 'Your runner'} will buy ${request.quantity} × ${request.item} and deliver it to you. You will be charged ${bwp(request.quote.total)}, which includes the sourcing fee. This is the point where the cost becomes yours.`
            : ''
        }
        confirmLabel="Yes, buy it"
      />

      <ConfirmDialog
        open={dialog === 'confirm'}
        onClose={() => setDialog(null)}
        onConfirm={() => send('CONFIRMED', 'Request closed')}
        loading={saving}
        tone="forest"
        title="Confirm this arrived?"
        description={`This closes ${request.reference}. Only confirm once you have the goods and they are what was agreed.`}
        confirmLabel="Yes, it arrived"
      />

      <ConfirmDialog
        open={dialog === 'cancel'}
        onClose={() => setDialog(null)}
        onConfirm={() => send('CANCELLED', 'Request cancelled')}
        loading={saving}
        tone="danger"
        title="Cancel this request?"
        description={
          request.status === 'APPROVED' || request.status === 'DELIVERING'
            ? `${request.runner_name ?? 'Your runner'} may already have bought this. Cancelling now means we will have to sort the purchase out with them, so tell us why when we call.`
            : 'Nothing has been bought and nothing will be charged. You can always send the request again later.'
        }
        confirmLabel="Cancel the request"
      />
    </>
  );
}
