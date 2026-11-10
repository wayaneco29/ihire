import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { getEvaluatorContext } from "@/lib/auth/server";
import { formatPositionLabel } from "@/utils/format-position-track";
import { ApplicantNumberLookup } from "./components/ApplicantNumberLookup";
import { ReviewQueueList } from "./components/ReviewQueueList";
import { buildReviewQueueItems } from "./queue";

export default async function EvaluatorReviewsPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{
    jobId?: string | string[];
    applicantNumber?: string | string[];
  }>;
}>) {
  const evaluator = await getEvaluatorContext();
  if (!evaluator) redirect("/login");

  const {
    jobId: requestedJobId,
    applicantNumber: requestedApplicantNumber,
  } = await searchParams;
  const selectedJobId =
    typeof requestedJobId === "string" ? requestedJobId : undefined;
  const applicantNumber =
    typeof requestedApplicantNumber === "string"
      ? requestedApplicantNumber.trim().toLocaleUpperCase()
      : "";
  const validApplicantNumber = /^APP-\d{4,}$/.test(applicantNumber);

  const [applicantsResult, documentsResult] = await Promise.all([
    evaluator.supabase
      .from("v_anonymized_applicants")
      .select(
        "application_id, applicant_number, application_status, applied_at, job_id, position_title, position_track",
      )
      .order("applied_at", { ascending: false }),
    evaluator.supabase
      .from("v_anonymized_documents")
      .select(
        "application_id, document_id, document_type, document_status, uploaded_at",
      )
      .order("uploaded_at", { ascending: false }),
  ]);

  if (applicantsResult.error || documentsResult.error) {
    return (
      <>
        <PageHeader
          description="Anonymized applications and documents assigned to the review queue."
          eyebrow="Evaluator workspace"
          title="Review queue"
        />
        <div className="mt-7">
          <EmptyState
            description="Refresh this page to try loading the anonymized review queue again."
            title="Review queue unavailable"
          />
        </div>
      </>
    );
  }

  const applicants = applicantsResult.data ?? [];
  const jobIds = [...new Set(applicants.map((applicant) => applicant.job_id))];
  const jobsResult = jobIds.length
    ? await evaluator.supabase
        .from("job_postings")
        .select("id, title")
        .in("id", jobIds)
    : { data: [], error: null };
  if (jobsResult.error) {
    return (
      <>
        <PageHeader
          description="Choose a job posting to review its pending applicants."
          eyebrow="Evaluator workspace"
          title="Review queue"
        />
        <div className="mt-7">
          <EmptyState
            description="Refresh this page to try loading job postings again."
            title="Job postings unavailable"
          />
        </div>
      </>
    );
  }

  const jobTitles = new Map(
    (jobsResult.data ?? []).map((job) => [job.id, job.title] as const),
  );
  const matchingApplications = validApplicantNumber
    ? applicants.filter(
        (applicant) => applicant.applicant_number === applicantNumber,
      )
    : [];
  if (matchingApplications.length === 1) {
    const application = matchingApplications[0];
    redirect(
      `/evaluator/applications/${application.application_id}?jobId=${application.job_id}`,
    );
  }

  const queueItems = buildReviewQueueItems(
    applicants,
    documentsResult.data ?? [],
    jobTitles,
  );
  const selectedJob = queueItems.find((item) => item.job_id === selectedJobId);

  return (
    <>
      <PageHeader
        actions={
          selectedJob ? (
            <Link
              className="inline-flex min-h-11 items-center rounded-sm border border-line-strong px-4 text-sm font-semibold text-ink transition hover:bg-panel-muted"
              href="/evaluator/reviews"
            >
              All job postings
            </Link>
          ) : undefined
        }
        description={
          selectedJob
            ? "Review applicants in order. Use the previous and next controls to move through this posting."
            : "Choose a job posting to see its pending applicants and start reviewing."
        }
        eyebrow={
          selectedJob ? "Applicants waiting for review" : "Evaluator workspace"
        }
        title={selectedJob?.jobTitle ?? "Review queue"}
      />
      <ApplicantNumberLookup initialApplicantNumber={applicantNumber} />
      {applicantNumber && (
        <section
          aria-live="polite"
          className="mt-4 rounded-sm border border-line bg-panel p-4"
        >
          {!validApplicantNumber ? (
            <p className="text-sm text-danger">
              Enter an applicant number such as APP-0001.
            </p>
          ) : matchingApplications.length === 0 ? (
            <p className="text-sm text-muted">
              No applications found for {applicantNumber}.
            </p>
          ) : (
            <>
              <h2 className="font-semibold text-ink">
                Choose an application for {applicantNumber}
              </h2>
              <ul className="mt-3 divide-y divide-line-subtle">
                {matchingApplications.map((application) => (
                  <li
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                    key={application.application_id}
                  >
                    <div>
                      <p className="text-sm font-medium text-ink">
                        {jobTitles.get(application.job_id) ??
                          "Job posting unavailable"}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {application.position_title
                          ? formatPositionLabel(
                              application.position_title,
                              application.position_track ?? "",
                            )
                          : "Position not recorded"}
                      </p>
                    </div>
                    <Link
                      className="inline-flex min-h-10 items-center rounded-sm bg-primary px-3 text-sm font-semibold text-on-primary hover:bg-primary-dark"
                      href={`/evaluator/applications/${application.application_id}?jobId=${application.job_id}`}
                    >
                      Enter points
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}
      <ReviewQueueList items={queueItems} selectedJobId={selectedJobId} />
    </>
  );
}
