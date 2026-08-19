export default function RunnerJobsLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="skeleton h-3 w-24" />
        <div className="skeleton h-7 w-24" />
        <div className="skeleton h-3.5 w-56" />
      </div>

      <div className="space-y-3">
        <div className="skeleton h-3 w-20" />
        <div className="skeleton h-[280px] rounded-lg" />
      </div>

      <div className="space-y-3">
        <div className="skeleton h-3 w-28" />
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="skeleton h-[168px] rounded-lg" />
        ))}
      </div>
    </div>
  );
}
