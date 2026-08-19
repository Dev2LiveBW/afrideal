export default function SupplierOrdersLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2.5">
        <div className="skeleton h-3 w-20" />
        <div className="skeleton h-7 w-40" />
        <div className="skeleton h-3.5 w-96 max-w-full" />
      </div>

      <div className="space-y-5">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="skeleton h-[360px] rounded-md" />
        ))}
      </div>
    </div>
  );
}
