import { CardGridSkeleton } from '@/app/(admin)/admin/_components/Skeletons';

export default function ProductsLoading() {
  return (
    <div className="mx-auto max-w-console space-y-5 px-6 py-6">
      <div className="mb-2 space-y-2">
        <div className="skeleton h-3 w-20" />
        <div className="skeleton h-7 w-64" />
      </div>

      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton h-9 w-28 rounded-full" />
        ))}
      </div>

      <CardGridSkeleton count={8} />
    </div>
  );
}
