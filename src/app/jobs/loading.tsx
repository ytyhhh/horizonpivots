export default function JobsLoading() {
  return (
    <div className="page-shell py-12">
      <div className="h-10 w-64 animate-pulse rounded-xl bg-surface-strong" />
      <div className="mt-8 h-24 animate-pulse rounded-2xl bg-surface" />
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-52 animate-pulse rounded-2xl border bg-surface"
          />
        ))}
      </div>
    </div>
  );
}
