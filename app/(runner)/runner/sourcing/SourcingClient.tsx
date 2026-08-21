'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { HandCoins, MapPin, PackageSearch, Search, Truck } from 'lucide-react';
import toast from 'react-hot-toast';

import { GoldButton } from '@/components/brand/GoldButton';
import { MoneyText } from '@/components/brand/MoneyText';
import { EmptyState } from '@/components/brand/Panel';
import { StatusBadge } from '@/components/brand/StatusBadge';
import { TabButton } from '@/app/(admin)/admin/_components/TabButton';
import { dateTime } from '@/lib/format';
import { SOURCING_FEE_RATE, quoteTotal } from '@/lib/runner-requests';
import { cn } from '@/lib/utils';
import type { RunnerRequest } from '@/types';

/**
 * The runner's side of a sourcing request.
 *
 * Two lists, because they are two different jobs. The pool is a decision about
 * whether to take work; "mine" is the work itself. Mixing them would make the
 * screen a runner checks twenty times a day reshuffle every time somebody else
 * accepted something.
 *
 * The quote form is inline rather than a modal. A runner fills it in standing at
 * a trade counter with the item in front of them, and a dialog that covers the
 * request they are quoting against is the wrong shape for that.
 */
export function SourcingClient({
  pool,
  mine,
}: {
  pool: RunnerRequest[];
  mine: RunnerRequest[];
}) {
  const [tab, setTab] = useState<'MINE' | 'POOL'>(mine.length > 0 ? 'MINE' : 'POOL');
  const rows = tab === 'POOL' ? pool : mine;

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2">
        <TabButton
          label={`My requests (${mine.length})`}
          active={tab === 'MINE'}
          onClick={() => setTab('MINE')}
        />
        <TabButton
          label={`Open pool (${pool.length})`}
          active={tab === 'POOL'}
          onClick={() => setTab('POOL')}
        />
      </div>

      {rows.length === 0 ? (
        <div className="panel">
          <EmptyState
            icon={<PackageSearch size={20} strokeWidth={1.5} />}
            title={tab === 'POOL' ? 'Nothing in the pool' : 'You have no sourcing jobs'}
            description={
              tab === 'POOL'
                ? 'When a customer asks for something the catalogue does not carry, it lands here.'
                : 'Take one from the open pool and it will move here.'
            }
          />
        </div>
      ) : (
        <ul className="space-y-4">
          {rows.map((request) => (
            <RequestCard key={request.id} request={request} inPool={tab === 'POOL'} />
          ))}
        </ul>
      )}
    </div>
  );
}

