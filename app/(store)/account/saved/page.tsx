import type { Metadata } from 'next';
import Link from 'next/link';
import { LogIn } from 'lucide-react';

import { ActionButton } from '@/components/brand/ActionButton';
import { EmptyState } from '@/components/brand/Panel';
import { AccountSidebar } from '@/components/storefront/AccountPanels';
import { auth } from '@/lib/auth';
import { readAll } from '@/lib/db';
import { savedNewestFirst } from '@/lib/saved-items';

import { SavedList, type SavedEntry } from './SavedList';

export const metadata: Metadata = { title: 'Saved items' };
export const dynamic = 'force-dynamic';

export default async function SavedItemsPage() {
  const session = await auth();

  if (!session?.user) {
    return (
      <div className="mx-auto max-w-market px-6 pb-24 pt-28">
        <EmptyState
          icon={<LogIn size={22} strokeWidth={1.5} />}
          title="Sign in to see your saved items"
          description="Keep the things you want to come back to, on any device."
          action={
            <Link href="/sign-in">
              <ActionButton size="md" withArrow>
                Sign in
              </ActionButton>
            </Link>
          }
          className="rounded-md border border-hairline bg-surface-raised"
        />
      </div>
    );
  }

  const [rows, products, images] = await Promise.all([
    readAll('saved-items'),
    readAll('products'),
    readAll('product-images'),
  ]);

  // Spec 0011, AC-16: today's catalogue, never a figure kept from the day it was saved.
  const entries = savedNewestFirst(rows.filter((row) => row.user_id === session.user.id)).map<SavedEntry>((row) => {
    const product = products.find((entry) => entry.id === row.product_id);
    return {
      product_id: row.product_id,
      name: product?.name ?? 'An item we no longer sell',
      emoji: product?.emoji ?? '📦',
      swatch: product?.swatch ?? ['#2a2a2a', '#111111'],
      price: product?.status === 'ACTIVE' ? product.price : null,
      image: images.find((image) => image.product_id === row.product_id && image.sort_order === 0),
    };
  });

  return (
    <div className="mx-auto max-w-market px-4 pb-24 pt-20 sm:px-6 sm:pt-28">
      <div className="flex flex-col gap-10 lg:flex-row lg:gap-12">
        <AccountSidebar
          name={session.user.name ?? 'You'}
          avatar={session.user.avatar}
          active="Saved items"
        />

        <div className="min-w-0 flex-1">
          <h1 className="font-display text-headline-lg font-semibold text-ink">Saved items</h1>
          <p className="measure mt-2 text-[14px] leading-6 text-body">
            The things you want to come back to, at today&apos;s price.
          </p>

          <SavedList entries={entries} />
        </div>
      </div>
    </div>
  );
}
