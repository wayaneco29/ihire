import { redirect } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { getEvaluatorContext } from "@/lib/auth/server";
import { ReviewQueueList, type ReviewQueueItem } from "./components/ReviewQueueList";

export default async function EvaluatorReviewsPage() {
  const evaluator = await getEvaluatorContext();
  if (!evaluator) redirect("/login");

  const [applicantsResult, documentsResult] = await Promise.all([
    evaluator.supabase
      .from("v_anonymized_applicants")
      .select("application_id, applicant_number, application_status, applied_at, job_id, education_levels, experience_years, training_hours, skills")
      .order("applied_at", { ascending: false }),
    evaluator.supabase
      .from("v_anonymized_documents")
      .select("application_id, document_id, document_type, document_status, uploaded_at")
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

  const documentsByApplication = new Map<string, Map<string, ReviewQueueItem["documents"][number]>>();
  for (const document of documentsResult.data ?? []) {
    const applicationDocuments = documentsByApplication.get(document.application_id) ?? new Map();
    if (!applicationDocuments.has(document.document_type)) {
      applicationDocuments.set(document.document_type, document);
    }
    documentsByApplication.set(document.application_id, applicationDocuments);
  }

  const applicants = applicantsResult.data ?? [];
  const jobIds = [...new Set(applicants.map((applicant) => applicant.job_id))];
  const jobsResult = jobIds.length
    ? await evaluator.supabase.from("job_postings").select("id, title").in("id", jobIds)
    : { data: [], error: null };
  const jobTitles = new Map((jobsResult.data ?? []).map((job) => [job.id, job.title] as const));

  const queueItems: ReviewQueueItem[] = applicants.flatMap((applicant) => {
    const latestDocuments = [...(documentsByApplication.get(applicant.application_id)?.values() ?? [])];
    const needsDocumentReview = latestDocuments.some((document) => document.document_status === "FOR_REVIEW");
    const isTerminal = ["HIRED", "REJECTED"].includes(applicant.application_status);
    const isReReview =
      applicant.application_status === "UNDER_EVALUATION" ||
      (needsDocumentReview && ["QUALIFIED", "NOT_QUALIFIED"].includes(applicant.application_status));
    const pendingApplication = ["SUBMITTED", "UNDER_EVALUATION"].includes(applicant.application_status);
    if (isTerminal || !(needsDocumentReview || pendingApplication)) return [];
    return [{
        application_id: applicant.application_id,
        applicant_number: applicant.applicant_number,
        application_status: applicant.application_status,
        applied_at: applicant.applied_at,
        jobTitle: jobTitles.get(applicant.job_id) ?? "Job posting",
        education_levels: applicant.education_levels,
        experience_years: applicant.experience_years,
        training_hours: applicant.training_hours,
        skills: applicant.skills,
        documents: latestDocuments,
        reviewKind: isReReview ? "REREVIEW" as const : "INITIAL" as const,
      }];
  });

  return (
    <>
      <PageHeader
        description="Review applicant documents and assessments using applicant numbers and credibility data."
        eyebrow="Evaluator workspace"
        title="Review queue"
      />
      <ReviewQueueList items={queueItems} />
    </>
  );
}
