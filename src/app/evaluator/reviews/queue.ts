export type ReviewDocument = {
  application_id: string;
  document_id: string;
  document_type: string;
  document_status: string;
  uploaded_at: string;
};

export type ReviewApplicant = {
  application_id: string;
  applicant_number: string;
  application_status: string;
  applied_at: string;
  job_id: string;
  position_title: string | null;
  position_track: string | null;
};

export type ReviewQueueItem = ReviewApplicant & {
  jobTitle: string;
  documents: ReviewDocument[];
  reviewKind: "INITIAL" | "REREVIEW";
};

export function buildReviewQueueItems(
  applicants: ReviewApplicant[],
  documents: ReviewDocument[],
  jobTitles: Map<string, string>,
): ReviewQueueItem[] {
  const documentsByApplication = new Map<string, Map<string, ReviewDocument>>();
  for (const document of documents) {
    const applicationDocuments = documentsByApplication.get(document.application_id) ?? new Map();
    if (!applicationDocuments.has(document.document_type)) {
      applicationDocuments.set(document.document_type, document);
    }
    documentsByApplication.set(document.application_id, applicationDocuments);
  }

  return applicants.flatMap((applicant) => {
    const latestDocuments = [...(documentsByApplication.get(applicant.application_id)?.values() ?? [])];
    const needsDocumentReview = latestDocuments.some((document) => document.document_status === "FOR_REVIEW");
    const isTerminal = ["HIRED", "REJECTED"].includes(applicant.application_status);
    const isReReview =
      applicant.application_status === "UNDER_EVALUATION" ||
      (needsDocumentReview && ["QUALIFIED", "NOT_QUALIFIED"].includes(applicant.application_status));
    const pendingApplication = ["SUBMITTED", "UNDER_EVALUATION", "ASSESSMENT_SCHEDULED"].includes(applicant.application_status);
    if (isTerminal || !(needsDocumentReview || pendingApplication)) return [];

    return [{
      ...applicant,
      jobTitle: jobTitles.get(applicant.job_id) ?? "Job posting",
      documents: latestDocuments,
      reviewKind: isReReview ? "REREVIEW" as const : "INITIAL" as const,
    }];
  });
}
