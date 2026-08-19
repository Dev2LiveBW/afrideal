import { DetailSkeleton } from '@/app/(admin)/admin/_components/Skeletons';

export default function ProductDetailLoading() {
  return (
    <div className="mx-auto max-w-console space-y-5 px-6 py-6">
      <div className="mb-2 space-y-2">
        <div className="skeleton h-3 w-24" />
        <div className="skeleton h-7 w-80" />
        <div className="skeleton h-3.5 w-96" />
      </div>

      <DetailSkeleton />
    </div>
  );
}
