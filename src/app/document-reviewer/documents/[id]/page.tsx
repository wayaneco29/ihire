import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { getDocumentReviewerContext } from "@/lib/auth/server";
import { formatDate } from "@/utils/format-date";
import { DocumentReviewPanel } from "../components/DocumentReviewPanel";

export default async function DocumentReviewerDetailPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  const reviewer = await getDocumentReviewerContext();
  if (!reviewer) redirect("/login");
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { data: documents, error } = await reviewer.supabase
    .from("v_document_review_queue")
    .select(
      "applicant_number, document_id, document_status, document_type, storage_key, uploaded_at",
    )
    .eq("document_id", id)
    .limit(1);

  if (error) {
    return (
      <EmptyState
        description="Refresh the page to try loading the document record again."
        title="Document unavailable"
      />
    );
  }
  const document = documents?.[0];
  if (!document) notFound();

  const [metricsResult, reviewResult] = await Promise.all([
    reviewer.supabase
      .from("v_anonymized_document_metrics")
      .select(
        "training_hours, total_units, current_highest_education_level, ocr_training_hours, ocr_total_units, ocr_confidence",
      )
      .eq("document_id", document.document_id)
      .limit(1)
      .maybeSingle(),
    reviewer.supabase
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
        description="Refresh the page to load document details and OCR values."
        title="Document values unavailable"
      />
    );
  }

  return (
    <>
      <PageHeader
        description={`Uploaded ${formatDate(document.uploaded_at, "MMM D, YYYY · h:mm A")}`}
        eyebrow={`Anonymous applicant · ${document.applicant_number}`}
        title={document.document_type}
      />
      <div className="mt-6">
        <DocumentReviewPanel
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
        href="/document-reviewer/documents"
      >
        Back to review queue
      </Link>
    </>
  );
}
