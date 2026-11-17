"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { Modal } from "antd";
import { DocumentTextIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/Button";
import { WorkflowStatusTag } from "@/components/ui/WorkflowStatusTag";
import { TRAINING_CERTIFICATE_DOCUMENT_TYPE } from "@/constants/documents";
import { EDUCATION_LEVEL_OPTIONS } from "@/constants/pds-options";
import { formatDate } from "@/utils/format-date";
import { createDocumentReviewerPreviewUrl } from "../../actions";
import { DocumentReviewPanel } from "./DocumentReviewPanel";

type ReviewerDocument = {
  documentId: string;
  documentType: string;
  documentStatus: string;
  uploadedAt: string;
  storageKey: string;
  isRequired: boolean;
  version: number;
  certificateTitle: string | null;
  certificateType: string | null;
  certificateIssuer: string | null;
  certificateDate: string | null;
  trainingHours: number | null;
  totalUnits: number | null;
  currentHighestEducationLevel: string | null;
  ocrTrainingHours: number | null;
  ocrTotalUnits: number | null;
  ocrConfidence: number | null;
  previousReview: {
    status: string;
    remarks: string | null;
    reviewed_at: string;
    confirmed_training_hours: number | null;
    confirmed_total_units: number | null;
  } | null;
};

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
            className="!h-8 !rounded-sm !px-2 !text-xs"
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
}: {
  applicantNumber: string;
  documents: ReviewerDocument[];
}) {
  const [selectedDocument, setSelectedDocument] =
    useState<ReviewerDocument | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewContentType, setPreviewContentType] = useState<string | null>(
    null,
  );
  const [previewMessage, setPreviewMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const trainingDocuments = documents.filter(
    (document) =>
      document.documentType === TRAINING_CERTIFICATE_DOCUMENT_TYPE,
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
    setPreviewUrl(null);
    setPreviewContentType(null);
    setPreviewMessage(null);
  }

  function viewDocument(document: ReviewerDocument) {
    setSelectedDocument(document);
    setPreviewUrl(null);
    setPreviewContentType(null);
    setPreviewMessage(null);
    startTransition(async () => {
      const result = await createDocumentReviewerPreviewUrl({
        documentId: document.documentId,
      });
      if (!result.success || !result.signedUrl) {
        setPreviewMessage(result.message);
        return;
      }

      setPreviewUrl(result.signedUrl);
      setPreviewContentType(result.contentType ?? null);
    });
  }

  return (
    <>
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
      <Modal
        centered
        destroyOnHidden
        footer={null}
        onCancel={closePreview}
        open={selectedDocument !== null}
        title={
          selectedDocument ? (
            <div>
              <p>{selectedDocument.documentType}</p>
              <p className="mt-1 text-xs font-normal text-muted">
                Applicant {applicantNumber} · Uploaded{" "}
                {formatDate(
                  selectedDocument.uploadedAt,
                  "MMM D, YYYY · h:mm A",
                )}
              </p>
            </div>
          ) : null
        }
        width={960}
      >
        <div className="max-h-[78dvh] overflow-y-auto">
          <div className="bg-panel-muted p-3 sm:p-5">
            {previewUrl ? (
              <div className="grid min-h-64 min-w-0 place-items-center">
                {previewContentType?.startsWith("image/") ? (
                  <Image
                    alt={`${selectedDocument?.documentType ?? "Applicant"} document for applicant ${applicantNumber}`}
                    className="h-auto max-h-[55dvh] w-auto max-w-full rounded-sm object-contain"
                    height={1600}
                    unoptimized
                    src={previewUrl}
                    width={1600}
                  />
                ) : previewContentType === "application/pdf" ? (
                  <iframe
                    className="h-[55dvh] min-h-64 w-full rounded-sm border border-line bg-panel"
                    referrerPolicy="no-referrer"
                    src={previewUrl}
                    title={`${selectedDocument?.documentType ?? "Applicant"} document preview`}
                  />
                ) : (
                  <div className="max-w-md rounded-sm border border-line bg-panel p-5 text-center">
                    <p className="font-medium text-ink">
                      Preview is not available for this file type.
                    </p>
                    <p className="mt-2 text-sm text-muted">
                      Download the file to view it.
                    </p>
                  </div>
                )}
                {previewContentType?.startsWith("image/") && (
                  <p className="mt-2 text-xs text-muted">
                    Download the file to view the image at full resolution.
                  </p>
                )}
              </div>
            ) : (
              <div className="grid min-h-64 place-items-center rounded-sm border border-dashed border-line-strong bg-panel px-5 text-center">
                <p className="text-sm text-muted">
                  {isPending
                    ? "Loading secure document preview…"
                    : (previewMessage ?? "The preview is not available.")}
                </p>
              </div>
            )}
            {previewUrl && (
              <a
                className="mt-3 inline-flex min-h-10 items-center rounded-sm px-3 text-sm font-semibold text-primary hover:bg-primary-light"
                download
                href={previewUrl}
              >
                Download document
              </a>
            )}
          </div>
          {selectedDocument && previewUrl && (
            <div className="mt-4">
              <DocumentReviewPanel
                documentId={selectedDocument.documentId}
                documentStatus={selectedDocument.documentStatus}
                documentType={selectedDocument.documentType}
                trainingHours={selectedDocument.trainingHours}
                totalUnits={selectedDocument.totalUnits}
                currentHighestEducationLevel={
                  selectedDocument.currentHighestEducationLevel
                }
                ocrTrainingHours={selectedDocument.ocrTrainingHours}
                ocrTotalUnits={selectedDocument.ocrTotalUnits}
                ocrConfidence={selectedDocument.ocrConfidence}
                previousReview={selectedDocument.previousReview}
                hideFileButton
                onReviewSuccess={closePreview}
                stayOnPageOnSuccess
                storageKey={selectedDocument.storageKey}
              />
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
