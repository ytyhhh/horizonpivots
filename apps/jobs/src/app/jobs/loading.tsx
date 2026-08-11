export default function JobsLoading() {
  return (
    <div className="page-shell py-10">
      <div className="h-3 w-28 animate-pulse rounded-full bg-surface-strong" />
      <div className="mt-5 h-12 w-80 max-w-full animate-pulse rounded-xl bg-surface-strong" />
      <div className="mt-8 h-28 animate-pulse rounded-[1.2rem] bg-surface" />
      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-40 animate-pulse rounded-[1.1rem] bg-surface"
          />
        ))}
      </div>
    </div>
  );
}
