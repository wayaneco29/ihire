import { redirect } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { getApplicantContext } from "@/lib/auth/server";
import { TRAINING_CERTIFICATE_DOCUMENT_TYPE } from "@/constants/documents";
import {
  DocumentTypeCard,
  type DocumentRecord,
} from "./components/DocumentTypeCard";

export default async function ApplicantDocumentsPage() {
  const applicant = await getApplicantContext();
  if (!applicant) redirect("/login");

  const [typesResult, documentsResult, submittedPdsResult] = await Promise.all([
    applicant.supabase
      .from("document_types")
      .select("id, name, is_required")
      .order("name"),
    applicant.supabase
      .from("documents")
      .select(
        "id, document_type_id, file_path, version, status, uploaded_at, training_hours, pds_learning_development_id",
      )
      .eq("applicant_id", applicant.applicant.id)
      .order("version", { ascending: false }),
    applicant.supabase
      .from("pds_versions")
      .select("id")
      .eq("applicant_id", applicant.applicant.id)
      .eq("status", "SUBMITTED")
      .order("version_no", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (typesResult.error || documentsResult.error) {
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

  const trainingResult = submittedPdsResult.data
    ? await applicant.supabase
        .from("pds_learning_development")
        .select("id, title, hours")
        .eq("pds_version_id", submittedPdsResult.data.id)
        .order("sort_order")
    : { data: [], error: submittedPdsResult.error };

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

  const documentsByType = new Map<string, DocumentRecord[]>();
  for (const document of documents) {
    const typeDocuments = documentsByType.get(document.document_type_id) ?? [];
    typeDocuments.push({
      ...document,
      remarks: latestRemarks.get(document.id) ?? null,
    });
    documentsByType.set(document.document_type_id, typeDocuments);
  }

  const documentTypes = typesResult.data ?? [];
  const requiredTypes = documentTypes.filter((type) => type.is_required);
  const trainingCertificateType = documentTypes.find(
    (type) => type.name === TRAINING_CERTIFICATE_DOCUMENT_TYPE,
  );
  const optionalTypes = documentTypes.filter(
    (type) =>
      !type.is_required && type.name !== TRAINING_CERTIFICATE_DOCUMENT_TYPE,
  );
  const verifiedRequired = requiredTypes.filter(
    (type) => documentsByType.get(type.id)?.[0]?.status === "VERIFIED",
  ).length;

  return (
    <>
      <PageHeader
        description="Upload required records and track evaluator feedback. New uploads are sent for review."
        eyebrow="Applicant workspace"
        title="Documents"
      />
      {documentTypes.length ? (
        <div className="mt-6 max-w-4xl space-y-5">
          {requiredTypes.length > 0 && (
            <section
              aria-label="Required documents"
              className="rounded-sm shadow bg-white p-3 sm:p-4"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-on-primary">
                    Required
                  </span>
                  <h2 className="text-sm font-semibold text-ink">
                    Needed for every application
                  </h2>
                </div>
                <span className="text-xs font-medium text-primary">
                  {verifiedRequired} of {requiredTypes.length} verified
                </span>
              </div>
              <div
                aria-label={`${verifiedRequired} of ${requiredTypes.length} required documents verified`}
                className="mb-3 h-1.5 overflow-hidden rounded-full bg-white/80"
                role="progressbar"
                aria-valuemax={requiredTypes.length}
                aria-valuemin={0}
                aria-valuenow={verifiedRequired}
              >
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{
                    width: `${(verifiedRequired / requiredTypes.length) * 100}%`,
                  }}
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {requiredTypes.map((type) => (
                  <DocumentTypeCard
                    documents={documentsByType.get(type.id) ?? []}
                    featured
                    id={type.id}
                    isTrainingCertificate={false}
                    key={type.id}
                    name={type.name}
                    trainingEntries={trainingResult.data ?? []}
                    trainingEntriesUnavailable={Boolean(trainingResult.error)}
                  />
                ))}
              </div>
            </section>
          )}
          {trainingCertificateType && (
            <DocumentTypeCard
              documents={documentsByType.get(trainingCertificateType.id) ?? []}
              id={trainingCertificateType.id}
              isTrainingCertificate
              key={trainingCertificateType.id}
              name={trainingCertificateType.name}
              trainingEntries={trainingResult.data ?? []}
              trainingEntriesUnavailable={Boolean(trainingResult.error)}
            />
          )}
          {optionalTypes.length > 0 && (
            <section aria-label="">
              <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
                Other optional documents
              </h2>
              <div className="overflow-hidden rounded-sm shadow bg-panel p-4">
                {optionalTypes.map((type) => (
                  <DocumentTypeCard
                    documents={documentsByType.get(type.id) ?? []}
                    id={type.id}
                    isTrainingCertificate={false}
                    key={type.id}
                    name={type.name}
                    trainingEntries={trainingResult.data ?? []}
                    trainingEntriesUnavailable={Boolean(trainingResult.error)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      ) : (
        <div className="mt-7">
          <EmptyState
            description="Required document types have not been configured yet."
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
    </>
  );
}
