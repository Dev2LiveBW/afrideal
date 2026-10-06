'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { AlertTriangle, Clock, MapPin, Navigation, X } from 'lucide-react';

import { ActionButton } from '@/components/brand/ActionButton';
import { MoneyText } from '@/components/brand/MoneyText';
import type { DecoratedShipment } from '../_lib/types';

/**
 * The incoming-job alert - a real countdown, not a decorative one.
 *
 * Two effects on purpose. The first owns the interval: it (re)starts a fresh
 * 45-second countdown whenever a new job comes in, and clears it on unmount
 * or when the job changes. The second only watches the countdown value and
 * fires `onExpire` the moment it reaches zero. Keeping expiry keyed off
 * `secondsLeft` alone - not `job.id` - matters: if it also depended on the
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
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const jobId = job?.id;

  /*
   * A runner who cannot see the countdown has to be told about it. The visible
   * timer is hidden from screen readers - one announcement a second would bury
   * the job details under its own ticking - and this message takes its place,
   * changing only at the milestones below so the live region fires four times,
   * not forty-five.
   */
  const spokenCountdown =
    secondsLeft > 30
      ? `${ALERT_WINDOW_SECONDS} seconds to respond`
      : secondsLeft > 15
        ? '30 seconds left'
        : secondsLeft > 5
          ? '15 seconds left'
          : '5 seconds left';

  // Move focus into the alert when a job arrives and hand it back on the way
  // out, so a keyboard runner is not left on whatever was behind the overlay.
  // Keyed on the id for the same reason the countdown is: an equal-but-new
  // `job` object must not yank focus back to the top mid-read.
  useEffect(() => {
    if (!jobId) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    return () => previouslyFocused?.focus();
  }, [jobId]);

  // Escape declines: the same thing the X button does, so the alert is never a
  // trap for someone who cannot reach it with a mouse.
  useEffect(() => {
    if (!job) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDecline();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [job, onDecline]);

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
    // Intentionally depends on `secondsLeft` only - see file note above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  if (!job) return null;

  const progress = (secondsLeft / ALERT_WINDOW_SECONDS) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 p-4 backdrop-blur-sm sm:items-center">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="w-full max-w-sm animate-shake overflow-hidden rounded-lg border-2 border-danger bg-surface-raised shadow-lift"
      >
        {/*
          The spoken half of the countdown. Assertive because the window is 45
          seconds and a polite announcement would queue behind whatever else is
          being read, which on this screen is the job that is expiring.
        */}
        <p role="status" aria-live="assertive" className="sr-only">
          New job alert, {job.pickup_name} to {job.dropoff_name}. {spokenCountdown}.
        </p>

        <div className="flex items-center justify-between gap-2 bg-danger px-4 py-2.5">
          <p
            id={titleId}
            className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-white"
          >
            <AlertTriangle size={14} strokeWidth={1.75} aria-hidden="true" />
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
            <div
              aria-hidden="true"
              className="flex items-center gap-1.5 rounded-full bg-danger-wash px-3 py-1.5 text-danger-ink"
            >
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
            {job.distance_km > 0 && <p className="text-[11.5px] text-muted">{job.distance_km.toFixed(1)} km away</p>}
          </div>

          <div className="mt-4 flex gap-2.5">
            <ActionButton variant="ghost" size="lg" className="flex-1" onClick={onDecline} disabled={loading}>
              Decline
            </ActionButton>
            <ActionButton variant="forest" size="lg" className="flex-1" onClick={onAccept} loading={loading}>
              Accept
            </ActionButton>
          </div>
        </div>
      </div>
    </div>
  );
}
