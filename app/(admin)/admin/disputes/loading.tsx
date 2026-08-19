export default function DisputesLoading() {
  return (
    <div className="mx-auto max-w-console space-y-5 px-6 py-6">
      <div className="mb-2 space-y-2">
        <div className="skeleton h-3 w-14" />
        <div className="skeleton h-7 w-48" />
      </div>

      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-9 w-28 rounded-full" />
        ))}
      </div>

      <div className="panel divide-y divide-hairline overflow-hidden">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-start gap-4 p-5">
            <div className="skeleton h-10 w-16 shrink-0" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="skeleton h-3.5 w-40" />
              <div className="skeleton h-4 w-2/3" />
              <div className="skeleton h-3 w-full" />
            </div>
            <div className="skeleton h-8 w-20 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
