import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { getEvaluatorContext } from "@/lib/auth/server";
import { REVIEW_QUEUE_PAGE_SIZE } from "./queue";
import { ApplicantNumberLookup } from "./components/ApplicantNumberLookup";
import { ReviewQueueList } from "./components/ReviewQueueList";

export default async function EvaluatorReviewsPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{
    jobId?: string | string[];
    applicantNumber?: string | string[];
    page?: string | string[];
  }>;
}>) {
  const evaluator = await getEvaluatorContext();
  if (!evaluator) redirect("/login");

  const {
    jobId: requestedJobId,
    applicantNumber: requestedApplicantNumber,
    page: requestedPage,
  } = await searchParams;
  const selectedJobId =
    typeof requestedJobId === "string" ? requestedJobId : undefined;
  const applicantNumber =
    typeof requestedApplicantNumber === "string"
      ? requestedApplicantNumber.trim().toLocaleUpperCase()
      : "";
  const validApplicantNumber = /^APP-\d{4,}$/.test(applicantNumber);
  const parsedPage =
    typeof requestedPage === "string" ? Number(requestedPage) : 1;
  const page =
    Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const [jobsResult, applicantLookupResult] = await Promise.all([
    evaluator.supabase
      .from("v_evaluator_review_queue_summary")
      .select("job_id, job_title, waiting_count, rereview_count")
      .order("waiting_count", { ascending: false }),
    validApplicantNumber
      ? evaluator.supabase
          .from("v_evaluator_review_queue")
          .select(
            "application_id, applicant_number, application_status, applied_at, job_id, job_title, position_title, position_track, review_kind",
          )
          .eq("applicant_number", applicantNumber)
          .order("applied_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);

  const queuePageResult = selectedJobId
    ? await evaluator.supabase
        .from("v_evaluator_review_queue")
        .select(
          "application_id, applicant_number, application_status, applied_at, job_id, job_title, position_title, position_track, review_kind",
          { count: "exact" },
        )
        .eq("job_id", selectedJobId)
        .order("applied_at", { ascending: false })
        .range(
          (page - 1) * REVIEW_QUEUE_PAGE_SIZE,
          page * REVIEW_QUEUE_PAGE_SIZE - 1,
        )
    : { data: [], error: null, count: 0 };

  if (
    jobsResult.error ||
    applicantLookupResult.error ||
    queuePageResult.error
  ) {
    return (
      <>
        <PageHeader
          description="Anonymized applications assigned to your review queue."
          eyebrow="Evaluator workspace"
          title="Review queue"
        />
        <div className="mt-7">
          <EmptyState
            description="Refresh this page to try loading your assigned review queue again."
            title="Review queue unavailable"
          />
        </div>
      </>
    );
  }

  const jobs = jobsResult.data ?? [];
  const matchingApplications = validApplicantNumber
    ? applicantLookupResult.data ?? []
    : [];
  if (matchingApplications.length === 1) {
    const application = matchingApplications[0];
    redirect(
      `/evaluator/applications/${application.application_id}?jobId=${application.job_id}`,
    );
  }

  const waitingCount = queuePageResult.count ?? 0;
  const totalPages = Math.max(
    1,
    Math.ceil(waitingCount / REVIEW_QUEUE_PAGE_SIZE),
  );
  if (selectedJobId && page > totalPages && waitingCount > 0) {
    redirect(
      `/evaluator/reviews?jobId=${selectedJobId}&page=${totalPages}`,
    );
  }

  const applicants = queuePageResult.data ?? [];
  const selectedJob = jobs.find((job) => job.job_id === selectedJobId);

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
            ? "Review your assigned applicants in order. The list is paginated to keep the queue responsive."
            : "View the job postings with applications assigned to you."
        }
        eyebrow={selectedJob ? "Applicants waiting for review" : "Evaluator workspace"}
        title={selectedJob?.job_title ?? "Review queue"}
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
              No assigned applications found for {applicantNumber}.
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
                        {application.job_title}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {application.position_title
                          ? `${application.position_title}${application.position_track ? ` · ${application.position_track}` : ""}`
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
      <ReviewQueueList
        applicants={applicants}
        jobs={jobs}
        page={page}
        selectedJobId={selectedJobId}
        totalPages={totalPages}
        waitingCount={waitingCount}
      />
    </>
  );
}
