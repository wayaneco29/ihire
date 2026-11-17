import { redirect } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { getDocumentReviewerContext } from "@/lib/auth/server";
import { DocumentReviewQueueTable } from "./components/DocumentReviewQueueTable";

export default async function DocumentReviewQueuePage() {
  const reviewer = await getDocumentReviewerContext();
  if (!reviewer) redirect("/login");

  const { data: documents, error } = await reviewer.supabase
    .from("v_document_review_queue")
    .select(
      "document_id, applicant_number, document_type, document_status, uploaded_at",
    )
    .order("uploaded_at", { ascending: true });

  if (error) {
    return (
      <>
        <PageHeader
          description="Review documents submitted by applicants."
          eyebrow="Document Reviewer"
          title="Review queue"
        />
        <div className="mt-7">
          <EmptyState
            description="Refresh this page to try loading the document queue again."
            title="Documents temporarily unavailable"
          />
        </div>
      </>
    );
  }

  const documentsByApplicant = new Map<
    string,
    NonNullable<typeof documents>
  >();
  for (const document of documents ?? []) {
    const applicantDocuments =
      documentsByApplicant.get(document.applicant_number) ?? [];
    applicantDocuments.push(document);
    documentsByApplicant.set(document.applicant_number, applicantDocuments);
  }
  const applicants = Array.from(
    documentsByApplicant,
    ([applicantNumber, applicantDocuments]) => ({
      applicantNumber,
      documentCount: applicantDocuments.length,
      documentTypes: [
        ...new Set(applicantDocuments.map((document) => document.document_type)),
      ],
    }),
  );

  return (
    <>
      <PageHeader
        description="Review and verify applicant documents before they can apply for jobs."
        eyebrow="Document Reviewer"
        title="Review queue"
      />
      {applicants.length ? (
        <div className="mt-6 overflow-hidden rounded-sm border border-line bg-panel">
          <DocumentReviewQueueTable applicants={applicants} />
        </div>
      ) : (
        <div className="mt-7">
          <EmptyState
            description="New documents submitted by applicants will appear here."
            title="The review queue is clear"
          />
        </div>
      )}
    </>
  );
}
