type SkeletonLoaderProps = {
  label?: string;
  rows?: number;
};

export function SkeletonLoader({
  label = "Loading content",
  rows = 3,
}: SkeletonLoaderProps) {
  return (
    <div
      aria-busy="true"
      aria-label={label}
      className="space-y-4"
      role="status"
    >
      <span className="sr-only">{label}</span>
      <div
        aria-hidden="true"
        className="h-7 w-2/5 animate-pulse rounded-sm bg-panel-muted"
      />
      <div
        aria-hidden="true"
        className="h-4 w-3/5 animate-pulse rounded-sm bg-panel-muted"
      />
      <div className="grid gap-3 pt-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: rows }, (_, index) => (
          <div
            aria-hidden="true"
            className="space-y-4 rounded-sm border border-line bg-panel p-5 shadow-card"
            key={index}
          >
            <div className="h-4 w-2/5 animate-pulse rounded bg-panel-muted" />
            <div className="h-8 w-1/3 animate-pulse rounded bg-panel-muted" />
            <div className="h-3 w-4/5 animate-pulse rounded bg-panel-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
