'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

import { dateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { OrderStatus, OrderTimelineEntry } from '@/types';

/**
 * Horizontal order stepper.
 *
 * Steps that have happened carry a timestamp; the rest are drawn but muted, so
 * a customer can see how far there is left to go rather than only how far they
 * have come. Cancelled and disputed orders short-circuit to their own end state
 * instead of pretending the happy path is still running.
 */

const HAPPY_PATH = [
  { code: 'PENDING', label: 'Placed' },
  { code: 'PAID', label: 'Paid' },
  { code: 'PROCESSING', label: 'Preparing' },
  { code: 'COLLECTED', label: 'Collected' },
  { code: 'IN_TRANSIT', label: 'In transit' },
  { code: 'DELIVERED', label: 'Delivered' },
  { code: 'RELEASED', label: 'Escrow released' },
] as const;

export function OrderTimeline({
  timeline,
  status,
  className,
}: {
  timeline: OrderTimelineEntry[];
  status: OrderStatus;
  className?: string;
}) {
  const reached = new Map(timeline.map((entry) => [entry.status, entry]));

  const terminated = status === 'CANCELLED' || status === 'DISPUTED';
  const steps = terminated
    ? [
        ...HAPPY_PATH.filter((step) => reached.has(step.code)),
        { code: status, label: status === 'CANCELLED' ? 'Cancelled' : 'Disputed' },
      ]
    : HAPPY_PATH;

  const lastReachedIndex = steps.reduce(
    (last, step, index) => (reached.has(step.code) ? index : last),
    -1,
  );

  return (
    <div className={cn('overflow-x-auto no-scrollbar', className)}>
      <ol className="flex min-w-[720px] items-start">
        {steps.map((step, index) => {
          const entry = reached.get(step.code);
          const done = index <= lastReachedIndex;
          const isCurrent = index === lastReachedIndex;
          const isFailure = terminated && index === steps.length - 1;

          return (
            <li key={step.code} className="relative flex flex-1 flex-col items-center text-center">
              {/* Connector sits behind the node and stops short of the last step. */}
              {index < steps.length - 1 && (
                <span className="absolute left-1/2 top-[15px] h-[2px] w-full bg-hairline-strong">
                  <motion.span
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: index < lastReachedIndex ? 1 : 0 }}
                    transition={{ delay: 0.1 + index * 0.09, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    className={cn(
                      'block h-full origin-left',
                      isFailure ? 'bg-danger' : 'bg-forest',
                    )}
                  />
                </span>
              )}

              <motion.span
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.09, duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
                className={cn(
                  'relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 font-mono text-[11px] font-semibold tabular-nums',
                  isFailure
                    ? 'border-danger bg-danger text-white'
                    : done
                      ? 'border-forest bg-forest text-white'
                      : 'border-hairline-strong bg-surface-raised text-muted',
                  isCurrent && !isFailure && 'ring-4 ring-forest/15',
                )}
              >
                {done && !isFailure ? <Check size={15} strokeWidth={2.5} /> : index + 1}
              </motion.span>

              <p
                className={cn(
                  'mt-2.5 px-1 text-[12.5px] font-medium',
                  isFailure ? 'text-danger-ink' : done ? 'text-ink' : 'text-muted',
                )}
              >
                {step.label}
              </p>

              {entry && (
                <p className="mt-0.5 font-mono text-[10.5px] tabular-nums text-muted">
                  {dateTime(entry.at)}
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Vertical variant for the admin order detail log. */
export function OrderTimelineLog({ timeline }: { timeline: OrderTimelineEntry[] }) {
  return (
    <ol className="space-y-0">
      {[...timeline].reverse().map((entry, index, all) => (
        <li key={`${entry.status}-${entry.at}`} className="relative flex gap-3.5 pb-5 last:pb-0">
          {index < all.length - 1 && (
            <span className="absolute left-[7px] top-4 h-full w-px bg-hairline-strong" />
          )}
          <span
            className={cn(
              'relative z-10 mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-surface-raised',
              index === 0 ? 'bg-forest' : 'bg-hairline-strong',
            )}
          />
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-medium text-ink">{entry.label}</p>
            <p className="mt-0.5 font-mono text-[11px] tabular-nums text-muted">
              {dateTime(entry.at)}
              {entry.actor && ` · ${entry.actor}`}
            </p>
            {entry.note && <p className="mt-1 text-[12.5px] text-body">{entry.note}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
