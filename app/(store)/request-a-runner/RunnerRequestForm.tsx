'use client';

import { useRouter } from 'next/navigation';
import { forwardRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

import { GoldButton } from '@/components/brand/GoldButton';
import { SOURCING_FEE_RATE } from '@/lib/runner-requests';
import { cn } from '@/lib/utils';

const Schema = z.object({
  item: z.string().min(4, 'A few words is enough. What are you looking for?').max(160),
  detail: z.string().max(1200).optional(),
  quantity: z.coerce.number().int().min(1, 'At least one.').max(10_000),
  budget_per_unit: z.union([z.coerce.number().min(1), z.literal('')]).optional(),
  delivery_city: z.string().min(2, 'Which town or city?').max(80),
  delivery_address: z.string().min(4, 'Where should the runner bring it?').max(240),
  needed_by: z.string().max(40).optional(),
});

type Values = z.infer<typeof Schema>;

/**
 * The sourcing request form.
 *
 * Six fields, and only four of them are required. Every field a buyer has to
 * fill in before a runner has even agreed to look is a reason not to ask, so
 * the budget and the deadline are optional and say so — a buyer who does not
 * know what something should cost is exactly the buyer this service is for.
 */
export function RunnerRequestForm({ defaultCity }: { defaultCity?: string }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(Schema),
    defaultValues: { quantity: 1, delivery_city: defaultCity ?? '' },
  });

  const quantity = watch('quantity');
  const budget = watch('budget_per_unit');

  // A live read of what the request would cost if a runner found it at budget.
  const estimate =
    typeof budget === 'number' && budget > 0 && Number(quantity) > 0
      ? (() => {
          const goods = budget * Number(quantity);
          const fee = Math.ceil(goods * SOURCING_FEE_RATE);
          return { goods, fee, total: goods + fee };
        })()
      : null;

  async function onSubmit(values: Values) {
    setServerError(null);

    const response = await fetch('/api/runner-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...values,
        budget_per_unit: values.budget_per_unit === '' ? null : values.budget_per_unit,
        needed_by: values.needed_by || null,
      }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setServerError(payload?.error ?? 'That did not send. Try again.');
      return;
    }

    toast.success(`${payload.reference} is with our runners`);
    router.push('/requests');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {serverError && (
        <p
          role="alert"
          className="flex items-start gap-2.5 rounded-md border border-danger/25 bg-danger-wash px-4 py-3 text-[13px] text-danger-ink"
        >
          <AlertCircle size={16} strokeWidth={1.5} className="mt-0.5 shrink-0" />
          {serverError}
        </p>
      )}

      <Field
        id="item"
        label="What are you looking for?"
        error={errors.item?.message}
        {...register('item')}
        placeholder="Ghana-weave 22 inch, natural black"
      />

      <div>
        <label htmlFor="detail" className={labelClass}>
          Anything that would help the runner{' '}
          <span className="font-normal text-muted">(optional)</span>
        </label>
        <textarea
          id="detail"
          rows={4}
          {...register('detail')}
          placeholder="Brand, size, colour, condition you would accept, shops you have already tried."
          className={cn(inputClass, 'resize-y')}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          id="quantity"
          label="How many"
          type="number"
          min={1}
          error={errors.quantity?.message}
          {...register('quantity')}
        />
        <Field
          id="budget_per_unit"
          label={
            <>
              Budget per unit <span className="font-normal text-muted">(optional, BWP)</span>
            </>
          }
          type="number"
          min={1}
          error={
            typeof errors.budget_per_unit?.message === 'string'
              ? errors.budget_per_unit.message
              : undefined
          }
          {...register('budget_per_unit')}
          placeholder="Leave blank to be told"
        />
      </div>

      {estimate && (
        <div className="rounded-md bg-gold-50 px-4 py-3.5 text-[12.5px] leading-5 text-gold-700 ring-1 ring-inset ring-gold/25">
          At that budget the request would come to{' '}
          <span className="font-mono font-semibold tabular-nums">
            BWP {estimate.total.toFixed(2)}
          </span>{' '}
          all in, including a{' '}
          <span className="font-mono tabular-nums">BWP {estimate.fee.toFixed(2)}</span> sourcing fee.
          You are not committed to it. The runner comes back with the real figure and you decide
          then.
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          id="delivery_city"
          label="Town or city"
          error={errors.delivery_city?.message}
          {...register('delivery_city')}
          placeholder="Gaborone"
        />
        <Field
          id="needed_by"
          label={
            <>
              Needed by <span className="font-normal text-muted">(optional)</span>
            </>
          }
          error={errors.needed_by?.message}
          {...register('needed_by')}
          placeholder="Before the 30th"
        />
      </div>

      <Field
        id="delivery_address"
        label="Delivery address"
        error={errors.delivery_address?.message}
        {...register('delivery_address')}
        placeholder="Plot 5412, Extension 12"
      />

      <GoldButton type="submit" variant="gold" size="lg" className="w-full" loading={isSubmitting} withArrow>
        Send to our runners
      </GoldButton>

      <p className="text-center text-[12px] leading-5 text-muted">
        Nothing is charged now. A runner accepts the job, finds the item, and sends you the price
        before anything is bought.
      </p>
    </form>
  );
}

const labelClass = 'mb-1.5 block text-[13px] font-medium text-ink';
const inputClass =
  'w-full rounded border border-hairline-strong bg-surface-raised px-3.5 py-2.5 text-[14px] text-ink outline-none transition-colors placeholder:text-muted focus:border-gold/60';

/*
 * forwardRef, not a plain function: `register()` hands back a ref alongside the
 * change handlers, and a function component silently drops it. The field would
 * render, validate on submit, and never focus on error.
 */
const Field = forwardRef<
  HTMLInputElement,
  { id: string; label: React.ReactNode; error?: string } & React.InputHTMLAttributes<HTMLInputElement>
>(function Field({ id, label, error, ...props }, ref) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <input
        id={id}
        ref={ref}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(inputClass, error && 'border-danger/50')}
        {...props}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-[12px] text-danger-ink">
          {error}
        </p>
      )}
    </div>
  );
});
