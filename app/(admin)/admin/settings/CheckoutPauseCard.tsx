'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { PauseCircle, PlayCircle } from 'lucide-react';
import toast from 'react-hot-toast';

import { ActionButton } from '@/components/brand/ActionButton';
import { ConfirmDialog } from '@/components/brand/ConfirmDialog';
import { Panel, PanelBody, PanelHeader } from '@/components/brand/Panel';
import { cn } from '@/lib/utils';

/**
 * Stop the storefront taking money, without a deploy (spec 0003, AC-8).
 *
 * Sits apart from the settings form below it because this switch is real: it
 * writes to the settings store and takes effect on the very next checkout. The
 * form's other controls do not persist yet, and a live switch sitting among
 * decorative ones would be a dangerous thing to confuse.
 *
 * Super admin only, which the page already enforces. Pausing stops revenue, so it
 * is not an operations or finance decision.
 */
export function CheckoutPauseCard({ paused }: { paused: boolean }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  async function setPaused(next: boolean) {
    setSaving(true);

    try {
      const response = await fetch('/api/settings/checkout', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paused: next }),
      });

      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error ?? 'Could not change that setting.');

      toast.success(
        next
          ? 'Checkout is paused. No new orders can be placed.'
          : 'Checkout is open again. Orders can be placed.',
      );

      setConfirming(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not change that setting.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Panel className={cn('mb-5', paused && 'border-danger/40')}>
        <PanelHeader
          title="Checkout"
          description="Stops the storefront accepting new orders. Takes effect on the next request, with no deploy."
        />
        <PanelBody>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className={cn('inline-block h-2 w-2 rounded-full', paused ? 'bg-danger' : 'bg-forest')}
              />
              <p className="text-[13px] text-ink">
                {paused ? (
                  <>
                    Checkout is <strong className="font-semibold text-danger-ink">paused</strong>.
                    Buyers are told it is temporarily unavailable.
                  </>
                ) : (
                  <>
                    Checkout is <strong className="font-semibold text-forest-ink">open</strong>.
                    Buyers can place orders normally.
                  </>
                )}
              </p>
            </div>

            {paused ? (
              <ActionButton
                variant="forest"
                loading={saving}
                onClick={() => setPaused(false)}
                icon={<PlayCircle size={15} strokeWidth={1.5} />}
              >
                Resume checkout
              </ActionButton>
            ) : (
              <ActionButton
                variant="danger"
                loading={saving}
                onClick={() => setConfirming(true)}
                icon={<PauseCircle size={15} strokeWidth={1.5} />}
              >
                Pause checkout
              </ActionButton>
            )}
          </div>
        </PanelBody>
      </Panel>

      {/* Only pausing is confirmed. Resuming is the safe direction, and a dialog in
          front of it would slow down ending an incident. */}
      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => setPaused(true)}
        loading={saving}
        tone="danger"
        title="Pause checkout storewide?"
        description="Every buyer is refused at checkout until you resume. Orders already waiting for payment can still be paid for, and nothing already placed is affected. This is recorded against your name."
        confirmLabel="Pause checkout"
      />
    </>
  );
}
