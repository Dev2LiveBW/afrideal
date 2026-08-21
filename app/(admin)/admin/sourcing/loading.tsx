import { TableSkeleton } from '@/app/(admin)/admin/_components/Skeletons';

export default function SourcingLoading() {
  return (
    <div className="mx-auto max-w-console space-y-5 px-6 py-6">
      <div className="skeleton h-16 w-full max-w-lg" />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((card) => (
          <div key={card} className="skeleton h-28 w-full" />
        ))}
      </div>
      <TableSkeleton />
    </div>
  );
}
