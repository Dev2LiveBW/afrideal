import { PanelSkeleton, StatGridSkeleton, TableSkeleton } from '@/app/(admin)/admin/_components/Skeletons';

export default function AnalyticsLoading() {
  return (
    <div className="mx-auto max-w-console space-y-5 px-6 py-6">
      <div className="mb-2 space-y-2">
        <div className="skeleton h-3 w-20" />
        <div className="skeleton h-7 w-64" />
      </div>

      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton h-9 w-32 rounded-full" />
        ))}
      </div>

      <StatGridSkeleton count={4} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <PanelSkeleton height={260} className="lg:col-span-2" />
        <PanelSkeleton height={260} />
      </div>

      <TableSkeleton rows={6} cols={6} />
      <PanelSkeleton height={200} />
    </div>
  );
}
