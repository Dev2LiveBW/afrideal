'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { AlertCircle, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

import { ActionButton } from '@/components/brand/ActionButton';
import { EmptyState, Panel, PanelBody, PanelHeader } from '@/components/brand/Panel';
import { shortDate } from '@/lib/format';
import type { PromoCode } from '@/types';

export type PromoRow = PromoCode & { paid_uses: number; state: string };

const FIELD =
  'w-full rounded border border-hairline-strong bg-surface px-3 py-2 text-[13.5px] text-ink outline-none transition-colors focus:border-gold/60';

const STATE_LABELS: Record<string, string> = {
  LIVE: 'Live',
  SCHEDULED: 'Scheduled',
  ENDED: 'Ended',
  USED_UP: 'Used up',
  OFF: 'Switched off',
};

/** The end of the day a date input names, so a code runs through its last day. */
const endOfDay = (date: string) => `${date}T23:59:59.000Z`;
const startOfDay = (date: string) => `${date}T00:00:00.000Z`;

export function PromoCodesClient({ rows }: { rows: PromoRow[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send(path: string, method: string, body: unknown) {
    setBusy(true);
    setError(null);
    const response = await fetch(path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => null);
    const reply = await response?.json().catch(() => null);
    setBusy(false);

    if (!response?.ok) {
      setError(reply?.error ?? 'That did not save. Please try again.');
      return false;
    }
    router.refresh();
    return true;
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) ?? '').trim();
    const limit = text('usage_limit');

    const saved = await send('/api/promo-codes', 'POST', {
      code: text('code'),
      percent: Number(text('percent')),
      max_discount: Number(text('max_discount')),
      min_order: Number(text('min_order') || 0),
      starts_at: startOfDay(text('starts_at')),
      ends_at: endOfDay(text('ends_at')),
      usage_limit: limit ? Number(limit) : null,
    });
    if (saved) {
      setCreating(false);
      toast.success('Code created');
    }
  }

  async function changeEnd(row: PromoRow, date: string) {
    if (date) await send(`/api/promo-codes/${row.id}`, 'PATCH', { ends_at: endOfDay(date) });
  }

  async function changeLimit(row: PromoRow, value: string) {
    await send(`/api/promo-codes/${row.id}`, 'PATCH', { usage_limit: value ? Number(value) : null });
  }

  return (
    <>
      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger-wash px-4 py-3 text-[13px] text-danger-ink">
          <AlertCircle size={15} strokeWidth={1.5} className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}

      <Panel>
        <PanelHeader title="New code" description="The code and percent cannot change once it is created." />
        <PanelBody>
          {creating ? (
            <form onSubmit={create} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field name="code" label="Code" placeholder="WELCOME10" required />
              <Field name="percent" label="Percent off" type="number" min={1} max={90} required />
              <Field name="max_discount" label="Maximum discount (BWP)" type="number" min={1} step="0.01" required />
              <Field name="min_order" label="Minimum order (BWP)" type="number" min={0} step="0.01" />
              <Field name="starts_at" label="Starts" type="date" required />
              <Field name="ends_at" label="Ends" type="date" required />
              <Field name="usage_limit" label="Total uses (optional)" type="number" min={1} />
              <div className="flex items-end gap-2">
                <ActionButton type="submit" size="md" loading={busy}>
                  Create code
                </ActionButton>
                <ActionButton type="button" variant="ghost" size="md" onClick={() => setCreating(false)}>
                  Cancel
                </ActionButton>
              </div>
            </form>
          ) : (
            <ActionButton size="md" icon={<Plus size={15} strokeWidth={1.5} />} onClick={() => setCreating(true)}>
              Add a code
            </ActionButton>
          )}
        </PanelBody>
      </Panel>

      {rows.length === 0 ? (
        <EmptyState title="No promo codes yet" description="Add a code above to start a campaign." />
      ) : (
        <Panel>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-hairline text-[11.5px] text-muted">
                <tr>
                  {['Code', 'State', 'Off', 'Up to', 'Minimum', 'Runs', 'Paid uses', 'Limit', 'Action'].map((heading) => (
                    <th key={heading} scope="col" className="px-4 py-2.5 font-medium">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {rows.map((row) => (
                  <tr key={`${row.id}-${row.updated_at}`}>
                    <th scope="row" className="px-4 py-3 font-mono font-semibold text-ink">
                      {row.code}
                    </th>
                    <td className="px-4 py-3 text-body">{STATE_LABELS[row.state] ?? row.state}</td>
                    <td className="px-4 py-3 font-mono tabular-nums">{row.percent}%</td>
                    <td className="px-4 py-3 font-mono tabular-nums">{row.max_discount.toFixed(2)}</td>
                    <td className="px-4 py-3 font-mono tabular-nums">{row.min_order.toFixed(2)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-body">
                      {shortDate(row.starts_at)} to{' '}
                      <input
                        type="date"
                        aria-label={`End date for ${row.code}`}
                        defaultValue={row.ends_at.slice(0, 10)}
                        disabled={busy}
                        onBlur={(event) =>
                          event.target.value !== row.ends_at.slice(0, 10) && changeEnd(row, event.target.value)
                        }
                        className="rounded border border-hairline-strong bg-surface px-1.5 py-1 text-[12.5px]"
                      />
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums">{row.paid_uses}</td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={1}
                        aria-label={`Total use limit for ${row.code}`}
                        placeholder="None"
                        defaultValue={row.usage_limit ?? ''}
                        disabled={busy}
                        onBlur={(event) =>
                          event.target.value !== String(row.usage_limit ?? '') && changeLimit(row, event.target.value)
                        }
                        className="w-20 rounded border border-hairline-strong bg-surface px-1.5 py-1 text-[12.5px]"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <ActionButton
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        aria-label={`${row.active ? 'Switch off' : 'Switch on'} ${row.code}`}
                        onClick={() => send(`/api/promo-codes/${row.id}`, 'PATCH', { active: !row.active })}
                      >
                        {row.active ? 'Switch off' : 'Switch on'}
                      </ActionButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </>
  );
}

function Field({ name, label, ...props }: { name: string; label: string } & React.ComponentProps<'input'>) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-[12.5px] font-medium text-ink">
        {label}
      </label>
      <input id={name} name={name} {...props} className={FIELD} />
    </div>
  );
}
