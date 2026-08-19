import { cn } from '@/lib/utils';

/**
 * Composable loading-state building blocks for every /admin route.
 *
 * One shared vocabulary so a route's `loading.tsx` never invents its own
 * skeleton shape — the console should feel like it is still there while data
 * loads, not like a different, simpler screen flashed in front of it.
 */

export function StatGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-md border border-hairline bg-surface-raised p-5">
          <div className="skeleton h-2.5 w-20" />
          <div className="skeleton mt-4 h-7 w-24" />
          <div className="skeleton mt-3 h-2.5 w-16" />
        </div>
      ))}
    </div>
  );
}

export function PanelSkeleton({
  height = 260,
  title = true,
  className,
}: {
  height?: number;
  title?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('panel overflow-hidden', className)}>
      {title && (
        <div className="panel-header">
          <div className="skeleton h-4 w-40" />
        </div>
      )}
      <div className="p-5">
        <div className="skeleton w-full" style={{ height }} />
      </div>
    </div>
  );
}

export function TableSkeleton({
  rows = 6,
  cols = 5,
  className,
}: {
  rows?: number;
  cols?: number;
  className?: string;
}) {
  return (
    <div className={cn('panel overflow-hidden', className)}>
      <div className="panel-header">
        <div className="skeleton h-4 w-36" />
        <div className="skeleton h-8 w-28 rounded-full" />
      </div>
      <div className="space-y-4 p-5">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4">
            {Array.from({ length: cols }).map((_, c) => (
              <div key={c} className={cn('skeleton h-4', c === 0 ? 'w-1/4' : 'flex-1')} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">
        <PanelSkeleton height={180} />
        <PanelSkeleton height={280} />
      </div>
      <div className="space-y-5">
        <PanelSkeleton height={150} />
        <PanelSkeleton height={150} />
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-md border border-hairline bg-surface-raised">
          <div className="skeleton aspect-[4/3] rounded-none" />
          <div className="space-y-2.5 p-4">
            <div className="skeleton h-4 w-3/4" />
            <div className="skeleton h-3 w-full" />
            <div className="skeleton mt-3 h-5 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
