'use client';

import { useEffect, useRef, useState } from 'react';
import { animate, useInView } from 'framer-motion';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

import { bwpBare } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * Console stat card. Counts up once when it scrolls into view, then holds.
 * Respects prefers-reduced-motion by snapping straight to the final value.
 */

export function StatCard({
  label,
  value,
  format = 'number',
  delta,
  deltaLabel,
  hint,
  icon,
  accent = 'ink',
  className,
}: {
  label: string;
  value: number;
  format?: 'number' | 'money' | 'percent';
  /** Percentage change against the prior period. */
  delta?: number;
  deltaLabel?: string;
  hint?: string;
  icon?: React.ReactNode;
  accent?: 'ink' | 'gold' | 'forest' | 'danger';
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;

    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduce) {
      setDisplay(value);
      return;
    }

    const controls = animate(0, value, {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => setDisplay(latest),
    });

    return () => controls.stop();
  }, [inView, value]);

  const rendered =
    format === 'money'
      ? bwpBare(display)
      : format === 'percent'
        ? `${display.toFixed(1)}%`
        : Math.round(display).toLocaleString('en-GB');

  const accents = {
    ink: 'text-ink',
    gold: 'text-gold-dark',
    forest: 'text-forest',
    danger: 'text-danger-ink',
  };

  const iconGrounds = {
    ink: 'bg-ink/[0.06] text-ink',
    gold: 'bg-gold-50 text-gold-dark',
    forest: 'bg-forest-wash text-forest',
    danger: 'bg-danger-wash text-danger-ink',
  };

  return (
    <div
      ref={ref}
      className={cn(
        'group relative overflow-hidden rounded-md border border-hairline bg-surface-raised p-5',
        'shadow-card transition-shadow duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-lift',
        className,
      )}
    >
      {/* A faint wash that only shows on the accented cards. */}
      {accent !== 'ink' && (
        <div
          className={cn(
            'pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-[0.07] blur-2xl',
            accent === 'gold' ? 'bg-gold' : accent === 'forest' ? 'bg-forest' : 'bg-danger',
          )}
        />
      )}

      <div className="flex items-start justify-between gap-3">
        <p className="eyebrow">{label}</p>
        {icon && (
          <span
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
              iconGrounds[accent],
            )}
          >
            {icon}
          </span>
        )}
      </div>

      <p
        className={cn(
          'mt-3 font-mono text-[26px] font-semibold leading-8 tabular-nums tracking-[-0.02em]',
          accents[accent],
        )}
      >
        {format === 'money' && <span className="mr-1 text-[15px] font-medium opacity-55">BWP</span>}
        {rendered}
      </p>

      {(delta !== undefined || hint) && (
        <div className="mt-2 flex items-center gap-2 text-[12px]">
          {delta !== undefined && (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 font-medium',
                delta >= 0 ? 'text-forest' : 'text-danger-ink',
              )}
            >
              {delta >= 0 ? (
                <ArrowUpRight size={13} strokeWidth={1.75} />
              ) : (
                <ArrowDownRight size={13} strokeWidth={1.75} />
              )}
              {Math.abs(delta).toFixed(1)}%
            </span>
          )}
          <span className="text-muted">{deltaLabel ?? hint}</span>
        </div>
      )}
    </div>
  );
}
