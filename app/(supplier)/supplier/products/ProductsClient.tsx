'use client';

import { useId, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Clock, Package, PackagePlus, Plus, Timer } from 'lucide-react';
import toast from 'react-hot-toast';

import { ConfirmDialog } from '@/components/brand/ConfirmDialog';
import { EmptyState } from '@/components/brand/Panel';
import { GoldButton } from '@/components/brand/GoldButton';
import { MoneyText } from '@/components/brand/MoneyText';
import { StatusBadge } from '@/components/brand/StatusBadge';
import { cn } from '@/lib/utils';
import { shortDate } from '@/lib/format';
import type { Category, Product, SupplierOffer } from '@/types';

/**
 * Product grid + "Add product" flow.
 *
 * There is no create-product endpoint in this MVP, so submitting the form
 * never writes anywhere — it simulates the real queue-for-review behaviour
 * with a delay and an honest toast, and says so again in the dialog body.
 */

type Row = { offer: SupplierOffer; product: Product; category: Category | null };

const schema = z.object({
  name: z.string().min(3, 'Enter a product name of at least 3 characters.'),
  category_id: z.string().min(1, 'Choose a category.'),
  short_description: z.string().min(10, 'Add a short description (10+ characters).'),
  unit_cost: z.coerce.number().positive('Enter what you charge AfriDeal per unit.'),
  stock: z.coerce.number().int('Whole units only.').nonnegative('Enter available stock.'),
  fulfilment_days: z.coerce.number().int('Whole days only.').positive('Enter your lead time in days.'),
  moq: z.coerce.number().int('Whole units only.').positive('Enter a minimum order quantity.'),
});

type FormValues = z.infer<typeof schema>;

function stockTone(stock: number): string {
  if (stock <= 10) return 'text-danger-ink';
  if (stock <= 50) return 'text-gold-700';
  return 'text-ink';
}

