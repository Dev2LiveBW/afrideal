'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Heart, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

import { ActionButton } from '@/components/brand/ActionButton';
import { PriceTag } from '@/components/brand/MoneyText';
import { EmptyState } from '@/components/brand/Panel';
import { Swatch } from '@/components/storefront/Swatch';
import { useSavedItems } from '@/store/useSavedItems';
import type { ProductImage } from '@/types';

export interface SavedEntry {
  product_id: string;
  name: string;
  emoji: string;
  swatch: [string, string];
  /** Today's price in pula. Null when the product is no longer sold. */
  price: number | null;
  image?: ProductImage;
}

export function SavedList({ entries }: { entries: SavedEntry[] }) {
  const router = useRouter();
  const setSaved = useSavedItems((state) => state.setSaved);
  const [removing, setRemoving] = useState<string | null>(null);

  async function remove(entry: SavedEntry) {
    setRemoving(entry.product_id);
    const response = await fetch(`/api/saved-items/${entry.product_id}`, { method: 'DELETE' }).catch(() => null);
    setRemoving(null);

    if (!response?.ok) {
      toast.error('That did not save. Please try again.');
      return;
    }

    setSaved(entry.product_id, false);
    router.refresh();
  }

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={<Heart size={22} strokeWidth={1.5} />}
        title="Nothing saved yet"
        description="Tap the heart on anything you want to come back to."
        action={
          <Link href="/browse">
            <ActionButton size="md" withArrow>
              Browse products
            </ActionButton>
          </Link>
        }
        className="mt-6 rounded-md border border-hairline bg-surface-raised"
      />
    );
  }

  return (
    <ul className="mt-6 divide-y divide-hairline rounded-md border border-hairline bg-surface-raised">
      {entries.map((entry) => (
        <li key={entry.product_id} aria-label={entry.name} className="flex items-center gap-4 px-4 py-3">
          <Swatch
            image={entry.image}
            fallback={entry.swatch}
            emoji={entry.emoji}
            className="h-14 w-14 shrink-0 rounded"
            glyphClassName="text-[20px] bottom-1 right-1.5"
          />

          <div className="min-w-0 flex-1">
            {entry.price === null ? (
              <>
                <p className="truncate text-[14px] font-medium text-muted">{entry.name}</p>
                <p className="mt-0.5 text-[12.5px] text-muted">No longer available</p>
              </>
            ) : (
              <>
                <Link
                  href={`/products/${entry.product_id}`}
                  className="block truncate text-[14px] font-medium text-ink transition-colors hover:text-forest"
                >
                  {entry.name}
                </Link>
                <PriceTag amount={entry.price} size="sm" tone="ink" className="mt-0.5" />
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => remove(entry)}
            disabled={removing !== null}
            aria-label={`Remove ${entry.name}`}
            className="press-soft flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-ink/[0.04] hover:text-danger-ink disabled:opacity-50"
          >
            <Trash2 size={15} strokeWidth={1.5} />
          </button>
        </li>
      ))}
    </ul>
  );
}
