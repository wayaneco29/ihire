export type ApplicationCriterionPointsRow = {
  id: string;
  title: string;
  maximumPoints: number;
  earnedPoints: number | null;
  earnedStatus: "scored" | "not_scored" | "unavailable";
  detail?: string;
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
  const provisionalPoints = rows.reduce(
    (total, row) =>
      total +
      (row.earnedStatus === "scored" ? (row.earnedPoints ?? 0) : 0),
    0,
  );
  const maximumPoints = rows.reduce(
    (total, row) => total + row.maximumPoints,
    0,
  );

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
        <>
          <ul className="mt-4 divide-y divide-line-subtle">
            {rows.map((row) => (
              <li
                className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
                key={row.id}
              >
                <div>
                  <span className="text-sm font-medium text-ink">
                    {row.title}
                  </span>
                  {row.detail && (
                    <p className="mt-1 text-xs leading-5 text-muted">
                      {row.detail}
                    </p>
                  )}
                </div>
                <span className="text-sm text-muted">
                  {row.earnedStatus === "scored" &&
                  row.earnedPoints !== null ? (
                    <>
                      <strong className="font-bold text-ink">
                        {row.earnedPoints.toFixed(2)}
                      </strong>{" "}
                      / {row.maximumPoints.toFixed(2)} points
                    </>
                  ) : row.earnedStatus === "unavailable" ? (
                    `Score unavailable / ${row.maximumPoints.toFixed(2)} points`
                  ) : (
                    `Not scored yet / ${row.maximumPoints.toFixed(2)} points`
                  )}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/20 bg-primary-light/40 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-ink">
                Provisional total
              </p>
              <p className="mt-1 text-xs leading-5 text-muted">
                This is not a final score. Evaluator review may change it.
              </p>
            </div>
            <p className="text-sm text-muted">
              <strong className="font-bold text-ink">
                {provisionalPoints.toFixed(2)}
              </strong>{" "}
              / {maximumPoints.toFixed(2)} points
            </p>
          </div>
        </>
      )}
    </section>
  );
}
