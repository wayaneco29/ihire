import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { WorkflowStatusTag } from "@/components/ui/WorkflowStatusTag";
import { formatDate } from "@/utils/format-date";
import { formatPhilippineDateTime } from "@/utils/philippine-time";

export type ApplicantApplication = {
  id: string;
  status: string;
  applied_at: string;
  scheduled_assessment_at: string | null;
  jobTitle: string;
  positionLabel: string;
};

function ApplicationSummary({
  applications,
}: {
  applications: ApplicantApplication[];
}) {
  const summaries = [
    { label: "Total applications", value: applications.length },
    {
      label: "In review",
      value: applications.filter((application) =>
        ["SUBMITTED", "UNDER_EVALUATION", "ASSESSMENT_SCHEDULED"].includes(application.status),
      ).length,
    },
    {
      label: "Qualified",
      value: applications.filter(
        (application) => application.status === "QUALIFIED",
      ).length,
    },
    {
      label: "Final outcomes",
      value: applications.filter((application) =>
        ["HIRED", "NOT_QUALIFIED", "REJECTED"].includes(application.status),
      ).length,
    },
  ];

  return (
    <dl className="mt-7 grid grid-cols-2 overflow-hidden rounded-sm border border-line-subtle bg-panel sm:grid-cols-4">
      {summaries.map((summary, index) => (
        <div
          className={`px-4 py-4 sm:px-5 ${
            index > 0 ? "border-l border-line-subtle" : ""
          } ${index === 2 ? "border-t border-line-subtle sm:border-t-0" : ""} ${
            index === 3 ? "border-t border-line-subtle sm:border-t-0" : ""
          }`}
          key={summary.label}
        >
          <dt className="mt-1 text-xs text-muted">{summary.label}</dt>
          <dd className="mt-1 text-2xl font-semibold tracking-tight text-ink">
            {summary.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function ApplicationList({
  applications,
}: {
  applications: ApplicantApplication[];
}) {
  if (!applications.length) {
    return (
      <>
        <ApplicationSummary applications={applications} />
        <div className="mt-5">
          <EmptyState
            description="When you apply to an open position, its progress and latest status will appear here."
            title="No applications yet"
          />
        </div>
      </>
    );
  }

  return (
    <>
      <ApplicationSummary applications={applications} />
      <section
        aria-label="Submitted applications"
        className="mt-5 overflow-hidden rounded-sm border border-line-subtle bg-panel"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line-subtle px-4 py-4 sm:px-5">
          <h2 className="font-semibold text-ink">Application register</h2>
          <p className="text-xs text-muted">
            {applications.length}{" "}
            {applications.length === 1 ? "position" : "positions"}, newest first
          </p>
        </div>
        <ul className="divide-y divide-line-subtle">
          {applications.map((application) => (
            <li
              className="grid gap-3 px-4 py-4 transition-colors hover:bg-panel-muted/60 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:gap-6 sm:px-5"
              key={application.id}
            >
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold text-ink">
                  {application.jobTitle}
                </h3>
                <p className="mt-1 text-xs text-muted">
                  Applying for {application.positionLabel}
                </p>
                <p className="mt-1 text-xs text-muted">
                  Submitted{" "}
                  <time dateTime={application.applied_at}>
                    {formatDate(application.applied_at, "MMM D, YYYY")}
                  </time>
                </p>
              </div>
              <div>
                <WorkflowStatusTag status={application.status} />
                {application.scheduled_assessment_at && (
                  <p className="mt-1 text-xs text-muted">
                    Assessment:{" "}
                    {formatPhilippineDateTime(
                      application.scheduled_assessment_at,
                    )}
                  </p>
                )}
              </div>
              <Link
                className="inline-flex min-h-10 items-center rounded-sm px-3 text-sm font-semibold text-primary transition hover:bg-primary-light sm:justify-self-end"
                href={`/applicant/applications/${application.id}`}
              >
                View details
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
