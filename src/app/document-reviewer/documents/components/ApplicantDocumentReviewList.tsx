"use client";

import { useState } from "react";
import { DocumentPreviewModal } from "@/components/ui/DocumentPreviewModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { DocumentTextIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/Button";
import { WorkflowStatusTag } from "@/components/ui/WorkflowStatusTag";
import { TRAINING_CERTIFICATE_DOCUMENT_TYPE } from "@/constants/documents";
import { EDUCATION_LEVEL_OPTIONS } from "@/constants/pds-options";
import { formatDate } from "@/utils/format-date";
import { createDocumentReviewerPreviewUrl } from "../../actions";
import { DocumentReviewPanel } from "./DocumentReviewPanel";

import type { ReviewerDocument } from "@/types/document-review";

function DocumentRow({
  document,
  onView,
}: {
  document: ReviewerDocument;
  onView: (document: ReviewerDocument) => void;
}) {
  const isTrainingCertificate =
    document.documentType === TRAINING_CERTIFICATE_DOCUMENT_TYPE;
  const title = isTrainingCertificate
    ? document.certificateTitle || `Certificate #${document.version}`
    : document.documentType;
  const highestEducationLabel = document.currentHighestEducationLevel
    ? (EDUCATION_LEVEL_OPTIONS.find(
        ({ value }) => value === document.currentHighestEducationLevel,
      )?.label ?? document.currentHighestEducationLevel)
    : null;
  const details = [
    `Version ${document.version}`,
    document.certificateType,
    document.certificateIssuer,
    document.certificateDate
      ? formatDate(document.certificateDate, "MMM D, YYYY")
      : null,
    document.totalUnits != null ? `${document.totalUnits} units` : null,
    highestEducationLabel
      ? `Highest education: ${highestEducationLabel}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary-light text-primary">
          <DocumentTextIcon aria-hidden="true" className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{title}</p>
          {details && (
            <p className="mt-0.5 truncate text-xs text-muted">{details}</p>
          )}
          <p className="mt-0.5 text-xs text-muted">
            Uploaded {formatDate(document.uploadedAt, "MMM D, YYYY")}
          </p>
        </div>
        {document.trainingHours != null && (
          <span className="whitespace-nowrap text-right text-xs text-muted">
            <span className="font-medium">{document.trainingHours}</span> hrs
          </span>
        )}
        {document.totalUnits != null && (
          <span className="whitespace-nowrap text-right text-xs text-muted">
            <span className="font-medium">{document.totalUnits}</span> units
          </span>
        )}
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <WorkflowStatusTag status={document.documentStatus} />
          <Button
            onClick={() => onView(document)}
            type="button"
            variant="ghost"
          >
            View
          </Button>
        </div>
      </div>
    </li>
  );
}

function DocumentSection({
  title,
  documents,
  onView,
}: {
  title: string;
  documents: ReviewerDocument[];
  onView: (document: ReviewerDocument) => void;
}) {
  if (!documents.length) return null;

  return (
    <section className="rounded-xl border border-line bg-panel p-4 sm:p-5">
      <div className="border-b border-line-subtle pb-3">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        <p className="mt-1 text-xs text-muted">
          {documents.length} document{documents.length === 1 ? "" : "s"} waiting
          for review.
        </p>
      </div>
      <ul className="divide-y divide-line-subtle">
        {documents.map((document) => (
          <DocumentRow
            document={document}
            key={document.documentId}
            onView={onView}
          />
        ))}
      </ul>
    </section>
  );
}

export function ApplicantDocumentReviewList({
  applicantNumber,
  documents,
  onReviewSuccess,
}: {
  applicantNumber: string;
  documents: ReviewerDocument[];
  onReviewSuccess?: (documentId: string) => void;
}) {
  const [selectedDocument, setSelectedDocument] =
    useState<ReviewerDocument | null>(null);
  const trainingDocuments = documents.filter(
    (document) => document.documentType === TRAINING_CERTIFICATE_DOCUMENT_TYPE,
  );
  const requiredDocuments = documents.filter(
    (document) =>
      document.isRequired &&
      document.documentType !== TRAINING_CERTIFICATE_DOCUMENT_TYPE,
  );
  const optionalDocuments = documents.filter(
    (document) =>
      !document.isRequired &&
      document.documentType !== TRAINING_CERTIFICATE_DOCUMENT_TYPE,
  );
  const totalTrainingHours = trainingDocuments.reduce(
    (total, document) => total + (document.trainingHours ?? 0),
    0,
  );

  function closePreview() {
    setSelectedDocument(null);
  }

  function viewDocument(document: ReviewerDocument) {
    setSelectedDocument(document);
  }

  return (
    <>
      {!documents.length && (
        <EmptyState title="No documents are waiting for review" description="All submitted documents for this applicant have been reviewed." />
      )}
      <div className="mt-6 space-y-5">
        <DocumentSection
          documents={requiredDocuments}
          onView={viewDocument}
          title="Required"
        />
        <DocumentSection
          documents={optionalDocuments}
          onView={viewDocument}
          title="Optional"
        />
        {trainingDocuments.length > 0 && (
          <section className="rounded-xl border border-line bg-panel p-4 sm:p-5">
            <div className="border-b border-line-subtle pb-3">
              <h2 className="text-lg font-semibold text-ink">
                {TRAINING_CERTIFICATE_DOCUMENT_TYPE}
              </h2>
              <p className="mt-1 text-sm text-muted">
                Optional. Hours count toward the Training score.
              </p>
            </div>
            <dl className="grid grid-cols-3 gap-3 border-b border-line-subtle py-4">
              <div>
                <dd className="text-2xl font-semibold leading-none text-primary">
                  {trainingDocuments.length}
                </dd>
                <dt className="mt-1 text-xs text-muted">certificates</dt>
              </div>
              <div>
                <dd className="text-2xl font-semibold leading-none text-primary">
                  {totalTrainingHours}
                </dd>
                <dt className="mt-1 text-xs text-muted">total hours</dt>
              </div>
              <div>
                <dd className="text-2xl font-semibold leading-none text-primary">
                  {trainingDocuments.length}
                </dd>
                <dt className="mt-1 text-xs text-muted">for review</dt>
              </div>
            </dl>
            <ul className="divide-y divide-line-subtle">
              {trainingDocuments.map((document) => (
                <DocumentRow
                  document={document}
                  key={document.documentId}
                  onView={viewDocument}
                />
              ))}
            </ul>
          </section>
        )}
      </div>
      {selectedDocument && (
        <DocumentPreviewModal
          key={selectedDocument.documentId}
          documentId={selectedDocument.documentId}
          loadPreview={createDocumentReviewerPreviewUrl}
          onClose={closePreview}
          title={`${selectedDocument.documentType} - Applicant ${applicantNumber}`}
        >
          <DocumentReviewPanel
            documentId={selectedDocument.documentId}
            documentStatus={selectedDocument.documentStatus}
            documentType={selectedDocument.documentType}
            trainingHours={selectedDocument.trainingHours}
            totalUnits={selectedDocument.totalUnits}
            currentHighestEducationLevel={selectedDocument.currentHighestEducationLevel}
            ocrTrainingHours={selectedDocument.ocrTrainingHours}
            ocrTotalUnits={selectedDocument.ocrTotalUnits}
            ocrConfidence={selectedDocument.ocrConfidence}
            previousReview={selectedDocument.previousReview}
            hideFileButton
            onReviewSuccess={() => {
              onReviewSuccess?.(selectedDocument.documentId);
              closePreview();
            }}
          />
        </DocumentPreviewModal>
      )}
    </>
  );
}
