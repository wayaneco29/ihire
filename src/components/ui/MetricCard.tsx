type MetricCardProps = {
  label: string;
  value: number | string;
};

export function MetricCard({ label, value }: Readonly<MetricCardProps>) {
  return (
    <div className="rounded-xl border border-line bg-panel px-5 py-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );
}
