import { StatGridSkeleton, TableSkeleton } from '@/app/(admin)/admin/_components/Skeletons';

export default function EscrowLoading() {
  return (
    <div className="mx-auto max-w-console space-y-5 px-6 py-6">
      <div className="mb-2 space-y-2">
        <div className="skeleton h-3 w-16" />
        <div className="skeleton h-7 w-48" />
      </div>

      <StatGridSkeleton count={5} />

      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-9 w-32 rounded-full" />
        ))}
      </div>

      <TableSkeleton rows={8} cols={8} />
    </div>
  );
}
