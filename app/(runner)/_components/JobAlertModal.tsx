'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Clock, MapPin, Navigation, X } from 'lucide-react';

import { GoldButton } from '@/components/brand/GoldButton';
import { MoneyText } from '@/components/brand/MoneyText';
import type { DecoratedShipment } from '../_lib/types';

/**
 * The incoming-job alert — a real countdown, not a decorative one.
 *
 * Two effects on purpose. The first owns the interval: it (re)starts a fresh
 * 45-second countdown whenever a new job comes in, and clears it on unmount
 * or when the job changes. The second only watches the countdown value and
 * fires `onExpire` the moment it reaches zero. Keeping expiry keyed off
 * `secondsLeft` alone — not `job.id` — matters: if it also depended on the
 * job, swapping in a new alert while the old countdown was still sitting at 0
 * would fire `onExpire` immediately for the *new* job before its own timer
 * ever started.
 */

const ALERT_WINDOW_SECONDS = 45;

export function JobAlertModal({
  job,
  loading = false,
  onAccept,
  onDecline,
  onExpire,
}: {
  job: DecoratedShipment | null;
  loading?: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onExpire: () => void;
}) {
  const [secondsLeft, setSecondsLeft] = useState(ALERT_WINDOW_SECONDS);

  useEffect(() => {
    if (!job) return;
    setSecondsLeft(ALERT_WINDOW_SECONDS);

    const id = setInterval(() => {
      setSecondsLeft((previous) => Math.max(previous - 1, 0));
    }, 1000);

    return () => clearInterval(id);
    // Keyed on the job's identity, not the object: a re-render that hands back
    // an equal-but-new `job` must not restart the countdown under the runner.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.id]);

  useEffect(() => {
    if (job && secondsLeft === 0) {
      onExpire();
    }
    // Intentionally depends on `secondsLeft` only — see file note above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  if (!job) return null;

  const progress = (secondsLeft / ALERT_WINDOW_SECONDS) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-sm animate-shake overflow-hidden rounded-lg border-2 border-danger bg-surface-raised shadow-lift">
        <div className="flex items-center justify-between gap-2 bg-danger px-4 py-2.5">
          <p className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-white">
            <AlertTriangle size={14} strokeWidth={1.75} />
            New job alert
          </p>
          <button
            type="button"
            onClick={onDecline}
            aria-label="Dismiss"
            className="rounded-full p-1.5 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
          >
            <X size={15} strokeWidth={1.5} />
          </button>
        </div>

        <div className="p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <MoneyText amount={job.payout} size="xl" tone="gold" />
            <div className="flex items-center gap-1.5 rounded-full bg-danger-wash px-3 py-1.5 text-danger-ink">
              <Clock size={13} strokeWidth={1.5} />
              <span className="font-mono text-[13px] font-semibold tabular-nums">{secondsLeft}s</span>
            </div>
          </div>

          <div className="h-1.5 w-full overflow-hidden rounded-full bg-hairline">
            <div
              className="h-full rounded-full bg-danger transition-[width] duration-1000 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="mt-4 space-y-2.5">
            <div className="flex items-start gap-2.5">
              <MapPin size={15} strokeWidth={1.5} className="mt-0.5 shrink-0 text-muted" />
              <div className="min-w-0">
                <p className="text-[10.5px] uppercase tracking-[0.06em] text-muted">Pickup</p>
                <p className="truncate text-[13.5px] font-medium text-ink">{job.pickup_name}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Navigation size={15} strokeWidth={1.5} className="mt-0.5 shrink-0 text-muted" />
              <div className="min-w-0">
                <p className="text-[10.5px] uppercase tracking-[0.06em] text-muted">Drop-off</p>
                <p className="truncate text-[13.5px] font-medium text-ink">{job.dropoff_name}</p>
              </div>
            </div>
            <p className="text-[11.5px] text-muted">{job.distance_km.toFixed(1)} km away</p>
          </div>

          <div className="mt-4 flex gap-2.5">
            <GoldButton variant="ghost" size="lg" className="flex-1" onClick={onDecline} disabled={loading}>
              Decline
            </GoldButton>
            <GoldButton variant="forest" size="lg" className="flex-1" onClick={onAccept} loading={loading}>
              Accept
            </GoldButton>
          </div>
        </div>
      </div>
    </div>
  );
}
