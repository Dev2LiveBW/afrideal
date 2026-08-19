export default function SupplierProductsLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2.5">
        <div className="skeleton h-3 w-24" />
        <div className="skeleton h-7 w-48" />
        <div className="skeleton h-3.5 w-80" />
      </div>

      <div className="flex items-center justify-between">
        <div className="skeleton h-3.5 w-40" />
        <div className="skeleton h-9 w-32 rounded-full" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="skeleton h-[220px] rounded-md" />
        ))}
      </div>
    </div>
  );
}
