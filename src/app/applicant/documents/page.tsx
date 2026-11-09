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
        "id, document_type_id, file_path, version, status, uploaded_at, training_hours, pds_learning_development_id, total_units, pds_education_id",
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

  const [trainingResult, educationResult] = submittedPdsResult.data
    ? await Promise.all([
        applicant.supabase
          .from("pds_learning_development")
          .select("id, title, hours")
          .eq("pds_version_id", submittedPdsResult.data.id)
          .order("sort_order"),
        applicant.supabase
          .from("pds_education")
          .select("id, level, school_name, degree_course")
          .eq("pds_version_id", submittedPdsResult.data.id)
          .order("sort_order"),
      ])
    : [
        { data: [], error: submittedPdsResult.error },
        { data: [], error: submittedPdsResult.error },
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
  const prioritizedDocumentTypes = [...documentTypes].sort((first, second) => {
    const priority = (name: string) =>
      name === TRANSCRIPT_DOCUMENT_TYPE
        ? 0
        : name.toLocaleLowerCase().includes("diploma")
          ? 1
          : 2;
    return priority(first.name) - priority(second.name);
  });
  return (
    <>
      <PageHeader
        description="Upload documents and track evaluator feedback."
        eyebrow="Applicant workspace"
        title="Documents"
      />
      {documentTypes.length ? (
        <section
          aria-label="Required and optional documents"
          className="mt-6 max-w-5xl overflow-hidden rounded-sm border border-line bg-panel"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-panel-muted text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold" scope="col">
                    Document
                  </th>
                  <th className="px-4 py-3 font-semibold" scope="col">
                    Requirement
                  </th>
                  <th className="px-4 py-3 font-semibold" scope="col">
                    Status
                  </th>
                  <th
                    className="px-4 py-3 text-right font-semibold"
                    scope="col"
                  >
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-subtle">
                {prioritizedDocumentTypes.map((type) => (
                  <DocumentTypeCard
                    documents={documentsByType.get(type.id) ?? []}
                    id={type.id}
                    isRequired={type.is_required}
                    isTrainingCertificate={
                      type.name === TRAINING_CERTIFICATE_DOCUMENT_TYPE
                    }
                    isTranscript={type.name === TRANSCRIPT_DOCUMENT_TYPE}
                    key={type.id}
                    name={type.name}
                    trainingEntries={trainingResult.data ?? []}
                    trainingEntriesUnavailable={Boolean(trainingResult.error)}
                    educationEntries={(educationResult.data ?? []).map(
                      (entry) => ({
                        id: entry.id,
                        level: entry.level,
                        schoolName: entry.school_name,
                        degreeCourse: entry.degree_course,
                      }),
                    )}
                    educationEntriesUnavailable={Boolean(
                      educationResult.error,
                    )}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </section>
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
    </>
  );
}
