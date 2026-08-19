'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Navigation, Route } from 'lucide-react';
import toast from 'react-hot-toast';

import { GoldButton } from '@/components/brand/GoldButton';
import { MoneyText } from '@/components/brand/MoneyText';
import { acceptShipment } from '../_lib/actions';
import type { DecoratedShipment } from '../_lib/types';

/** One available job in the feed, with a real accept action. */
export function JobCard({ job }: { job: DecoratedShipment }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function accept() {
    setSaving(true);
    const result = await acceptShipment(job.id);
    setSaving(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(`Job accepted — head to ${job.pickup_name}`);
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-hairline bg-surface-raised p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="flex items-start gap-2">
            <MapPin size={14} strokeWidth={1.5} className="mt-0.5 shrink-0 text-muted" />
            <div className="min-w-0">
              <p className="text-[10.5px] uppercase tracking-[0.06em] text-muted">Pickup</p>
              <p className="truncate text-[13.5px] font-medium text-ink">{job.pickup_name}</p>
              <p className="truncate text-[11.5px] text-body">{job.pickup_address}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Navigation size={14} strokeWidth={1.5} className="mt-0.5 shrink-0 text-muted" />
            <div className="min-w-0">
              <p className="text-[10.5px] uppercase tracking-[0.06em] text-muted">Drop-off</p>
              <p className="truncate text-[13.5px] font-medium text-ink">{job.dropoff_name}</p>
              <p className="truncate text-[11.5px] text-body">{job.dropoff_address}</p>
            </div>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <MoneyText amount={job.payout} size="lg" tone="gold" />
          <p className="mt-1.5 flex items-center justify-end gap-1 text-[11.5px] text-muted">
            <Route size={12} strokeWidth={1.5} />
            {job.distance_km.toFixed(1)} km
          </p>
        </div>
      </div>

      <GoldButton className="mt-3.5 w-full" size="lg" loading={saving} onClick={accept}>
        Accept job
      </GoldButton>
    </div>
  );
}
