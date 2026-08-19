import { cn } from '@/lib/utils';

/**
 * Horizontal bar breakdown of a supplier's performance metrics.
 *
 * Shared between the admin supplier detail page and, potentially, the
 * supplier's own portal — a supplier should be able to see the exact same
 * numbers an operator sees when deciding whether to keep routing them
 * orders. No wrapper chrome of its own, so either caller can drop it inside
 * whatever Panel fits its layout.
 */

export interface PerformanceMetric {
  label: string;
  /** 0–100 */
  value: number;
  hint?: string;
}

function barTone(value: number) {
  if (value >= 70) return 'bg-forest';
  if (value >= 40) return 'bg-gold';
  return 'bg-danger';
}

export function PerformanceScore({
  metrics,
  overall,
  overallLabel = 'Composite score',
  className,
}: {
  metrics: PerformanceMetric[];
  overall?: number;
  overallLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn('space-y-4', className)}>
      {overall !== undefined && (
        <div className="flex items-center justify-between rounded-md bg-gold/[0.06] px-4 py-3">
          <p className="text-[12.5px] font-medium text-gold-700">{overallLabel}</p>
          <p className="font-mono text-[20px] font-semibold tabular-nums text-gold-dark">
            {overall.toFixed(0)}
            <span className="text-[12px] font-normal text-gold-700">/100</span>
          </p>
        </div>
      )}

      <div className="space-y-3.5">
        {metrics.map((metric) => (
          <div key={metric.label}>
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <p className="text-[12.5px] font-medium text-ink">{metric.label}</p>
              <p className="shrink-0 font-mono text-[12.5px] tabular-nums text-body">
                {metric.value.toFixed(0)}/100
              </p>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-ink/[0.08]">
              <div
                className={cn('h-full rounded-full transition-all duration-500', barTone(metric.value))}
                style={{ width: `${Math.min(100, Math.max(0, metric.value))}%` }}
              />
            </div>
            {metric.hint && <p className="mt-1 text-[11px] text-muted">{metric.hint}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
