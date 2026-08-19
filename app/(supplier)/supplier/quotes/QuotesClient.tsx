'use client';

import { useEffect, useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Clock, ClipboardCheck, FileText, Inbox, Send, ShoppingBag } from 'lucide-react';
import toast from 'react-hot-toast';

import { EmptyState, Panel, PanelBody, PanelHeader } from '@/components/brand/Panel';
import { GoldButton } from '@/components/brand/GoldButton';
import { MoneyText } from '@/components/brand/MoneyText';
import { relative } from '@/lib/format';
import { cn } from '@/lib/utils';
import { slaChip, type QuoteRow } from '../../_lib/quotes';

/**
 * Quote inbox — split panel.
 *
 * Left: every request, sorted by urgency. Right: a response form for
 * whichever is selected. Only `kind: 'ORDER'` rows have a real supplier
 * order behind them, so only those actually call the API; `kind: 'RFQ'`
 * rows are the illustrative Phase-2 preview and say so before you send.
 */

const responseSchema = z.object({
  price: z.coerce.number().positive('Enter your price per unit.'),
  availableUnits: z.coerce.number().int('Whole units only.').nonnegative('Enter units available.'),
  deliveryDays: z.coerce.number().int('Whole days only.').positive('Enter a delivery timeline.'),
  notes: z.string().max(500, 'Keep notes under 500 characters.').optional(),
});

type ResponseValues = z.infer<typeof responseSchema>;

