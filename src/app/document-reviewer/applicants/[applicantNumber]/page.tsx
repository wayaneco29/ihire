import Link from "next/link";
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
      />
      {result.warning && <p className="mt-4 text-sm text-muted" role="status">{result.warning}</p>}
      <ApplicantDocumentReviewList applicantNumber={applicantNumber} documents={result.documents} />
      <Link
        className="mt-5 inline-flex min-h-10 items-center rounded-sm px-2 text-sm font-semibold text-primary hover:bg-primary-light hover:text-primary-dark"
        href="/document-reviewer/documents"
      >
        Back to review queue
      </Link>
    </>
  );
}
