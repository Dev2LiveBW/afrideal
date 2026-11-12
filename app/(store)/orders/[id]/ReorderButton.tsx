'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

import { ActionButton } from '@/components/brand/ActionButton';
import type { ReorderResult } from '@/lib/reorder';
import { useAfriDealStore } from '@/store/useAfriDealStore';

/**
 * Spec 0011, AC-11: put a delivered order back in the cart at today's prices.
 *
 * With nothing left out the buyer goes straight to the cart. When something is
 * left out they stay here until they have read which and why, because a notice
 * on the next page is one they can miss.
 */
export function ReorderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const addToCart = useAfriDealStore((state) => state.addToCart);

  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ReorderResult | null>(null);

  async function reorder() {
    setBusy(true);

    try {
      const response = await fetch(`/api/orders/${orderId}/reorder`);
      const reply = await response.json().catch(() => null);
      if (!response.ok) throw new Error(reply?.error ?? 'That did not work. Please try again.');

      const { lines, skipped } = reply as ReorderResult;
      lines.forEach((line) => addToCart(line));

      if (skipped.length === 0) {
        router.push('/cart');
        return;
      }
      setResult({ lines, skipped });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <div role="status" className="rounded-md border border-gold/40 bg-gold-wash px-4 py-3">
        <p className="text-[13px] font-semibold text-ink">
          {result.lines.length > 0 ? 'Some items could not be added' : 'None of these items can be added'}
        </p>
        <ul className="mt-1.5 space-y-0.5 text-[12.5px] leading-5 text-ink/80">
          {result.skipped.map((entry) => (
            <li key={entry.product_id}>
              {entry.name}: {entry.note}
            </li>
          ))}
        </ul>
        {result.lines.length > 0 && (
          <Link href="/cart" className="press-soft mt-2 inline-block text-[13px] font-medium text-forest hover:underline">
            Go to your cart
          </Link>
        )}
      </div>
    );
  }

  return (
    <ActionButton
      variant="ghost"
      size="md"
      className="w-full"
      disabled={busy}
      icon={<RefreshCw size={15} strokeWidth={1.5} />}
      onClick={reorder}
    >
      {busy ? 'Checking prices' : 'Reorder'}
    </ActionButton>
  );
}
