'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, Handshake, Minus, Plus } from 'lucide-react';

import { GoldButton } from '@/components/brand/GoldButton';
import { cn } from '@/lib/utils';
import type { Category } from '@/types';

/**
 * Runner request intake.
 *
 * Deliberately short. Everything asked for here is something a runner cannot
 * start without — what, how many, where, and roughly what the buyer expects to
 * pay. Price is not collected because it is not known yet: the runner sources
 * it, reports back, and the customer approves before anything is charged.
 */
export function RunnerRequestForm({
  categories,
  signedIn,
}: {
  categories: Category[];
  signedIn: boolean;
}) {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [qty, setQty] = useState(1);
  const [budget, setBudget] = useState('');
  const [location, setLocation] = useState('Gaborone');
  const [neededBy, setNeededBy] = useState('');
  const [personalTask, setPersonalTask] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!signedIn) {
      router.push('/login?next=/request-a-runner');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/runner-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          details,
          category_id: categoryId || null,
          quantity: qty,
          budget_per_unit: budget.trim() === '' ? null : Number(budget),
          delivery_location: location,
          needed_by: neededBy || null,
          is_personal_task: personalTask,
        }),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Could not submit that request.');

      setReference(payload.request.reference);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not submit that request.');
    } finally {
      setSaving(false);
    }
  }

  if (reference) {
    return (
      <div className="rounded-lg border border-forest/25 bg-forest-wash/50 p-6 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-forest text-white">
          <CheckCircle2 size={22} strokeWidth={1.6} />
        </span>
        <h2 className="mt-4 font-display text-[20px] font-semibold text-forest-ink">
          Request {reference} is with our runners
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-[13.5px] leading-6 text-body">
          A verified runner will accept it, source what you asked for and send back a price. Nothing
          is charged until you approve that price.
        </p>
        <Link href="/orders" className="mt-5 inline-block">
          <GoldButton variant="forest" size="md" withArrow>
            Track your requests
          </GoldButton>
        </Link>
      </div>
    );
  }

  const field =
    'w-full rounded border border-hairline-strong bg-surface-raised px-3.5 py-3 text-[14px] text-ink placeholder:text-muted focus:border-gold focus:outline-none';

  return (
    <form onSubmit={submit} className="rounded-lg border border-hairline bg-surface-raised p-4 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold text-white">
          <Handshake size={18} strokeWidth={1.6} />
        </span>
        <div>
          <h2 className="font-display text-[19px] font-semibold text-ink sm:text-[22px]">
            Tell us what you need
          </h2>
          <p className="mt-1 text-[13px] leading-5 text-body">
            A runner will find it, check it and buy it on your behalf.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <div>
          <label htmlFor="title" className="eyebrow mb-2 block">
            What are you looking for
          </label>
          <input
            id="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            maxLength={160}
            placeholder="e.g. 20kg bag of pool chlorine granules"
            className={field}
          />
        </div>

        <div>
          <label htmlFor="details" className="eyebrow mb-2 block">
            Anything else that matters
          </label>
          <textarea
            id="details"
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Brand, size, colour, where you have seen it before…"
            className={cn(field, 'resize-y')}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="category" className="eyebrow mb-2 block">
              Closest category
            </label>
            <select
              id="category"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className={field}
            >
              <option value="">Not sure</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="eyebrow mb-2 block">How many</span>
            <div className="flex items-center rounded border border-hairline-strong">
              <button
                type="button"
                onClick={() => setQty((value) => Math.max(1, value - 1))}
                disabled={qty <= 1}
                aria-label="Decrease quantity"
                className="flex h-[46px] w-12 items-center justify-center text-body transition-colors hover:bg-ink/[0.04] disabled:opacity-35"
              >
                <Minus size={15} strokeWidth={1.5} />
              </button>
              <input
                type="number"
                min={1}
                max={9999}
                value={qty}
                onChange={(event) => setQty(Math.max(1, Number(event.target.value) || 1))}
                aria-label="Quantity"
                className="h-[46px] w-full border-x border-hairline-strong bg-transparent text-center font-mono text-[14px] tabular-nums text-ink focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setQty((value) => Math.min(9999, value + 1))}
                aria-label="Increase quantity"
                className="flex h-[46px] w-12 items-center justify-center text-body transition-colors hover:bg-ink/[0.04]"
              >
                <Plus size={15} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="budget" className="eyebrow mb-2 block">
              Budget per unit (optional)
            </label>
            <input
              id="budget"
              type="number"
              min={1}
              step="0.01"
              value={budget}
              onChange={(event) => setBudget(event.target.value)}
              placeholder="P —"
              className={field}
            />
          </div>

          <div>
            <label htmlFor="location" className="eyebrow mb-2 block">
              Deliver to
            </label>
            <input
              id="location"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              required
              maxLength={120}
              className={field}
            />
          </div>
        </div>

        <div>
          <label htmlFor="needed-by" className="eyebrow mb-2 block">
            Needed by (optional)
          </label>
          <input
            id="needed-by"
            type="date"
            value={neededBy}
            onChange={(event) => setNeededBy(event.target.value)}
            className={field}
          />
        </div>

        <label className="flex items-start gap-3 rounded border border-hairline bg-surface px-3.5 py-3">
          <input
            type="checkbox"
            checked={personalTask}
            onChange={(event) => setPersonalTask(event.target.checked)}
            className="mt-0.5 h-4 w-4 accent-gold"
          />
          <span className="text-[13px] leading-5 text-body">
            This is a personal task rather than goods — a collection, a queue, paying something in
            person.
          </span>
        </label>
      </div>

      {error && (
        <p className="mt-4 flex items-start gap-2 rounded border border-danger/25 bg-danger-wash px-3.5 py-3 text-[13px] text-danger-ink">
          <AlertCircle size={15} strokeWidth={1.6} className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}

      <GoldButton
        type="submit"
        variant="gold"
        size="lg"
        loading={saving}
        className="mt-5 w-full"
        withArrow
      >
        {signedIn ? 'Send to runners' : 'Sign in to send this'}
      </GoldButton>

      <p className="mt-3 text-center text-[12px] leading-5 text-muted">
        Free to submit. You approve the price the runner comes back with before anything is charged.
      </p>
    </form>
  );
}
