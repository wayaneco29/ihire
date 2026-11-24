import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { getApplicantReviewDocuments } from "@/lib/document-reviewer/documents";
import { ApplicantDocumentReviewList } from "../../documents/components/ApplicantDocumentReviewList";

export default async function ApplicantDocumentReviewPage({
  params,
}: Readonly<{ params: Promise<{ applicantNumber: string }> }>) {
  const { applicantNumber } = await params;
  const result = await getApplicantReviewDocuments(applicantNumber);

  if (!result.success) {
    return <EmptyState title="Documents unavailable" description={result.message} />;
  }

  return (
    <>
      <PageHeader
        description={`${result.documents.length} documents waiting for review.`}
        eyebrow={`Applicant ${applicantNumber}`}
        title="Review documents"
        backHref="/document-reviewer/documents"
        backLabel="Review queue"
      />
      {result.warning && <p className="mt-4 text-sm text-muted" role="status">{result.warning}</p>}
      <ApplicantDocumentReviewList applicantNumber={applicantNumber} documents={result.documents} />
    </>
  );
}
