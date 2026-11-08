import { redirect } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { getApplicantContext } from "@/lib/auth/server";
import { TRAINING_CERTIFICATE_DOCUMENT_TYPE } from "@/constants/documents";
import {
  DocumentTypeCard,
  type DocumentVersion,
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
        "id, document_type_id, file_path, version, status, uploaded_at, training_hours",
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
  console.log(documentsResult);
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

  const versionsByType = new Map<string, DocumentVersion[]>();
  for (const document of documents) {
    const versions = versionsByType.get(document.document_type_id) ?? [];
    versions.push({
      ...document,
      remarks: latestRemarks.get(document.id) ?? null,
    });
    versionsByType.set(document.document_type_id, versions);
  }

  return (
    <>
      <PageHeader
        description="Upload required records, view submitted files, and track evaluator feedback. New versions return to review."
        eyebrow="Applicant workspace"
        title="Documents"
      />
      {typesResult.data?.length ? (
        <div className="mt-7 grid gap-4 xl:grid-cols-2">
          {typesResult.data.map((type) => (
            <DocumentTypeCard
              id={type.id}
              isTrainingCertificate={
                type.name === TRAINING_CERTIFICATE_DOCUMENT_TYPE
              }
              key={type.id}
              name={type.name}
              required={type.is_required}
              trainingEntries={trainingResult.data ?? []}
              trainingEntriesUnavailable={Boolean(trainingResult.error)}
              versions={versionsByType.get(type.id) ?? []}
            />
          ))}
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
