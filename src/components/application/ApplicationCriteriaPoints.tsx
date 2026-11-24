import type { ApplicationCriterionPointsRow } from "@/types/application-criterion-points";

export function ApplicationCriteriaPoints({
  rows,
  unavailable = false,
  unavailableMessage = "Criteria points are unavailable right now. Refresh the page to try again.",
  description = "Your current points out of the maximum for each criterion.",
}: Readonly<{
  rows: ApplicationCriterionPointsRow[];
  unavailable?: boolean;
  unavailableMessage?: string;
  description?: string;
}>) {
  return (
    <section aria-labelledby="criteria-points-heading">
      <div className="border-b border-line-subtle pb-4">
        <h2
          className="text-lg font-semibold tracking-tight text-ink"
          id="criteria-points-heading"
        >
          Criteria points
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
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
              className="flex flex-col gap-1.5 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-5"
              key={row.id}
            >
              <div className="min-w-0">
                <span className="text-sm font-medium text-ink">
                  {row.title}
                </span>
                {row.detail && (
                  <p className="mt-1 text-xs leading-5 text-muted">
                    {row.detail}
                  </p>
                )}
              </div>
              <span className="shrink-0 text-sm text-muted sm:text-right">
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
      )}
    </section>
  );
}

export function ApplicationProvisionalTotal({
  rows,
  unavailable = false,
  title = "Provisional total",
  note = "This is not a final score. Evaluator review may change it.",
}: Readonly<{
  rows: ApplicationCriterionPointsRow[];
  unavailable?: boolean;
  title?: string;
  note?: string;
}>) {
  const provisionalPoints = rows.reduce(
    (total, row) =>
      total + (row.earnedStatus === "scored" ? (row.earnedPoints ?? 0) : 0),
    0,
  );
  const maximumPoints = rows.reduce(
    (total, row) => total + row.maximumPoints,
    0,
  );

  return (
    <section
      aria-labelledby="application-total-heading"
      className="bg-primary-light p-5"
    >
      <h2
        className="text-sm font-semibold text-ink"
        id="application-total-heading"
      >
        {title}
      </h2>
      {unavailable ? (
        <p className="mt-3 text-sm text-muted" role="status">
          Score unavailable
        </p>
      ) : rows.length ? (
        <>
          <p className="mt-2 flex items-baseline gap-2 text-muted">
            <strong className="text-3xl font-semibold tracking-tight text-primary">
              {provisionalPoints.toFixed(2)}
            </strong>
            <span className="text-sm">/ {maximumPoints.toFixed(2)} points</span>
          </p>
          <p className="mt-2 text-xs leading-5 text-muted">{note}</p>
        </>
      ) : (
        <p className="mt-2 text-sm text-muted">
          No criteria are available to score this application.
        </p>
      )}
    </section>
  );
}
