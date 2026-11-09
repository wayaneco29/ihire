import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { getEvaluatorContext } from "@/lib/auth/server";
import { ReviewQueueList } from "./components/ReviewQueueList";
import { buildReviewQueueItems } from "./queue";

export default async function EvaluatorReviewsPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ jobId?: string | string[] }> }>) {
  const evaluator = await getEvaluatorContext();
  if (!evaluator) redirect("/login");

  const { jobId: requestedJobId } = await searchParams;
  const selectedJobId =
    typeof requestedJobId === "string" ? requestedJobId : undefined;

  const [applicantsResult, documentsResult] = await Promise.all([
    evaluator.supabase
      .from("v_anonymized_applicants")
      .select(
        "application_id, applicant_number, application_status, applied_at, job_id",
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
      <ReviewQueueList items={queueItems} selectedJobId={selectedJobId} />
    </>
  );
}
