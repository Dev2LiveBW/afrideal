export default function SupplierQuotesLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2.5">
        <div className="skeleton h-3 w-20" />
        <div className="skeleton h-7 w-40" />
        <div className="skeleton h-3.5 w-96 max-w-full" />
      </div>

      <div className="skeleton h-10 rounded" />

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="skeleton h-[500px] rounded-md" />
        <div className="skeleton h-[500px] rounded-md" />
      </div>
    </div>
  );
}
