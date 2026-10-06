'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

import { ActionButton } from '@/components/brand/ActionButton';

/**
 * Try paying for this order again (spec 0003, AC-10).
 *
 * A declined card should not cost a buyer their basket. This opens a fresh attempt
 * against the same order, which is why the order survives a failed payment rather
 * than being cancelled by it.
 */
export function RetryPaymentButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [working, setWorking] = useState(false);

  async function retry() {
    setWorking(true);

    try {
      const response = await fetch(`/api/orders/${orderId}/payments`, { method: 'POST' });
      const body = await response.json().catch(() => null);

      if (!response.ok) throw new Error(body?.error ?? 'We could not start another payment.');

      // Once a hosted gateway page exists the adapter fills this in and the buyer
      // goes straight there. Until then there is nowhere to send them, so say what
      // happened rather than appearing to do nothing.
      if (body?.payment?.redirect_url) {
        window.location.assign(body.payment.redirect_url);
        return;
      }

      toast.success('A new payment attempt is open for this order.');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'We could not start another payment.');
    } finally {
      setWorking(false);
    }
  }

  return (
    <ActionButton
      size="sm"
      variant="forest"
      loading={working}
      onClick={retry}
      icon={<RefreshCw size={14} strokeWidth={1.5} />}
    >
      Try paying again
    </ActionButton>
  );
}