export function QuotesClient({ rows }: { rows: QuoteRow[] }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(rows[0]?.id ?? null);
  const [saving, setSaving] = useState(false);
  const formId = useId();

  const selected = rows.find((row) => row.id === selectedId) ?? null;

  const form = useForm<ResponseValues>({
    resolver: zodResolver(responseSchema),
    defaultValues: {
      price: selected?.suggestedPrice || selected?.referenceCost || 0,
      availableUnits: selected?.stockHint ?? 0,
      deliveryDays: selected?.leadTimeHint ?? 2,
      notes: '',
    },
  });

  // Re-seed the form whenever the selected request changes.
  useEffect(() => {
    if (!selected) return;
    form.reset({
      price: selected.suggestedPrice || selected.referenceCost || 0,
      availableUnits: selected.stockHint ?? 0,
      deliveryDays: selected.leadTimeHint ?? 2,
      notes: '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  async function onSubmit(values: ResponseValues) {
    if (!selected) return;
    setSaving(true);

    try {
      if (selected.kind === 'ORDER' && selected.supplierOrderId) {
        const response = await fetch(`/api/supplier-orders/${selected.supplierOrderId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'CONFIRMED' }),
        });

        if (!response.ok) {
          const { error } = await response.json().catch(() => ({ error: 'Could not send your quote.' }));
          throw new Error(error ?? 'Could not send your quote.');
        }

        toast.success(
          selected.orderRef ? `Quote sent — order ${selected.orderRef} confirmed` : 'Quote sent — order confirmed',
        );
        router.refresh();
      } else {
        // Synthetic RFQ row — nothing real to write to yet.
        await new Promise((resolve) => setTimeout(resolve, 550));
        toast('Quote captured for this preview. Full RFQ persistence lands in Phase 2.', { icon: '📋' });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not send your quote. Try again.');
    } finally {
      setSaving(false);
    }
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<Inbox size={22} strokeWidth={1.5} />}
        title="No requests right now"
        description="Quote requests and orders awaiting your confirmation will show up here."
      />
    );
  }

  const realCount = rows.filter((row) => row.kind === 'ORDER').length;
  const syntheticCount = rows.length - realCount;

  return (
    <div className="space-y-4">
      <p className="flex items-start gap-1.5 rounded border border-hairline bg-gold-50/50 px-3.5 py-2.5 text-[12px] leading-5 text-gold-700">
        <FileText size={13} strokeWidth={1.5} className="mt-0.5 shrink-0" />
        {realCount} request{realCount === 1 ? '' : 's'} below {realCount === 1 ? 'comes' : 'come'} from live orders
        awaiting your confirmation.
        {syntheticCount > 0 &&
          ` ${syntheticCount} ${syntheticCount === 1 ? 'is an' : 'are'} illustrative direct ${syntheticCount === 1 ? 'enquiry' : 'enquiries'} — full RFQ capture is a Phase 2 feature.`}
      </p>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr] lg:items-start">
        <Panel>
          <PanelHeader title="Requests" description={`${rows.length} awaiting response`} />
          <div className="max-h-[640px] divide-y divide-hairline overflow-y-auto">
            {rows.map((row) => {
              const chip = slaChip(row.expiresAt);
              const active = row.id === selectedId;

              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => setSelectedId(row.id)}
                  className={cn(
                    'block w-full px-4 py-3.5 text-left transition-colors duration-150',
                    active ? 'bg-gold/[0.09]' : 'hover:bg-ink/[0.025]',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink/[0.05] text-[15px]">
                      {row.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-ink">{row.productName}</p>
                      <p className="mt-0.5 truncate text-[11.5px] text-muted">
                        {row.kind === 'ORDER' ? `Order ${row.orderRef ?? ''}` : 'Direct enquiry'}
                        {row.customerCity ? ` · ${row.customerCity}` : ''} · qty {row.qty}
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 font-mono text-[9.5px] font-medium uppercase tracking-[0.08em]',
                            row.kind === 'ORDER' ? 'bg-forest-wash text-forest' : 'bg-ink/[0.06] text-body',
                          )}
                        >
                          {row.kind === 'ORDER' ? 'Order' : 'Direct RFQ'}
                        </span>
                        <span
                          className={cn(
                            'shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.06em]',
                            chip.className,
                          )}
                        >
                          {chip.label}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </Panel>

        <Panel>
          {selected ? (
            <>
              <PanelHeader
                title={`${selected.emoji} ${selected.productName}`}
                description={
                  selected.kind === 'ORDER'
                    ? `Order ${selected.orderRef ?? ''} · ${selected.customerCity ?? 'city unknown'} · requested ${relative(selected.requestedAt)}`
                    : `Direct enquiry from ${selected.customerCity ?? 'a prospective buyer'} · requested ${relative(selected.requestedAt)}`
                }
              />
              <PanelBody>
                <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="mb-1 block text-[12px] font-medium text-body" htmlFor={`${formId}-price`}>
                        Your price per unit (BWP)
                      </label>
                      <input
                        id={`${formId}-price`}
                        type="number"
                        step="0.01"
                        min="0"
                        className="w-full rounded-md border border-hairline-strong bg-surface px-3 py-2 font-mono text-[13.5px] tabular-nums text-ink outline-none transition-colors focus:border-gold focus:ring-2 focus:ring-gold/20"
                        {...form.register('price')}
                      />
                      {form.formState.errors.price && (
                        <p className="mt-1 text-[11.5px] text-danger-ink">{form.formState.errors.price.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="mb-1 block text-[12px] font-medium text-body" htmlFor={`${formId}-units`}>
                        Units available
                      </label>
                      <input
                        id={`${formId}-units`}
                        type="number"
                        min="0"
                        className="w-full rounded-md border border-hairline-strong bg-surface px-3 py-2 font-mono text-[13.5px] tabular-nums text-ink outline-none transition-colors focus:border-gold focus:ring-2 focus:ring-gold/20"
                        {...form.register('availableUnits')}
                      />
                      {form.formState.errors.availableUnits && (
                        <p className="mt-1 text-[11.5px] text-danger-ink">
                          {form.formState.errors.availableUnits.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        className="mb-1 flex items-center gap-1 text-[12px] font-medium text-body"
                        htmlFor={`${formId}-days`}
                      >
                        <Clock size={11} strokeWidth={1.5} /> Delivery timeline (days)
                      </label>
                      <input
                        id={`${formId}-days`}
                        type="number"
                        min="1"
                        className="w-full rounded-md border border-hairline-strong bg-surface px-3 py-2 font-mono text-[13.5px] tabular-nums text-ink outline-none transition-colors focus:border-gold focus:ring-2 focus:ring-gold/20"
                        {...form.register('deliveryDays')}
                      />
                      {form.formState.errors.deliveryDays && (
                        <p className="mt-1 text-[11.5px] text-danger-ink">
                          {form.formState.errors.deliveryDays.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <p className="mb-1 text-[12px] font-medium text-body">Reference cost</p>
                      <MoneyText amount={selected.referenceCost} size="sm" tone="muted" className="block py-2" />
                    </div>

                    <div className="col-span-2">
                      <label className="mb-1 block text-[12px] font-medium text-body" htmlFor={`${formId}-notes`}>
                        Notes <span className="text-muted">(optional)</span>
                      </label>
                      <textarea
                        id={`${formId}-notes`}
                        rows={3}
                        placeholder="Anything the buyer should know — packaging, substitutions, part-shipment…"
                        className="w-full resize-none rounded-md border border-hairline-strong bg-surface px-3 py-2 text-[13.5px] text-ink outline-none transition-colors placeholder:text-muted focus:border-gold focus:ring-2 focus:ring-gold/20"
                        {...form.register('notes')}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-4">
                    <p className="flex items-center gap-1.5 text-[11.5px] text-muted">
                      {selected.kind === 'ORDER' ? (
                        <>
                          <ClipboardCheck size={13} strokeWidth={1.5} />
                          Sending confirms this order via the live API.
                        </>
                      ) : (
                        <>
                          <FileText size={13} strokeWidth={1.5} />
                          Illustrative request — sending won&apos;t be saved anywhere (Phase 2).
                        </>
                      )}
                    </p>
                    <GoldButton type="submit" size="sm" icon={<Send size={14} strokeWidth={1.5} />} loading={saving}>
                      {selected.kind === 'ORDER' ? 'Send quote & confirm' : 'Send quote'}
                    </GoldButton>
                  </div>
                </form>
              </PanelBody>
            </>
          ) : (
            <EmptyState
              icon={<ShoppingBag size={20} strokeWidth={1.5} />}
              title="Select a request"
              description="Choose a request on the left to respond with your price and availability."
              className="py-14"
            />
          )}
        </Panel>
      </div>
    </div>
  );
}
