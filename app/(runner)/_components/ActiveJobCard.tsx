'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Camera, CheckCircle2, MapPin, Navigation, PackageCheck, Truck } from 'lucide-react';
import toast from 'react-hot-toast';

import { GoldButton } from '@/components/brand/GoldButton';
import { MoneyText } from '@/components/brand/MoneyText';
import { cn } from '@/lib/utils';
import type { ShipmentStatus } from '@/types';
import type { DecoratedShipment } from '../_lib/types';

/**
 * The active job card — pickup phase, then delivery phase.
 *
 * `variant="compact"` (dashboard) keeps the one-tap ASSIGNED/PICKED_UP
 * actions but hands the final delivery confirmation off to the Jobs page,
 * where the photo-placeholder step lives. `variant="full"` (Jobs page)
 * renders that step inline.
 */

const PHASE_ORDER: ShipmentStatus[] = ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED'];

const PHASE_LABELS: Record<ShipmentStatus, string> = {
  UNASSIGNED: 'Waiting to be assigned',
  ASSIGNED: 'Heading to pickup',
  PICKED_UP: 'Picked up — preparing to depart',
  IN_TRANSIT: 'On the way to drop-off',
  DELIVERED: 'Delivered',
  FAILED: 'Delivery failed',
};

const NEXT_STEP: Partial<Record<ShipmentStatus, { next: ShipmentStatus; label: string; icon: React.ReactNode }>> = {
  ASSIGNED: { next: 'PICKED_UP', label: 'Mark picked up', icon: <PackageCheck size={16} strokeWidth={1.5} /> },
  PICKED_UP: { next: 'IN_TRANSIT', label: 'Start delivery', icon: <Truck size={16} strokeWidth={1.5} /> },
};

export function ActiveJobCard({
  job,
  variant = 'full',
}: {
  job: DecoratedShipment;
  variant?: 'compact' | 'full';
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function advance(status: ShipmentStatus) {
    setSaving(true);
    try {
      const response = await fetch(`/api/shipments/${job.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const { error } = await response.json().catch(() => ({ error: 'Could not update this job.' }));
        throw new Error(error ?? 'Could not update this job.');
      }

      toast.success(status === 'DELIVERED' ? 'Delivery confirmed — nice work' : PHASE_LABELS[status]);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update this job.');
    } finally {
      setSaving(false);
    }
  }

  const currentIndex = Math.max(PHASE_ORDER.indexOf(job.status), 0);
  const action = NEXT_STEP[job.status];

  return (
    <div className="overflow-hidden rounded-lg border border-hairline bg-surface-raised shadow-card">
      <div className="flex items-center justify-between gap-2 border-b border-hairline bg-ink px-4 py-3">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/50">Active job</p>
        <MoneyText amount={job.payout} size="md" tone="gold" />
      </div>

      <div className="p-4">
        <ol className="flex items-center gap-1.5" aria-hidden="true">
          {PHASE_ORDER.map((phase, index) => (
            <li
              key={phase}
              className={cn('h-1.5 flex-1 rounded-full', index <= currentIndex ? 'bg-forest' : 'bg-hairline-strong')}
            />
          ))}
        </ol>
        <p className="mt-2 text-[12.5px] font-medium text-forest">{PHASE_LABELS[job.status]}</p>

        <div className="mt-3.5 space-y-2.5">
          <div className="flex items-start gap-2.5">
            <MapPin size={15} strokeWidth={1.5} className="mt-0.5 shrink-0 text-muted" />
            <div className="min-w-0">
              <p className="text-[10.5px] uppercase tracking-[0.06em] text-muted">Pickup</p>
              <p className="truncate text-[13.5px] font-medium text-ink">{job.pickup_name}</p>
              <p className="truncate text-[12px] text-body">{job.pickup_address}</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <Navigation size={15} strokeWidth={1.5} className="mt-0.5 shrink-0 text-muted" />
            <div className="min-w-0">
              <p className="text-[10.5px] uppercase tracking-[0.06em] text-muted">Drop-off</p>
              <p className="truncate text-[13.5px] font-medium text-ink">{job.dropoff_name}</p>
              <p className="truncate text-[12px] text-body">{job.dropoff_address}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 border-t border-hairline pt-4">
          {job.status === 'IN_TRANSIT' ? (
            variant === 'full' ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-md border border-dashed border-hairline-strong bg-surface px-3.5 py-3 text-muted">
                  <Camera size={18} strokeWidth={1.5} className="shrink-0" />
                  <p className="text-[12px] leading-4">
                    Photo capture placeholder — not wired up in this preview build.
                  </p>
                </div>
                <GoldButton
                  className="w-full"
                  size="lg"
                  variant="forest"
                  icon={<CheckCircle2 size={16} strokeWidth={1.5} />}
                  loading={saving}
                  onClick={() => advance('DELIVERED')}
                >
                  Confirm delivered
                </GoldButton>
              </div>
            ) : (
              <Link
                href="/runner/jobs"
                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full bg-forest px-6 text-[14px] font-medium text-white transition-colors hover:bg-forest-light"
              >
                <CheckCircle2 size={16} strokeWidth={1.5} />
                Confirm delivery
              </Link>
            )
          ) : action ? (
            <GoldButton
              className="w-full"
              size="lg"
              variant="forest"
              icon={action.icon}
              loading={saving}
              onClick={() => advance(action.next)}
            >
              {action.label}
            </GoldButton>
          ) : null}
        </div>
      </div>
    </div>
  );
}
