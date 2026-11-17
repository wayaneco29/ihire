import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeftIcon,
  ClipboardDocumentCheckIcon,
} from "@heroicons/react/24/outline";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { getEvaluatorContext } from "@/lib/auth/server";
import { REVIEW_QUEUE_PAGE_SIZE, reviewQueueHref, reviewQueueStatus } from "./queue";
import { ApplicantNumberLookup } from "./components/ApplicantNumberLookup";
import { ReviewQueueList } from "./components/ReviewQueueList";

export default async function EvaluatorReviewsPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{
    jobId?: string | string[];
    applicantNumber?: string | string[];
    page?: string | string[];
    status?: string | string[];
  }>;
}>) {
  const evaluator = await getEvaluatorContext();
  if (!evaluator) redirect("/login");

  const {
    jobId: requestedJobId,
    applicantNumber: requestedApplicantNumber,
    page: requestedPage,
    status: requestedStatus,
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
  const selectedStatus = reviewQueueStatus(
    typeof requestedStatus === "string" ? requestedStatus : undefined,
  );

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

  const queueQuery = selectedJobId
    ? evaluator.supabase
        .from("v_evaluator_review_queue")
        .select(
          "application_id, applicant_number, application_status, applied_at, job_id, job_title, position_title, position_track, review_kind",
          { count: "exact" },
        )
        .eq("job_id", selectedJobId)
    : null;
  const queuePageResult = queueQuery
    ? await (selectedStatus
        ? queueQuery.eq("application_status", selectedStatus)
        : queueQuery)
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
    ? (applicantLookupResult.data ?? [])
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
  if (selectedJobId && page > totalPages) {
    redirect(reviewQueueHref(selectedJobId, totalPages, selectedStatus));
  }

  const applicants = queuePageResult.data ?? [];
  const selectedJob = jobs.find((job) => job.job_id === selectedJobId);
  const totalWaiting = jobs.reduce(
    (count, job) => count + job.waiting_count,
    0,
  );
  const totalRereviews = jobs.reduce(
    (count, job) => count + job.rereview_count,
    0,
  );

  return (
    <>
      <PageHeader
        actions={
          selectedJob ? (
            <Link
              className="inline-flex min-h-11 items-center gap-2 rounded-sm border border-line-strong px-4 text-sm font-semibold text-ink transition hover:bg-panel-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              href="/evaluator/reviews"
            >
              <ArrowLeftIcon aria-hidden="true" className="size-4" /> All
              postings
            </Link>
          ) : undefined
        }
        description={
          selectedJob
            ? "Review your assigned applicants in order. The list is paginated to keep the queue responsive."
            : "View the job postings with applications assigned to you."
        }
        eyebrow={
          selectedJob ? "Applicants waiting for review" : "Evaluator workspace"
        }
        title={selectedJob?.job_title ?? "Review queue"}
      />
      <section
        aria-label="Review workload"
        className="mt-6 overflow-hidden rounded-sm border border-line bg-panel"
      >
        <div className="flex items-center gap-3 border-b border-line-subtle px-5 py-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-sm bg-primary-light text-primary">
            <ClipboardDocumentCheckIcon aria-hidden="true" className="size-5" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-ink">
              {selectedJob ? "Posting workload" : "Your review workload"}
            </h2>
            <p className="text-xs text-muted">
              {selectedJob
                ? "Applications assigned to this posting"
                : "Across your assigned job postings"}
            </p>
          </div>
        </div>
        <dl className="grid grid-cols-2 divide-x divide-line-subtle sm:grid-cols-3">
          <div className="px-5 py-4">
            <dt className="text-xs text-muted">Waiting</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums text-ink">
              {selectedJob ? waitingCount : totalWaiting}
            </dd>
          </div>
          <div className="px-5 py-4">
            <dt className="text-xs text-muted">Re-reviews</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums text-ink">
              {selectedJob ? selectedJob.rereview_count : totalRereviews}
            </dd>
          </div>
          <div className="col-span-2 border-t border-line-subtle px-5 py-4 sm:col-span-1 sm:border-t-0">
            <dt className="text-xs text-muted">Job postings</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums text-ink">
              {selectedJob ? 1 : jobs.length}
            </dd>
          </div>
        </dl>
      </section>
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
        selectedStatus={selectedStatus}
      />
    </>
  );
}
