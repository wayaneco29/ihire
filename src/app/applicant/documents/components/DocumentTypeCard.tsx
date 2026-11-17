"use client";

import { useMemo, useState, useTransition } from "react";
import { Input, message, Modal } from "antd";
import { DocumentTextIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/Button";
import { EDUCATION_LEVEL_OPTIONS } from "@/constants/pds-options";
import { WorkflowStatusTag } from "@/components/ui/WorkflowStatusTag";
import { formatDate } from "@/utils/format-date";
import { createClient } from "@/lib/supabase/client";
import { DocumentUploadForm } from "./DocumentUploadForm";

export type DocumentRecord = {
  id: string;
  file_path: string;
  version: number;
  status: string;
  uploaded_at: string;
  certificate_title: string | null;
  certificate_type: string | null;
  certificate_issuer: string | null;
  certificate_date: string | null;
  remarks: string | null;
  training_hours: number | null;
  total_units: number | null;
  current_highest_education_level: string | null;
  pds_learning_development_id: string | null;
  pds_education_id: string | null;
  replaces_document_id: string | null;
  supersededByVersion: number | null;
};

const INITIAL_CERTIFICATE_COUNT = 5;

export function DocumentTypeCard({
  id,
  name,
  documents,
  isTrainingCertificate,
  isTranscript = false,
  trainingEntries,
  trainingEntriesUnavailable,
  educationEntries = [],
  educationEntriesUnavailable = false,
}: {
  id: string;
  name: string;
  documents: DocumentRecord[];
  isTrainingCertificate: boolean;
  isTranscript?: boolean;
  trainingEntries: {
    id: string;
    title: string;
    hours: number | null;
    sort_order: number;
  }[];
  trainingEntriesUnavailable: boolean;
  educationEntries?: {
    id: string;
    level: string;
    schoolName: string | null;
    degreeCourse: string | null;
  }[];
  educationEntriesUnavailable?: boolean;
}) {
  const [messageApi, contextHolder] = message.useMessage();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadProcessing, setUploadProcessing] = useState(false);
  const [replacementTarget, setReplacementTarget] =
    useState<DocumentRecord | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showAll, setShowAll] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const latest = documents[0];
  const highestEducationLabel = latest?.current_highest_education_level
    ? (EDUCATION_LEVEL_OPTIONS.find(
        ({ value }) => value === latest.current_highest_education_level,
      )?.label ?? latest.current_highest_education_level)
    : null;
  const latestSummary = latest
    ? [
        `Version ${latest.version}`,
        formatDate(latest.uploaded_at),
        ...(isTranscript
          ? [
              `${latest.total_units ?? 0} units`,
              ...(highestEducationLabel
                ? [`Highest education: ${highestEducationLabel}`]
                : []),
            ]
          : []),
      ].join(", ")
    : isTranscript
      ? "No TOR uploaded yet"
      : "No file uploaded yet";
  const trainingTitles = useMemo(
    () => new Map(trainingEntries.map((entry) => [entry.id, entry.title])),
    [trainingEntries],
  );
  const recordLabel = "Certificate";

  const filteredDocuments = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return documents
      .filter((document) => document.supersededByVersion === null)
      .filter((document) => {
        const linkedTraining = document.pds_learning_development_id
          ? (trainingTitles.get(document.pds_learning_development_id) ??
            "Linked PDS training")
          : "Not listed in PDS";
        const matchesSearch =
          !query ||
          `${document.certificate_title ?? ""} ${recordLabel.toLocaleLowerCase()} ${document.version} ${linkedTraining} ${document.training_hours ?? ""} ${formatDate(document.uploaded_at)}`
            .toLocaleLowerCase()
            .includes(query);
        const matchesStatus =
          statusFilter === "ALL" ||
          (statusFilter === "FOR_REVIEW" &&
            ["PENDING", "FOR_REVIEW", "REJECTED", "FOR_RESUBMISSION"].includes(
              document.status,
            )) ||
          document.status === statusFilter;
        return matchesSearch && matchesStatus;
      });
  }, [documents, recordLabel, search, statusFilter, trainingTitles]);

  const visibleDocuments = showAll
    ? filteredDocuments
    : filteredDocuments.slice(0, INITIAL_CERTIFICATE_COUNT);

  function openDocument(document: DocumentRecord) {
    setOpenError(null);
    setSignedUrl(null);
    setPendingId(document.id);
    const previewWindow = window.open("about:blank", "_blank");
    if (previewWindow) previewWindow.opener = null;
    startTransition(async () => {
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from("applicant-documents")
        .createSignedUrl(document.file_path, 60);
      setPendingId(null);
      if (error || !data?.signedUrl) {
        previewWindow?.close();
        setOpenError("This file could not be opened right now.");
        return;
      }
      if (previewWindow) previewWindow.location.replace(data.signedUrl);
      else setSignedUrl(data.signedUrl);
    });
  }

  if (isTrainingCertificate) {
    const currentDocuments = documents.filter(
      (document) => document.supersededByVersion === null,
    );
    const forReviewCount = currentDocuments.filter((document) =>
      ["PENDING", "FOR_REVIEW", "REJECTED", "FOR_RESUBMISSION"].includes(document.status),
    ).length;
    const metricTotal = currentDocuments.reduce(
      (total, document) => total + (document.training_hours ?? 0),
      0,
    );
    const closeUpload = (force = false) => {
      if (uploadProcessing && !force) return;
      setUploadOpen(false);
      setReplacementTarget(null);
      setUploadProcessing(false);
    };

    return (
      <section aria-label={name} id={id}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-subtle pb-3">
          <div>
            <h2 className="text-lg font-semibold text-ink">{name}</h2>
            <p className="mt-1 text-sm text-muted">
              Optional. Hours count toward your Training score.
            </p>
          </div>
          <Button
            className="!h-10 !rounded-sm !px-6 !text-sm"
            onClick={() => setUploadOpen(!uploadOpen)}
            type="button"
            variant="filled"
          >
            Add certificate
          </Button>
        </div>

        <dl className="grid grid-cols-3 gap-3 border-b border-line-subtle py-4">
          <div>
            <dd className="text-2xl font-semibold leading-none text-primary">
              {currentDocuments.length}
            </dd>
            <dt className="mt-1 text-xs text-muted">certificates</dt>
          </div>
          <div>
            <dd className="text-2xl font-semibold leading-none text-primary">
              {metricTotal}
            </dd>
            <dt className="mt-1 text-xs text-muted">total hours</dt>
          </div>
          <div>
            <dd className="text-2xl font-semibold leading-none text-primary">
              {forReviewCount}
            </dd>
            <dt className="mt-1 text-xs text-muted">for review</dt>
          </div>
        </dl>

        <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
          <label className="sr-only" htmlFor={`${id}-search`}>
            Search {recordLabel.toLowerCase()}s
          </label>
          <Input
            className="min-h-10 min-w-0 flex-1 rounded-sm! border-line! bg-panel! px-4 text-sm! text-ink placeholder:text-muted"
            id={`${id}-search`}
            onChange={(event) => {
              setSearch(event.target.value);
              setShowAll(false);
            }}
            placeholder={`Search ${recordLabel.toLowerCase()}s`}
            type="search"
            value={search}
          />
          <div
            className="flex flex-wrap gap-2"
            aria-label="Filter certificates by status"
          >
            {[
              {
                key: "ALL",
                label: <span>All</span>,
              },
              {
                key: "FOR_REVIEW",
                label: <span>For review</span>,
              },
              { key: "VERIFIED", label: <span>Verified</span> },
            ].map((filter) => (
              <Button
                aria-pressed={statusFilter === filter.key}
                className={`min-h-8 px-5 rounded-full cursor-pointer border text-xs! font-medium transition ${
                  statusFilter === filter.key
                    ? "border-primary bg-primary text-on-primary"
                    : "border-line text-muted hover:border-primary/40 hover:text-primary"
                }`}
                key={filter.key}
                onClick={() => {
                  setStatusFilter(filter.key);
                  setShowAll(false);
                }}
                type="button"
                variant="unstyled"
              >
                {filter.label}
              </Button>
            ))}
          </div>
        </div>

        <ul className="divide-y divide-line-subtle">
          {visibleDocuments.map((document) => (
            <li className="py-3" key={document.id}>
              <div className="grid grid-cols-[minmax(0,1fr)_4.25rem] items-center gap-x-3 gap-y-2 sm:grid-cols-[minmax(0,1fr)_4.5rem_6.5rem_auto]">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">
                    {document.certificate_title ||
                      (document.pds_learning_development_id &&
                        trainingTitles.get(
                          document.pds_learning_development_id,
                        )) ||
                      `${recordLabel} #${document.version}`}
                  </p>
                  {(document.certificate_type ||
                    document.certificate_issuer ||
                    document.certificate_date) && (
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {[
                        document.certificate_type,
                        document.certificate_issuer,
                        document.certificate_date
                          ? formatDate(document.certificate_date, "MMM D, YYYY")
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                  <p className="mt-0.5 text-xs text-muted">
                    Uploaded {formatDate(document.uploaded_at, "MMM D, YYYY")}
                  </p>
                </div>
                <span className="whitespace-nowrap text-right text-xs! text-muted">
                  <span className="text-xs! font-medium">
                    {document.training_hours ?? 0}
                  </span>{" "}
                  hrs
                </span>
                <div className="col-span-2 col-start-2 flex items-center justify-end gap-2 sm:contents">
                  <WorkflowStatusTag status={document.status} />
                  <div className="flex items-center gap-2">
                    <Button
                      className="!h-9 !rounded-sm !px-2 !text-xs"
                      disabled={pending}
                      onClick={() => openDocument(document)}
                      type="button"
                      variant="ghost"
                    >
                      {pendingId === document.id ? "Preparing…" : "View"}
                    </Button>
                    {document.status === "VERIFIED" ? (
                      <span className="px-2 text-xs font-medium text-muted">
                        Locked
                      </span>
                    ) : (
                      <Button
                        className="!h-8 !px-5 !text-xs"
                        onClick={() => setReplacementTarget(document)}
                        type="button"
                        variant="filled"
                      >
                        Replace
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </li>
          ))}
          {!visibleDocuments.length && (
            <li className="py-8 text-center text-sm text-muted">
              No {recordLabel.toLowerCase()}s match this search or filter.
            </li>
          )}
        </ul>

        {filteredDocuments.length > INITIAL_CERTIFICATE_COUNT && (
          <div className="flex items-center justify-between border-t border-line-subtle py-2 text-xs text-muted">
            <span>
              Showing {visibleDocuments.length} of {filteredDocuments.length}
            </span>
            <Button
              className="!h-9 !px-2"
              onClick={() => setShowAll(!showAll)}
              type="button"
              variant="ghost"
            >
              {showAll ? "Show fewer" : "Show more"}
            </Button>
          </div>
        )}

        {openError && (
          <p className="py-2 text-sm text-danger" role="alert">
            {openError}
          </p>
        )}
        {signedUrl && (
          <a
            className="inline-flex min-h-9 items-center py-2 text-sm font-medium text-primary hover:underline"
            href={signedUrl}
            rel="noreferrer"
            target="_blank"
          >
            Open secure certificate
          </a>
        )}
        <Modal
          closable={!uploadProcessing}
          destroyOnHidden
          footer={null}
          onCancel={() => closeUpload()}
          keyboard={!uploadProcessing}
          maskClosable={!uploadProcessing}
          open={uploadOpen || replacementTarget !== null}
          title={
            replacementTarget ? "Update certificate file" : "Add a certificate"
          }
          width={640}
        >
          <p className="mb-4 text-sm text-muted">
            {replacementTarget
              ? "Upload a new file for this certificate. The previous file and review history will remain available."
              : "Upload one certificate at a time so its hours can be recorded separately."}
          </p>
          <DocumentUploadForm
            documentTypeId={id}
            isTrainingCertificate={isTrainingCertificate}
            isTranscript={isTranscript}
            onCancel={closeUpload}
            onProcessingChange={setUploadProcessing}
            onSuccess={(successMessage) => {
              closeUpload(true);
              messageApi.success(successMessage);
            }}
            replacementDocument={replacementTarget}
            trainingEntries={trainingEntries}
            trainingEntriesUnavailable={trainingEntriesUnavailable}
            educationEntries={educationEntries}
            educationEntriesUnavailable={educationEntriesUnavailable}
          />
        </Modal>
      </section>
    );
  }

  return (
    <section
      aria-label={name}
      className="flex flex-col gap-3 border-b border-line-subtle py-3 sm:flex-row sm:items-center sm:gap-4"
      id={id}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary-light text-primary">
        <DocumentTextIcon aria-hidden="true" className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">{name}</p>
        <p className="mt-0.5 text-xs text-muted">{latestSummary}</p>
        {openError && (
          <p className="mt-1 text-xs text-danger" role="alert">
            {openError}
          </p>
        )}
        {signedUrl && (
          <a
            className="mt-1 inline-flex min-h-8 items-center text-xs font-medium text-primary hover:underline"
            href={signedUrl}
            rel="noreferrer"
            target="_blank"
          >
            {isTranscript ? "Open secure TOR" : "Open secure document"}
          </a>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
        {latest ? (
          <WorkflowStatusTag status={latest.status} />
        ) : (
          <span className="text-xs text-muted">Not submitted</span>
        )}
        {latest && (
          <Button
            className="!h-8 !rounded-sm !px-2 !text-xs"
            disabled={pending}
            onClick={() => openDocument(latest)}
            type="button"
            variant="ghost"
          >
            {pendingId === latest.id ? "Preparing…" : "View"}
          </Button>
        )}
        {latest?.status === "VERIFIED" ? (
          <span className="px-2 text-xs font-medium text-muted">
            Verified · locked
          </span>
        ) : (
          <Button
            className="!h-8 !px-5 !text-xs"
            onClick={() => setUploadOpen(!uploadOpen)}
            type="button"
            variant="filled"
          >
            {!latest ? "Upload" : "Replace"}
          </Button>
        )}
      </div>
      {contextHolder}
      <Modal
        closable={!uploadProcessing}
        destroyOnHidden
        footer={null}
        onCancel={() => {
          if (!uploadProcessing) {
            setUploadOpen(false);
            setUploadProcessing(false);
          }
        }}
        keyboard={!uploadProcessing}
        maskClosable={!uploadProcessing}
        open={uploadOpen}
        title={
          isTranscript
            ? latest
              ? "Update TOR"
              : "Upload TOR"
            : latest
              ? "Replace a document"
              : "Upload a document"
        }
        width={640}
      >
        <p className="mb-4 text-sm text-muted">
          {isTranscript
            ? latest
              ? "Upload an updated TOR. The previous version will remain in your document history. Submit all documents when ready."
              : "Upload your TOR, then submit all documents when ready for review."
            : "Upload one document at a time. Submit all documents from this page when you are ready for review."}
        </p>
        <DocumentUploadForm
          documentTypeId={id}
          isTrainingCertificate={false}
          isTranscript={isTranscript}
          onCancel={() => {
            if (!uploadProcessing) {
              setUploadOpen(false);
              setUploadProcessing(false);
            }
          }}
          onProcessingChange={setUploadProcessing}
          onSuccess={(successMessage) => {
            setUploadProcessing(false);
            setUploadOpen(false);
            messageApi.success(successMessage);
          }}
          trainingEntries={trainingEntries}
          trainingEntriesUnavailable={trainingEntriesUnavailable}
          educationEntries={educationEntries}
          educationEntriesUnavailable={educationEntriesUnavailable}
        />
      </Modal>
    </section>
  );
}
