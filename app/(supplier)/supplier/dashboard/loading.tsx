export default function SupplierDashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2.5">
          <div className="skeleton h-3 w-28" />
          <div className="skeleton h-7 w-64" />
          <div className="skeleton h-3.5 w-48" />
        </div>
        <div className="skeleton h-7 w-24 rounded-full" />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="skeleton h-[112px] rounded-md" />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.05fr_1fr]">
        <div className="skeleton h-[340px] rounded-md" />
        <div className="skeleton h-[340px] rounded-md" />
      </div>

      <div className="space-y-3">
        <div className="skeleton h-3 w-24" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="skeleton h-[68px] rounded-md" />
          ))}
        </div>
      </div>
    </div>
  );
}