export function ProductsClient({ rows, categories }: { rows: Row[]; categories: Category[] }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const formId = useId();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      category_id: categories[0]?.id ?? '',
      short_description: '',
      unit_cost: undefined,
      stock: undefined,
      fulfilment_days: undefined,
      moq: undefined,
    },
  });

  async function handleConfirm() {
    const valid = await form.trigger();
    if (!valid) return;

    setSubmitting(true);
    const values = form.getValues();

    // No create-product endpoint exists yet — simulate the review queue.
    await new Promise((resolve) => setTimeout(resolve, 850));

    toast.success(`"${values.name}" submitted for admin review`, {
      icon: '🕓',
      duration: 5000,
    });

    setSubmitting(false);
    setDialogOpen(false);
    form.reset();
  }

  const addButton = (
    <GoldButton size="sm" icon={<Plus size={14} strokeWidth={1.5} />} onClick={() => setDialogOpen(true)}>
      Add product
    </GoldButton>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <p className="text-[13px] text-body">
          <span className="font-medium text-ink">{rows.length}</span> listing{rows.length === 1 ? '' : 's'} across
          your catalogue
        </p>
        {rows.length > 0 && addButton}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Package size={22} strokeWidth={1.5} />}
          title="No products listed yet"
          description="Products you supply to AfriDeal will appear here with their stock, lead time and pricing."
          action={addButton}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map(({ offer, product, category }) => (
            <article
              key={offer.id}
              className="flex flex-col overflow-hidden rounded-md border border-hairline bg-surface-raised shadow-card"
            >
              <div className="flex items-start gap-3 border-b border-hairline p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink/[0.05] text-[19px]">
                  {product.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold text-ink">{product.name}</p>
                  <p className="mt-0.5 truncate text-[11.5px] text-muted">
                    {category ? `${category.emoji} ${category.name}` : 'Uncategorised'}
                  </p>
                </div>
                <StatusBadge status={product.status} size="sm" />
              </div>

              <div className="grid grid-cols-2 gap-px bg-hairline">
                <div className="bg-surface-raised p-3.5">
                  <p className="text-[10.5px] uppercase tracking-[0.08em] text-muted">Stock</p>
                  <p className={cn('mt-1 font-mono text-[14px] font-medium tabular-nums', stockTone(offer.stock))}>
                    {offer.stock.toLocaleString('en-GB')} units
                  </p>
                </div>
                <div className="bg-surface-raised p-3.5">
                  <p className="flex items-center gap-1 text-[10.5px] uppercase tracking-[0.08em] text-muted">
                    <Clock size={10} strokeWidth={1.5} /> Lead time
                  </p>
                  <p className="mt-1 font-mono text-[14px] font-medium tabular-nums text-ink">
                    {offer.fulfilment_days}d
                  </p>
                </div>
                <div className="bg-surface-raised p-3.5">
                  <p className="text-[10.5px] uppercase tracking-[0.08em] text-muted">Your unit cost</p>
                  <MoneyText amount={offer.supplier_cost} size="sm" tone="gold" className="mt-1 block" />
                </div>
                <div className="bg-surface-raised p-3.5">
                  <p className="text-[10.5px] uppercase tracking-[0.08em] text-muted">AfriDeal price</p>
                  <MoneyText amount={product.price} size="sm" tone="muted" className="mt-1 block" />
                </div>
              </div>

              <div className="mt-auto flex items-center justify-between border-t border-hairline px-4 py-2.5 text-[11px] text-muted">
                <span>MOQ {offer.moq}</span>
                <span>Updated {shortDate(offer.last_updated)}</span>
              </div>
            </article>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          form.reset();
        }}
        onConfirm={handleConfirm}
        loading={submitting}
        title="Add a new product"
        description="New listings are queued for admin review before they go live — this is a preview build, so nothing is created yet."
        confirmLabel="Submit for review"
        tone="gold"
      >
        <form id={formId} className="space-y-3.5" onSubmit={(event) => event.preventDefault()}>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="mb-1 block text-[12px] font-medium text-body" htmlFor={`${formId}-name`}>
                Product name
              </label>
              <input
                id={`${formId}-name`}
                type="text"
                placeholder="e.g. Cocoa Butter Hand Cream 250ml"
                className="w-full rounded-md border border-hairline-strong bg-surface px-3 py-2 text-[13.5px] text-ink outline-none transition-colors placeholder:text-muted focus:border-gold focus:ring-2 focus:ring-gold/20"
                {...form.register('name')}
              />
              {form.formState.errors.name && (
                <p className="mt-1 text-[11.5px] text-danger-ink">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="col-span-2">
              <label className="mb-1 block text-[12px] font-medium text-body" htmlFor={`${formId}-category`}>
                Category
              </label>
              <select
                id={`${formId}-category`}
                className="w-full rounded-md border border-hairline-strong bg-surface px-3 py-2 text-[13.5px] text-ink outline-none transition-colors focus:border-gold focus:ring-2 focus:ring-gold/20"
                {...form.register('category_id')}
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.emoji} {category.name}
                  </option>
                ))}
              </select>
              {form.formState.errors.category_id && (
                <p className="mt-1 text-[11.5px] text-danger-ink">{form.formState.errors.category_id.message}</p>
              )}
            </div>

            <div className="col-span-2">
              <label className="mb-1 block text-[12px] font-medium text-body" htmlFor={`${formId}-desc`}>
                Short description
              </label>
              <textarea
                id={`${formId}-desc`}
                rows={2}
                placeholder="One line a buyer would understand at a glance"
                className="w-full resize-none rounded-md border border-hairline-strong bg-surface px-3 py-2 text-[13.5px] text-ink outline-none transition-colors placeholder:text-muted focus:border-gold focus:ring-2 focus:ring-gold/20"
                {...form.register('short_description')}
              />
              {form.formState.errors.short_description && (
                <p className="mt-1 text-[11.5px] text-danger-ink">
                  {form.formState.errors.short_description.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-[12px] font-medium text-body" htmlFor={`${formId}-cost`}>
                Your cost per unit (BWP)
              </label>
              <input
                id={`${formId}-cost`}
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                className="w-full rounded-md border border-hairline-strong bg-surface px-3 py-2 font-mono text-[13.5px] tabular-nums text-ink outline-none transition-colors placeholder:text-muted focus:border-gold focus:ring-2 focus:ring-gold/20"
                {...form.register('unit_cost')}
              />
              {form.formState.errors.unit_cost && (
                <p className="mt-1 text-[11.5px] text-danger-ink">{form.formState.errors.unit_cost.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-[12px] font-medium text-body" htmlFor={`${formId}-stock`}>
                Available stock
              </label>
              <input
                id={`${formId}-stock`}
                type="number"
                min="0"
                placeholder="0"
                className="w-full rounded-md border border-hairline-strong bg-surface px-3 py-2 font-mono text-[13.5px] tabular-nums text-ink outline-none transition-colors placeholder:text-muted focus:border-gold focus:ring-2 focus:ring-gold/20"
                {...form.register('stock')}
              />
              {form.formState.errors.stock && (
                <p className="mt-1 text-[11.5px] text-danger-ink">{form.formState.errors.stock.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1 flex items-center gap-1 text-[12px] font-medium text-body" htmlFor={`${formId}-lead`}>
                <Timer size={11} strokeWidth={1.5} /> Lead time (days)
              </label>
              <input
                id={`${formId}-lead`}
                type="number"
                min="1"
                placeholder="2"
                className="w-full rounded-md border border-hairline-strong bg-surface px-3 py-2 font-mono text-[13.5px] tabular-nums text-ink outline-none transition-colors placeholder:text-muted focus:border-gold focus:ring-2 focus:ring-gold/20"
                {...form.register('fulfilment_days')}
              />
              {form.formState.errors.fulfilment_days && (
                <p className="mt-1 text-[11.5px] text-danger-ink">{form.formState.errors.fulfilment_days.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-[12px] font-medium text-body" htmlFor={`${formId}-moq`}>
                Minimum order qty
              </label>
              <input
                id={`${formId}-moq`}
                type="number"
                min="1"
                placeholder="5"
                className="w-full rounded-md border border-hairline-strong bg-surface px-3 py-2 font-mono text-[13.5px] tabular-nums text-ink outline-none transition-colors placeholder:text-muted focus:border-gold focus:ring-2 focus:ring-gold/20"
                {...form.register('moq')}
              />
              {form.formState.errors.moq && (
                <p className="mt-1 text-[11.5px] text-danger-ink">{form.formState.errors.moq.message}</p>
              )}
            </div>
          </div>

          <p className="flex items-start gap-1.5 rounded border border-hairline bg-gold-50/60 px-3 py-2 text-[11.5px] leading-4 text-gold-700">
            <PackagePlus size={13} strokeWidth={1.5} className="mt-0.5 shrink-0" />
            Listing creation is queued for admin review in this preview — nothing goes live automatically.
          </p>
        </form>
      </ConfirmDialog>
    </div>
  );
}
