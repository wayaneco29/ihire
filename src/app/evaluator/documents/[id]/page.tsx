import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { getEvaluatorContext } from "@/lib/auth/server";
import { formatDate } from "@/utils/format-date";
import { DocumentReviewPanel } from "../components/DocumentReviewPanel";

export default async function EvaluatorDocumentPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  const evaluator = await getEvaluatorContext();
  if (!evaluator) redirect("/login");
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { data: documents, error } = await evaluator.supabase
    .from("v_anonymized_documents")
    .select(
      "application_id, applicant_number, document_id, storage_key, document_type, document_status, uploaded_at",
    )
    .eq("document_id", id)
    .order("uploaded_at", { ascending: false })
    .limit(1);

  if (error) {
    return (
      <EmptyState
        description="Refresh this page to try loading the anonymized document record again."
        title="Document unavailable"
      />
    );
  }
  const document = documents?.[0];
  if (!document) notFound();

  const [metricsResult, applicationResult, reviewResult] = await Promise.all([
    evaluator.supabase
      .from("v_anonymized_document_metrics")
      .select(
        "training_hours, total_units, current_highest_education_level, ocr_training_hours, ocr_total_units, ocr_confidence",
      )
      .eq("document_id", document.document_id)
      .limit(1)
      .maybeSingle(),
    evaluator.supabase
      .from("v_anonymized_applicants")
      .select("job_id")
      .eq("application_id", document.application_id)
      .maybeSingle(),
    evaluator.supabase
      .from("document_reviews")
      .select(
        "status, remarks, reviewed_at, confirmed_training_hours, confirmed_total_units",
      )
      .eq("document_id", document.document_id)
      .order("reviewed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (metricsResult.error || !metricsResult.data) {
    return (
      <EmptyState
        description="Refresh this page to load evaluator-confirmed document values."
        title="Document values unavailable"
      />
    );
  }

  const jobResult = applicationResult.data
    ? await evaluator.supabase
        .from("job_postings")
        .select("title")
        .eq("id", applicationResult.data.job_id)
        .maybeSingle()
    : { data: null, error: null };

  return (
    <>
      <PageHeader
        description={jobResult.data?.title ?? "Application document"}
        eyebrow={`Anonymous applicant · ${document.applicant_number}`}
        title={document.document_type}
      />
      <p className="mt-3 text-sm text-muted">
        Uploaded {formatDate(document.uploaded_at, "MMM D, YYYY · h:mm A")}
      </p>
      <div className="mt-6">
        <DocumentReviewPanel
          applicationId={document.application_id}
          documentId={document.document_id}
          documentStatus={document.document_status}
          documentType={document.document_type}
          trainingHours={metricsResult.data.training_hours}
          totalUnits={metricsResult.data.total_units}
          currentHighestEducationLevel={
            metricsResult.data.current_highest_education_level
          }
          ocrTrainingHours={metricsResult.data.ocr_training_hours}
          ocrTotalUnits={metricsResult.data.ocr_total_units}
          ocrConfidence={metricsResult.data.ocr_confidence}
          previousReview={reviewResult.data ?? null}
          storageKey={document.storage_key}
        />
      </div>
      <Link
        className="mt-5 inline-flex min-h-11 items-center rounded-sm px-2 text-sm font-semibold text-primary hover:bg-primary-light hover:text-primary-dark"
        href={`/evaluator/applications/${document.application_id}`}
      >
        Back to applicant review
      </Link>
    </>
  );
}
