export default function RunnerEarningsLoading() {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="skeleton h-3 w-24" />
        <div className="skeleton h-7 w-32" />
        <div className="skeleton h-3.5 w-52" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="skeleton h-[92px] rounded-md" />
        <div className="skeleton h-[92px] rounded-md" />
      </div>

      <div className="skeleton h-[92px] rounded-md" />
      <div className="skeleton h-[260px] rounded-md" />
      <div className="skeleton h-[240px] rounded-md" />
      <div className="skeleton h-[90px] rounded-md" />
    </div>
  );
}
