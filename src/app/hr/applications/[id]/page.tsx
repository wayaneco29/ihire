import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { WorkflowStatusTag } from "@/components/ui/WorkflowStatusTag";
import { getHrContext } from "@/lib/auth/server";
import { formatDate } from "@/utils/format-date";
import { getHrApplicationStatusDescription } from "@/utils/hr-application-status";

const POSTING_REVIEW_STATUSES = new Set(["QUALIFIED", "HIRED", "NOT_SELECTED"]);

export default async function HrApplicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const hr = await getHrContext();
  if (!hr) redirect("/");
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { data: application, error: applicationError } = await hr.supabase
    .from("v_staff_application_reviews")
    .select(
      "application_id, applicant_name, applicant_number, application_status, applied_at, job_id, position_title, job_title",
    )
    .eq("application_id", id)
    .maybeSingle();

  if (applicationError || !application) notFound();

  const postingHref = `/hr/postings/${application.job_id}`;
  const canOpenReview = POSTING_REVIEW_STATUSES.has(
    application.application_status,
  );
  const reviewHref = canOpenReview
    ? `${postingHref}?applicationId=${encodeURIComponent(application.application_id)}`
    : postingHref;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        description={application.job_title}
        eyebrow="HR workspace · Application"
        title={application.applicant_name}
        backHref={reviewHref}
        backLabel={canOpenReview ? "Back to applicants" : "Job posting"}
      />

      <section
        aria-labelledby="application-status-heading"
        className="mt-7 rounded-sm border border-line bg-panel p-5 sm:p-7"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2
            className="text-lg font-semibold text-ink"
            id="application-status-heading"
          >
            Application status
          </h2>
          <WorkflowStatusTag status={application.application_status} />
        </div>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
          {getHrApplicationStatusDescription(application.application_status)}
        </p>

        <dl className="mt-6 grid gap-x-6 gap-y-4 border-t border-line-subtle pt-5 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-muted">Job posting</dt>
            <dd className="mt-1 text-sm font-semibold text-ink">
              {application.job_title}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted">Position</dt>
            <dd className="mt-1 text-sm font-semibold text-ink">
              {application.position_title ?? "Position not recorded"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted">Applied</dt>
            <dd className="mt-1 text-sm font-semibold text-ink">
              {formatDate(application.applied_at, "MMM D, YYYY · h:mm A")}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted">Applicant name</dt>
            <dd className="mt-1 text-sm font-semibold text-ink">{application.applicant_name}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted">Applicant number</dt>
            <dd className="mt-1 text-sm font-semibold text-ink">
              {application.applicant_number}
            </dd>
          </div>
        </dl>

        <div className="mt-6 flex flex-wrap gap-3 border-t border-line-subtle pt-5">
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-[8px] bg-primary px-4 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            href={reviewHref}
          >
            {canOpenReview ? "Open posting review" : "View posting"}
          </Link>
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-[8px] border-[1.5px] border-primary px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            href={`/hr/applications/${application.application_id}/pds/download`}
          >
            Download PDS
          </Link>
        </div>
      </section>
    </div>
  );
}
