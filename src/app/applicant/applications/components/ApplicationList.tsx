import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { ApplicationProgress } from "@/components/ui/ApplicationProgress";
import { StatusTag } from "@/components/ui/StatusTag";
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

export function ApplicationList({
  applications,
}: {
  applications: ApplicantApplication[];
}) {
  const scheduledAssessment = applications
    .filter(
      (
        application,
      ): application is ApplicantApplication & {
        scheduled_assessment_at: string;
      } =>
        application.status === "ASSESSMENT_SCHEDULED" &&
        typeof application.scheduled_assessment_at === "string",
    )
    .map((application) => ({
      ...application,
      scheduledTime: Date.parse(application.scheduled_assessment_at),
    }))
    .filter(
      (application) =>
        Number.isFinite(application.scheduledTime),
    )
    .sort((left, right) => left.scheduledTime - right.scheduledTime)[0];

  if (!applications.length) {
    return (
      <div className="mt-6">
        <EmptyState
          action={
            <Link
              className="inline-flex min-h-10 items-center rounded-sm bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary-dark"
              href="/applicant/jobs"
            >
              Browse open jobs
            </Link>
          }
          description="When you apply to an open position, its progress and latest status will appear here."
          title="No applications yet"
        />
      </div>
    );
  }

  return (
    <>
      {scheduledAssessment && (
        <section
          aria-label="Assessment schedule"
          className="mt-6 flex flex-col gap-3 rounded-sm border border-warning/30 border-l-4 border-l-warning bg-warning/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5"
        >
          <div className="min-w-0">
            <h2 className="font-semibold text-warning">Assessment scheduled</h2>
            <p className="mt-1 text-sm text-ink">
              {scheduledAssessment.jobTitle} · {scheduledAssessment.positionLabel}
            </p>
            <time
              className="mt-1 block text-sm text-ink"
              dateTime={scheduledAssessment.scheduled_assessment_at}
            >
              {formatPhilippineDateTime(scheduledAssessment.scheduled_assessment_at)}
            </time>
          </div>
          <Link
            className="inline-flex min-h-10 shrink-0 items-center rounded-sm font-semibold text-warning underline underline-offset-4 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warning"
            href={`/applicant/applications/${scheduledAssessment.id}`}
          >
            View assessment details
          </Link>
        </section>
      )}
      <section
        aria-label="All applications"
        className="mt-6"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line-subtle pb-3">
          <h2 className="font-semibold text-ink">All applications</h2>
          <p className="text-xs text-muted">Newest first</p>
        </div>
        <ul className="mt-3 grid gap-3">
          {applications.map((application) => (
            <li
              className="rounded-sm border border-line-subtle bg-panel p-4 sm:p-5"
              key={application.id}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-ink">
                    {application.jobTitle}
                  </h3>
                  <p className="mt-1 text-xs text-muted">
                    {application.positionLabel} · Submitted{" "}
                    <time dateTime={application.applied_at}>
                      {formatDate(application.applied_at, "MMM D, YYYY")}
                    </time>
                  </p>
                </div>
                <Link
                  className="inline-flex min-h-9 shrink-0 items-center rounded-sm px-2 text-xs font-semibold text-primary hover:bg-primary-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  href={`/applicant/applications/${application.id}`}
                >
                  View details
                </Link>
              </div>
              <ApplicationProgress
                status={application.status}
                variant="milestones"
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {application.status === "ASSESSMENT_SCHEDULED" &&
                  (application.scheduled_assessment_at ? (
                    <StatusTag className="border-warning/30 bg-warning/10 text-warning">
                      Assessment{" "}
                      {formatPhilippineDateTime(
                        application.scheduled_assessment_at,
                      )}
                    </StatusTag>
                  ) : (
                    <p className="text-xs text-warning">
                      Assessment date to be confirmed
                    </p>
                  ))}
                {[
                  "QUALIFIED",
                  "HIRED",
                  "NOT_QUALIFIED",
                  "NOT_SELECTED",
                  "REJECTED",
                ].includes(application.status) && (
                  <WorkflowStatusTag status={application.status} />
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
