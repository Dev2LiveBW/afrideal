import { PanelSkeleton, StatGridSkeleton, TableSkeleton } from '@/app/(admin)/admin/_components/Skeletons';

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-console space-y-5 px-6 py-6">
      <div className="mb-2 space-y-2">
        <div className="skeleton h-3 w-24" />
        <div className="skeleton h-7 w-64" />
      </div>

      <StatGridSkeleton count={6} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <PanelSkeleton height={260} className="lg:col-span-2" />
        <PanelSkeleton height={260} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <TableSkeleton rows={8} cols={5} className="lg:col-span-2" />
        <PanelSkeleton height={220} />
      </div>

      <PanelSkeleton height={180} />
    </div>
  );
}
