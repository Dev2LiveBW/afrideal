import { PanelSkeleton } from '@/app/(admin)/admin/_components/Skeletons';

export default function SettingsLoading() {
  return (
    <div className="mx-auto max-w-console space-y-5 px-6 py-6">
      <div className="mb-2 space-y-2">
        <div className="skeleton h-3 w-20" />
        <div className="skeleton h-7 w-56" />
      </div>

      <PanelSkeleton height={60} title={false} />
      <PanelSkeleton height={100} />
      <PanelSkeleton height={140} />
      <PanelSkeleton height={140} />
    </div>
  );
}
