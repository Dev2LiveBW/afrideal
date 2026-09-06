export default function SourcingLoading() {
  return (
    <div className="space-y-5">
      <div className="skeleton h-16 w-full max-w-md" />
      <div className="skeleton h-9 w-64" />
      <div className="space-y-4">
        {[0, 1, 2].map((row) => (
          <div key={row} className="skeleton h-40 w-full" />
        ))}
      </div>
    </div>
  );
}
