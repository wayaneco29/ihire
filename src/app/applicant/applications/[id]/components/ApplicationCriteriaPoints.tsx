export type ApplicationCriterionPointsRow = {
  id: string;
  title: string;
  maximumPoints: number;
  earnedPoints: number | null;
  earnedStatus: "scored" | "not_scored" | "unavailable";
};

export function ApplicationCriteriaPoints({
  rows,
  unavailable = false,
  unavailableMessage = "Criteria points are unavailable right now. Refresh the page to try again.",
}: Readonly<{
  rows: ApplicationCriterionPointsRow[];
  unavailable?: boolean;
  unavailableMessage?: string;
}>) {
  return (
    <section className="rounded-2xl border border-line bg-panel p-5 shadow-card sm:p-7">
      <div className="border-b border-line-subtle pb-4">
        <h2 className="text-lg font-semibold tracking-tight text-ink">
          Criteria points
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          Current points and maximum points for this application.
        </p>
      </div>
      {unavailable ? (
        <p className="mt-4 text-sm text-muted" role="status">
          {unavailableMessage}
        </p>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted">
          No scoring criteria are configured for this position.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-line-subtle">
          {rows.map((row) => (
            <li
              className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
              key={row.id}
            >
              <span className="text-sm font-medium text-ink">{row.title}</span>
              <span className="text-sm text-muted">
                {row.earnedStatus === "scored" && row.earnedPoints !== null
                  ? `${row.earnedPoints.toFixed(2)} / ${row.maximumPoints.toFixed(2)} points`
                  : row.earnedStatus === "unavailable"
                    ? `Score unavailable / ${row.maximumPoints.toFixed(2)} points`
                    : `Not scored yet / ${row.maximumPoints.toFixed(2)} points`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
