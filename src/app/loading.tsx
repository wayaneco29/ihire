export default function Loading() {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="grid min-h-64 place-items-center rounded-2xl border border-slate-200 bg-white p-8"
      role="status"
    >
      <span className="flex items-center gap-3 text-sm font-medium text-muted">
        <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
        Loading your workspace…
      </span>
    </div>
  );
}
