export default function RunnerDashboardLoading() {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="skeleton h-3 w-24" />
        <div className="skeleton h-7 w-40" />
        <div className="skeleton h-3.5 w-48" />
      </div>

      <div className="skeleton h-[76px] rounded-lg" />

      <div className="grid grid-cols-2 gap-3">
        <div className="skeleton h-[92px] rounded-md" />
        <div className="skeleton h-[92px] rounded-md" />
      </div>

      <div className="skeleton h-[260px] rounded-lg" />
      <div className="skeleton h-[140px] rounded-lg" />
    </div>
  );
}
