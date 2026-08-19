export default function SupplierEarningsLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2.5">
        <div className="skeleton h-3 w-20" />
        <div className="skeleton h-7 w-44" />
        <div className="skeleton h-3.5 w-96 max-w-full" />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="skeleton h-[112px] rounded-md" />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="skeleton h-[320px] rounded-md" />
        <div className="skeleton h-[320px] rounded-md" />
      </div>

      <div className="skeleton h-[280px] rounded-md" />
      <div className="skeleton h-[180px] rounded-md" />
    </div>
  );
}
