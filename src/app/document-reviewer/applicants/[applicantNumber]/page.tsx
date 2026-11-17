import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { getDocumentReviewerContext } from "@/lib/auth/server";
import { ApplicantDocumentReviewList } from "../../documents/components/ApplicantDocumentReviewList";

export default async function ApplicantDocumentReviewPage({
  params,
}: Readonly<{ params: Promise<{ applicantNumber: string }> }>) {
  const { applicantNumber } = await params;
  const reviewer = await getDocumentReviewerContext();
  if (!reviewer) redirect("/login");

  const [documentsResult, documentTypesResult] = await Promise.all([
    reviewer.supabase
      .from("v_document_review_queue")
      .select(
        "document_id, applicant_number, document_type, document_status, storage_key, uploaded_at",
      )
      .eq("applicant_number", applicantNumber)
      .order("uploaded_at", { ascending: true }),
    reviewer.supabase
      .from("document_types")
      .select("name, is_required")
      .order("name"),
  ]);

  if (documentsResult.error || documentTypesResult.error) {
    return (
      <EmptyState
        description="Refresh the page to try loading this applicant's documents again."
        title="Documents temporarily unavailable"
      />
    );
  }

  const documents = documentsResult.data;
  if (!documents?.length) {
    return (
      <>
        <PageHeader
          description="All submitted documents for this applicant have been reviewed."
          eyebrow={`Applicant ${applicantNumber}`}
          title="Review documents"
        />
        <div className="mt-7">
          <EmptyState
            description="Choose another applicant from the review queue."
            title="No documents are waiting for review"
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

  const documentIds = documents.map((document) => document.document_id);
  const [metricsResult, reviewsResult, detailsResult] = await Promise.all([
    reviewer.supabase
      .from("v_anonymized_document_metrics")
      .select(
        "document_id, training_hours, total_units, current_highest_education_level, ocr_training_hours, ocr_total_units, ocr_confidence",
      )
      .in("document_id", documentIds),
    reviewer.supabase
      .from("document_reviews")
      .select(
        "document_id, status, remarks, reviewed_at, confirmed_training_hours, confirmed_total_units",
      )
      .in("document_id", documentIds)
      .order("reviewed_at", { ascending: false }),
    reviewer.supabase
      .from("documents")
      .select(
        "id, version, certificate_title, certificate_type, certificate_issuer, certificate_date",
      )
      .in("id", documentIds),
  ]);

  if (metricsResult.error || detailsResult.error) {
    return (
      <EmptyState
        description="Refresh the page to load document details and OCR values."
        title="Document values unavailable"
      />
    );
  }

  const metricsByDocument = new Map(
    (metricsResult.data ?? []).map((metrics) => [metrics.document_id, metrics]),
  );
  const detailsByDocument = new Map(
    (detailsResult.data ?? []).map((details) => [details.id, details]),
  );
  const requiredByDocumentType = new Map(
    (documentTypesResult.data ?? []).map((type) => [type.name, type.is_required]),
  );
  const latestReviewByDocument = new Map<
    string,
    NonNullable<typeof reviewsResult.data>[number]
  >();
  for (const review of reviewsResult.data ?? []) {
    if (!latestReviewByDocument.has(review.document_id)) {
      latestReviewByDocument.set(review.document_id, review);
    }
  }

  const reviewDocuments = documents.flatMap((document) => {
    const metrics = metricsByDocument.get(document.document_id);
    const details = detailsByDocument.get(document.document_id);
    const isRequired = requiredByDocumentType.get(document.document_type);
    if (!metrics || !details || isRequired === undefined) return [];

    return [
      {
        documentId: document.document_id,
        documentType: document.document_type,
        documentStatus: document.document_status,
        uploadedAt: document.uploaded_at,
        storageKey: document.storage_key,
        isRequired,
        version: details.version,
        certificateTitle: details.certificate_title,
        certificateType: details.certificate_type,
        certificateIssuer: details.certificate_issuer,
        certificateDate: details.certificate_date,
        trainingHours: metrics.training_hours,
        totalUnits: metrics.total_units,
        currentHighestEducationLevel:
          metrics.current_highest_education_level,
        ocrTrainingHours: metrics.ocr_training_hours,
        ocrTotalUnits: metrics.ocr_total_units,
        ocrConfidence: metrics.ocr_confidence,
        previousReview: reviewsResult.error
          ? null
          : (latestReviewByDocument.get(document.document_id) ?? null),
      },
    ];
  });
  if (reviewDocuments.length !== documents.length) {
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
        description={`${documents.length} document${documents.length === 1 ? "" : "s"} waiting for review.`}
        eyebrow={`Applicant ${applicantNumber}`}
        title="Review documents"
      />
      {reviewsResult.error && (
        <p className="mt-4 text-sm text-muted" role="status">
          Previous review remarks could not be loaded.
        </p>
      )}
      <ApplicantDocumentReviewList
        applicantNumber={applicantNumber}
        documents={reviewDocuments}
      />
      <Link
        className="mt-5 inline-flex min-h-11 items-center rounded-sm px-2 text-sm font-semibold text-primary hover:bg-primary-light hover:text-primary-dark"
        href="/document-reviewer/documents"
      >
        Back to review queue
      </Link>
    </>
  );
}
