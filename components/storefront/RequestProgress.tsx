import { REQUEST_LABELS, REQUEST_STEPS, stepIndex } from '@/lib/runner-requests';
import { cn } from '@/lib/utils';
import type { RunnerRequestStatus } from '@/types';

/**
 * Where a sourcing request has got to, drawn as a rail rather than a badge.
 *
 * A sourcing request has seven states, which is too many to hold in your head
 * from a status word alone: "sourcing" only means something if you can see it
 * sits after "accepted" and before a price arrives. The rail fills to the state
 * reached and names the current one underneath, so the same object answers both
 * "where is it" and "what happens next".
 *
 * Cancellation is drawn as an ended rail rather than as an eighth segment. It
 * is an exit from the sequence, not a further step along it.
 */
export function RequestProgress({
  status,
  className,
}: {
  status: RunnerRequestStatus;
  className?: string;
}) {
  const cancelled = status === 'CANCELLED';
  const reached = cancelled ? -1 : stepIndex(status);
  const done = status === 'CONFIRMED';

  return (
    <div className={cn('min-w-0', className)}>
      <div className="flex items-center gap-1" role="presentation">
        {REQUEST_STEPS.map((step, index) => (
          <span
            key={step}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors duration-500',
              cancelled
                ? 'bg-inert-wash'
                : index <= reached
                  ? done
                    ? 'bg-forest'
                    : 'bg-gold'
                  : 'bg-ink/[0.08]',
            )}
          />
        ))}
      </div>

      <p
        className={cn(
          'mt-2 text-[12.5px] font-medium',
          cancelled ? 'text-inert-ink' : done ? 'text-forest' : 'text-gold-700',
        )}
      >
        {REQUEST_LABELS[status]}
        {!cancelled && !done && (
          <span className="ml-1.5 font-mono text-[11px] font-normal tabular-nums text-muted">
            step {reached + 1} of {REQUEST_STEPS.length}
          </span>
        )}
      </p>
    </div>
  );
}
