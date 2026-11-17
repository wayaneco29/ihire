import { redirect } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { getApplicantContext } from "@/lib/auth/server";
import {
  TRAINING_CERTIFICATE_DOCUMENT_TYPE,
  TRANSCRIPT_DOCUMENT_TYPE,
} from "@/constants/documents";
import {
  DocumentTypeCard,
  type DocumentRecord,
} from "./components/DocumentTypeCard";
import { SubmitDocumentsButton } from "./components/SubmitDocumentsButton";
import { WorkflowStatusTag } from "@/components/ui/WorkflowStatusTag";

export default async function ApplicantDocumentsPage() {
  const applicant = await getApplicantContext();
  if (!applicant) redirect("/login");

  const [
    typesResult,
    documentsResult,
    pdsVersionsResult,
    documentStatusResult,
  ] = await Promise.all([
    applicant.supabase
      .from("document_types")
      .select("id, name, is_required")
      .order("name"),
    applicant.supabase
      .from("documents")
      .select(
        "id, document_type_id, file_path, version, status, uploaded_at, certificate_title, certificate_type, certificate_issuer, certificate_date, training_hours, pds_learning_development_id, total_units, pds_education_id, current_highest_education_level, replaces_document_id",
      )
      .eq("applicant_id", applicant.applicant.id)
      .order("version", { ascending: false }),
    applicant.supabase
      .from("pds_versions")
      .select("id, status, version_no")
      .eq("applicant_id", applicant.applicant.id)
      .order("version_no", { ascending: false })
      .in("status", ["DRAFT", "SUBMITTED"]),
    applicant.supabase
      .from("v_applicant_document_status")
      .select("status, required_document_count, verified_required_count")
      .eq("applicant_id", applicant.applicant.id)
      .maybeSingle(),
  ]);

  if (
    typesResult.error ||
    documentsResult.error ||
    documentStatusResult.error ||
    !documentStatusResult.data
  ) {
    return (
      <>
        <PageHeader
          description="Upload and track your supporting documents."
          eyebrow="Applicant workspace"
          title="Documents"
        />
        <div className="mt-7">
          <EmptyState
            description="Refresh this page to try loading your document records again."
            title="Documents temporarily unavailable"
          />
        </div>
      </>
    );
  }

  const submittedPds = pdsVersionsResult.data?.find(
    (version) => version.status === "SUBMITTED",
  );
  const activeTrainingPds =
    pdsVersionsResult.data?.find((version) => version.status === "DRAFT") ??
    submittedPds;
  const [trainingResult, educationResult] = activeTrainingPds
    ? await Promise.all([
        applicant.supabase
          .from("pds_learning_development")
          .select("id, title, hours, sort_order")
          .eq("pds_version_id", activeTrainingPds.id)
          .order("sort_order"),
        submittedPds
          ? applicant.supabase
              .from("pds_education")
              .select("id, level, school_name, degree_course")
              .eq("pds_version_id", submittedPds.id)
              .order("sort_order")
          : Promise.resolve({ data: [], error: null }),
      ])
    : [
        { data: [], error: pdsVersionsResult.error },
        { data: [], error: pdsVersionsResult.error },
      ];

  const documents = documentsResult.data ?? [];
  const documentIds = documents.map((document) => document.id);
  const reviewsResult = documentIds.length
    ? await applicant.supabase
        .from("document_reviews")
        .select("id, document_id, remarks, reviewed_at")
        .in("document_id", documentIds)
        .order("reviewed_at", { ascending: false })
    : { data: [], error: null };

  const latestRemarks = new Map<string, string | null>();
  for (const review of reviewsResult.data ?? []) {
    if (!latestRemarks.has(review.document_id)) {
      latestRemarks.set(review.document_id, review.remarks);
    }
  }

  const replacementVersionByDocumentId = new Map(
    documents
      .filter((document) => document.replaces_document_id)
      .map((document) => [document.replaces_document_id!, document.version]),
  );
  const documentsByType = new Map<string, DocumentRecord[]>();
  for (const document of documents) {
    const typeDocuments = documentsByType.get(document.document_type_id) ?? [];
    typeDocuments.push({
      ...document,
      remarks: latestRemarks.get(document.id) ?? null,
      supersededByVersion:
        replacementVersionByDocumentId.get(document.id) ?? null,
    });
    documentsByType.set(document.document_type_id, typeDocuments);
  }

  const documentTypes = typesResult.data ?? [];
  const prioritizedDocumentTypes = [...documentTypes].sort((first, second) => {
    const priority = (name: string) =>
      name === TRANSCRIPT_DOCUMENT_TYPE
        ? 0
        : name.toLocaleLowerCase().includes("diploma")
          ? 1
          : 2;
    return priority(first.name) - priority(second.name);
  });
  const trainingCertificateType = prioritizedDocumentTypes.find(
    (type) => type.name === TRAINING_CERTIFICATE_DOCUMENT_TYPE,
  );
  const pendingCount = prioritizedDocumentTypes.reduce((count, type) => {
    const typeDocuments = documentsByType.get(type.id) ?? [];
    if (type.name === TRAINING_CERTIFICATE_DOCUMENT_TYPE) {
      return (
        count +
        typeDocuments.filter(
          (document) =>
            document.status === "PENDING" &&
            document.supersededByVersion === null,
        ).length
      );
    }
    return (
      count +
      Number(
        typeDocuments[0]?.status === "PENDING" &&
          typeDocuments[0]?.supersededByVersion === null,
      )
    );
  }, 0);
  const requiredTypes = prioritizedDocumentTypes.filter(
    (type) => type.is_required && type.id !== trainingCertificateType?.id,
  );
  const optionalTypes = prioritizedDocumentTypes.filter(
    (type) => !type.is_required && type.id !== trainingCertificateType?.id,
  );
  const resubmissionTypes = prioritizedDocumentTypes.filter((type) =>
    (documentsByType.get(type.id) ?? []).some(
      (document) =>
        document.supersededByVersion === null &&
        ["REJECTED", "FOR_RESUBMISSION"].includes(document.status),
    ),
  );
  const requiredCount = requiredTypes.filter(
    (type) => documentsByType.get(type.id)?.[0],
  ).length;
  const verifiedRequiredCount = requiredTypes.filter(
    (type) => documentsByType.get(type.id)?.[0]?.status === "VERIFIED",
  ).length;
  const optionalCount = optionalTypes.filter(
    (type) => documentsByType.get(type.id)?.[0],
  ).length;
  const optionalReviewCount = optionalTypes.filter((type) =>
    ["PENDING", "FOR_REVIEW", "REJECTED", "FOR_RESUBMISSION"].includes(
      documentsByType.get(type.id)?.[0]?.status ?? "",
    ),
  ).length;

  const renderDocumentType = (
    type: (typeof prioritizedDocumentTypes)[number],
  ) => (
    <DocumentTypeCard
      documents={documentsByType.get(type.id) ?? []}
      id={type.id}
      isTrainingCertificate={type.name === TRAINING_CERTIFICATE_DOCUMENT_TYPE}
      isTranscript={type.name === TRANSCRIPT_DOCUMENT_TYPE}
      key={type.id}
      name={type.name}
      trainingEntries={(trainingResult.data ?? []).map((entry) => ({
        id: entry.id,
        title: entry.title,
        hours: entry.hours,
        sort_order: entry.sort_order,
      }))}
      trainingEntriesUnavailable={Boolean(
        pdsVersionsResult.error || trainingResult.error,
      )}
      educationEntries={(educationResult.data ?? []).map((entry) => ({
        id: entry.id,
        level: entry.level,
        schoolName: entry.school_name,
        degreeCourse: entry.degree_course,
      }))}
      educationEntriesUnavailable={Boolean(educationResult.error)}
    />
  );

  return (
    <div className="mx-auto">
      <PageHeader
        description="Upload documents, submit them for verification, and track their status."
        title="Documents"
      />
      {documentTypes.length ? (
        <>
          <section className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-sm border border-line bg-panel p-4">
            <div>
              <h2 className="text-sm font-semibold text-ink">
                Overall required-document status
              </h2>
              <p className="mt-1 text-sm text-muted">
                {documentStatusResult.data.verified_required_count} of{" "}
                {documentStatusResult.data.required_document_count} required
                documents verified. You can apply only after all required
                documents are approved.
              </p>
            </div>
            <WorkflowStatusTag status={documentStatusResult.data.status} />
          </section>
          {pendingCount > 0 && (
            <SubmitDocumentsButton pendingCount={pendingCount} />
          )}
          {resubmissionTypes.length > 0 && (
            <section
              aria-label="Document needs resubmission"
              className="mt-7 flex flex-col gap-3 rounded-sm border border-warning/20 border-l-4 border-l-warning bg-warning/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5"
            >
              <div>
                <h2 className="text-sm font-semibold text-warning">
                  {resubmissionTypes.length === 1
                    ? `${resubmissionTypes[0].name} needs a new version`
                    : `${resubmissionTypes.length} documents need new versions`}
                </h2>
                <p className="mt-0.5 text-sm text-ink">
                  The Document Reviewer sent it back for resubmission. Upload a
                  corrected copy.
                </p>
              </div>
              <a
                className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-sm bg-primary px-6 text-sm! font-medium text-on-primary hover:bg-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                href={`#${resubmissionTypes[0].id}`}
              >
                Upload new version
              </a>
            </section>
          )}

          {requiredTypes.length > 0 && (
            <section
              aria-labelledby="required-documents-heading"
              className="mt-7 rounded-sm border border-line bg-panel p-4 sm:p-5"
            >
              <div className="border-b border-line-subtle pb-3">
                <h2
                  className="text-base font-semibold text-ink"
                  id="required-documents-heading"
                >
                  Required
                </h2>
                <p className="mt-1 text-xs text-muted">
                  {requiredCount} documents. {verifiedRequiredCount} verified.
                </p>
              </div>
              <ul>
                {requiredTypes.map((type) => (
                  <li key={type.id}>{renderDocumentType(type)}</li>
                ))}
              </ul>
            </section>
          )}

          {optionalTypes.length > 0 && (
            <section
              aria-labelledby="optional-documents-heading"
              className="mt-7 rounded-sm border border-line bg-panel p-4 sm:p-5"
            >
              <div className="border-b border-line-subtle pb-3">
                <h2
                  className="text-base font-semibold text-ink"
                  id="optional-documents-heading"
                >
                  Optional
                </h2>
                <p className="mt-1 text-xs text-muted">
                  {optionalCount} documents.{" "}
                  {optionalReviewCount
                    ? `${optionalReviewCount} waiting for review.`
                    : "All reviewed."}
                </p>
              </div>
              <ul>
                {optionalTypes.map((type) => (
                  <li key={type.id}>{renderDocumentType(type)}</li>
                ))}
              </ul>
            </section>
          )}

          {trainingCertificateType && (
            <div className="mt-5 rounded-sm border border-line bg-panel p-4 sm:p-5">
              {renderDocumentType(trainingCertificateType)}
            </div>
          )}
        </>
      ) : (
        <div className="mt-7">
          <EmptyState
            description="Document types have not been configured yet."
            title="No document types available"
          />
        </div>
      )}
      {reviewsResult.error && (
        <p className="mt-4 text-sm text-muted" role="status">
          Review remarks could not be loaded. Your document statuses are still
          shown.
        </p>
      )}
    </div>
  );
}
