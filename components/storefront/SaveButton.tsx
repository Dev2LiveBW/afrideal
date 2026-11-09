'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Heart } from 'lucide-react';
import toast from 'react-hot-toast';

import { useSession } from '@/lib/use-session';
import { cn } from '@/lib/utils';
import { useSavedItems } from '@/store/useSavedItems';

/**
 * The heart (spec 0011, AC-14 and AC-15), on every card and the product page.
 *
 * A guest goes to sign in and comes back to this page, and nothing is saved until
 * they tap again: saving on their behalf after sign in would be a surprise in
 * their list. Sits inside the card's link, so a tap must not follow it.
 */
export function SaveButton({
  productId,
  productName,
  size = 13,
  className,
}: {
  productId: string;
  productName: string;
  size?: number;
  className?: string;
}) {
  const router = useRouter();
  const { data, status } = useSession();
  const load = useSavedItems((state) => state.load);
  const setSaved = useSavedItems((state) => state.setSaved);
  const saved = useSavedItems((state) => state.ids.includes(productId));

  const buyer = data?.user.role === 'CUSTOMER' ? data.user.email : null;

  useEffect(() => {
    if (buyer) void load(buyer);
  }, [buyer, load]);

  async function toggle(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    if (status === 'loading') return;

    if (status === 'unauthenticated') {
      const here = `${window.location.pathname}${window.location.search}`;
      router.push(`/sign-in?redirect_url=${encodeURIComponent(here)}`);
      return;
    }

    if (!buyer) {
      toast('Saved items are for buyer accounts.');
      return;
    }

    const next = !saved;
    setSaved(productId, next);

    const response = next
      ? await fetch('/api/saved-items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ product_id: productId }),
        }).catch(() => null)
      : await fetch(`/api/saved-items/${productId}`, { method: 'DELETE' }).catch(() => null);

    if (!response?.ok) {
      setSaved(productId, !next);
      const reply = await response?.json().catch(() => null);
      toast.error(reply?.error ?? 'That did not save. Please try again.');
      return;
    }

    toast.success(next ? `Saved ${productName} for later` : `Removed ${productName} from your list`);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={saved ? `Remove ${productName} from your list` : `Save ${productName} for later`}
      aria-pressed={saved}
      className={cn('press-soft', className)}
    >
      <Heart size={size} strokeWidth={1.75} className={saved ? 'fill-danger text-danger' : 'text-body'} />
    </button>
  );
}
