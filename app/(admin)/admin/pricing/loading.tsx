import { PanelSkeleton, TableSkeleton } from '@/app/(admin)/admin/_components/Skeletons';

export default function PricingLoading() {
  return (
    <div className="mx-auto max-w-console space-y-5 px-6 py-6">
      <div className="mb-2 space-y-2">
        <div className="skeleton h-3 w-16" />
        <div className="skeleton h-7 w-56" />
      </div>

      <PanelSkeleton height={160} />
      <TableSkeleton rows={6} cols={6} />
    </div>
  );
}