function RequestCard({ request, inPool }: { request: RunnerRequest; inPool: boolean }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [quoting, setQuoting] = useState(false);
  const [unitPrice, setUnitPrice] = useState('');
  const [foundAt, setFoundAt] = useState('');
  const [condition, setCondition] = useState('New');

  const parsedPrice = Number.parseFloat(unitPrice);
  const preview =
    Number.isFinite(parsedPrice) && parsedPrice > 0
      ? quoteTotal(parsedPrice, request.quantity)
      : null;

  async function move(status: string, body: Record<string, unknown> = {}, success?: string) {
    setSaving(true);

    try {
      const response = await fetch(`/api/runner-requests/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, ...body }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? 'That did not work.');

      toast.success(success ?? 'Updated');
      setQuoting(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <p className="font-mono text-[11.5px] tabular-nums text-muted">{request.reference}</p>
            <StatusBadge status={request.status} size="sm" />
          </div>
          <h3 className="mt-1.5 text-[15.5px] font-semibold leading-6 text-ink">{request.item}</h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-muted">
            <span className="font-mono tabular-nums">{request.quantity}</span>
            <span className="inline-flex items-center gap-1">
              <MapPin size={12} strokeWidth={1.75} />
              {request.delivery_city}
            </span>
            <span>{dateTime(request.created_at)}</span>
          </p>
        </div>

        <div className="shrink-0 text-right">
          {request.quote ? (
            <>
              <p className="text-[11.5px] text-muted">You quoted</p>
              <MoneyText amount={request.quote.total} size="md" tone="gold" />
            </>
          ) : request.budget_per_unit ? (
            <>
              <p className="text-[11.5px] text-muted">Their budget</p>
              <MoneyText amount={request.budget_per_unit} size="md" bare />
              <p className="mt-0.5 text-[11px] text-muted">per unit</p>
            </>
          ) : (
            <p className="text-[12.5px] text-muted">No budget set</p>
          )}
        </div>
      </div>

      {request.detail && (
        <p className="measure mt-4 border-t border-hairline pt-3.5 text-[13px] leading-6 text-body">
          {request.detail}
        </p>
      )}

      <p className="mt-3 text-[12px] text-muted">
        Deliver to {request.delivery_address}, {request.delivery_city}
        {request.needed_by && ` · needed by ${dateTime(request.needed_by)}`}
      </p>

      {/* ── Quote form, once the runner has actually found it ────────────── */}
      {quoting && (
        <div className="mt-4 rounded border border-gold/25 bg-gold-50/60 p-4">
          <p className="text-[12.5px] font-medium text-gold-700">What did you find?</p>

          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-[11.5px] text-gold-700">Price per unit (BWP)</span>
              <input
                type="number"
                min={1}
                value={unitPrice}
                onChange={(event) => setUnitPrice(event.target.value)}
                className="w-full rounded border border-hairline-strong bg-surface-raised px-3 py-2 text-[13.5px] text-ink outline-none focus:border-gold/60"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11.5px] text-gold-700">Where</span>
              <input
                value={foundAt}
                onChange={(event) => setFoundAt(event.target.value)}
                placeholder="Broadhurst trade counter"
                className="w-full rounded border border-hairline-strong bg-surface-raised px-3 py-2 text-[13.5px] text-ink outline-none placeholder:text-muted focus:border-gold/60"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11.5px] text-gold-700">Condition</span>
              <input
                value={condition}
                onChange={(event) => setCondition(event.target.value)}
                className="w-full rounded border border-hairline-strong bg-surface-raised px-3 py-2 text-[13.5px] text-ink outline-none focus:border-gold/60"
              />
            </label>
          </div>

          {preview && (
            <p className="mt-3 text-[12px] leading-5 text-gold-700">
              The customer sees{' '}
              <span className="font-mono font-semibold tabular-nums">
                BWP {preview.total.toFixed(2)}
              </span>{' '}
              all in: <span className="font-mono tabular-nums">BWP {preview.goods.toFixed(2)}</span>{' '}
              of goods plus your{' '}
              <span className="font-mono tabular-nums">BWP {preview.serviceFee.toFixed(2)}</span>{' '}
              fee at {Math.round(SOURCING_FEE_RATE * 100)}%.
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <GoldButton
              size="sm"
              variant="gold"
              loading={saving}
              disabled={!preview}
              onClick={() =>
                move(
                  'QUOTED',
                  { unit_price: parsedPrice, found_at: foundAt || undefined, condition },
                  'Price sent for approval',
                )
              }
            >
              Send for approval
            </GoldButton>
            <GoldButton size="sm" variant="ghost" onClick={() => setQuoting(false)}>
              Cancel
            </GoldButton>
          </div>
        </div>
      )}

      {/* ── The one move available from where this request stands ────────── */}
      <div className={cn('mt-4 flex flex-wrap gap-2', quoting && 'hidden')}>
        {inPool && request.status === 'REQUESTED' && (
          <GoldButton
            size="sm"
            variant="gold"
            loading={saving}
            icon={<PackageSearch size={14} strokeWidth={1.5} />}
            onClick={() => move('ACCEPTED', {}, 'Job accepted')}
          >
            Take this job
          </GoldButton>
        )}

        {request.status === 'ACCEPTED' && (
          <GoldButton
            size="sm"
            variant="ink"
            loading={saving}
            icon={<Search size={14} strokeWidth={1.5} />}
            onClick={() => move('SOURCING', {}, 'Marked as out looking')}
          >
            Start looking
          </GoldButton>
        )}

        {request.status === 'SOURCING' && (
          <GoldButton
            size="sm"
            variant="gold"
            icon={<HandCoins size={14} strokeWidth={1.5} />}
            onClick={() => setQuoting(true)}
          >
            I found it
          </GoldButton>
        )}

        {request.status === 'QUOTED' && (
          <p className="text-[12.5px] text-muted">Waiting on the customer to approve your price.</p>
        )}

        {request.status === 'APPROVED' && (
          <GoldButton
            size="sm"
            variant="forest"
            loading={saving}
            icon={<Truck size={14} strokeWidth={1.5} />}
            onClick={() => move('DELIVERING', {}, 'Marked as on the way')}
          >
            Bought, on the way
          </GoldButton>
        )}

        {request.status === 'DELIVERING' && (
          <p className="text-[12.5px] text-muted">
            Waiting on the customer to confirm they have it.
          </p>
        )}
      </div>
    </li>
  );
}
