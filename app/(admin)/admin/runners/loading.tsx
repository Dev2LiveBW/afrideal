import { PanelSkeleton, StatGridSkeleton } from '@/app/(admin)/admin/_components/Skeletons';

export default function RunnersLoading() {
  return (
    <div className="mx-auto max-w-console space-y-5 px-6 py-6">
      <div className="mb-2 space-y-2">
        <div className="skeleton h-3 w-24" />
        <div className="skeleton h-7 w-56" />
      </div>

      <StatGridSkeleton count={4} />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        <PanelSkeleton height={220} />
        <PanelSkeleton height={220} />
        <PanelSkeleton height={220} />
      </div>
    </div>
  );
}
