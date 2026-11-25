import "server-only";
import { getDocumentReviewerContext } from "@/lib/auth/server";

export async function getApplicantReviewDocuments(applicantNumber: string) {
  const reviewer = await getDocumentReviewerContext();
  if (!reviewer) {
    return { success: false as const, message: "Document Reviewer access is required. Sign out and sign in again." };
  }

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
    return { success: false as const, message: "Documents could not be loaded. Please try again." };
  }

  const documents = documentsResult.data;
  if (!documents?.length) {
    return { success: true as const, documents: [], warning: null };
  }

  const documentIds = documents.map((document) => document.document_id);
  const [metricsResult, reviewsResult, detailsResult] = await Promise.all([
    reviewer.supabase
      .from("v_anonymized_document_metrics")
      .select(
        "document_id, training_hours, total_units, current_highest_education_level, is_graduated, ocr_training_hours, ocr_total_units, ocr_confidence",
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
    return { success: false as const, message: "Document values could not be loaded. Please try again." };
  }

  const metricsByDocument = new Map(
    (metricsResult.data ?? []).map((metrics) => [metrics.document_id, metrics]),
  );
  const detailsByDocument = new Map(
    (detailsResult.data ?? []).map((details) => [details.id, details]),
  );
  const requiredByDocumentType = new Map(
    (documentTypesResult.data ?? []).map((type) => [
      type.name,
      type.is_required,
    ]),
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
        isGraduated: metrics.is_graduated,
        currentHighestEducationLevel: metrics.current_highest_education_level,
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
    return { success: false as const, message: "Document values could not be loaded. Please try again." };
  }

  return {
    success: true as const,
    documents: reviewDocuments,
    warning: reviewsResult.error ? "Previous review remarks could not be loaded." : null,
  };
}
