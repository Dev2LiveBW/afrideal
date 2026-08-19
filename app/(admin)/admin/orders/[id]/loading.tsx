import { PanelSkeleton } from '@/app/(admin)/admin/_components/Skeletons';

export default function OrderDetailLoading() {
  return (
    <div className="mx-auto max-w-console space-y-5 px-6 py-6">
      <div className="mb-2 space-y-2">
        <div className="skeleton h-3 w-28" />
        <div className="skeleton h-7 w-48" />
        <div className="skeleton h-3.5 w-80" />
      </div>

      <PanelSkeleton height={110} title={false} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <PanelSkeleton height={180} />
        <PanelSkeleton height={180} />
        <PanelSkeleton height={180} />
      </div>

      <PanelSkeleton height={220} />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <PanelSkeleton height={160} />
        <PanelSkeleton height={160} />
      </div>
    </div>
  );
}
