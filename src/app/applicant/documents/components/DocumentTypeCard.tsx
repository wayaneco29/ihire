"use client";

import { useMemo, useState, useTransition } from "react";
import { message, Modal } from "antd";
import { DocumentTextIcon } from "@heroicons/react/24/outline";
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
  remarks: string | null;
  training_hours: number | null;
  total_units: number | null;
  pds_learning_development_id: string | null;
  pds_education_id: string | null;
};

const INITIAL_CERTIFICATE_COUNT = 5;

export function DocumentTypeCard({
  id,
  name,
  documents,
  isTrainingCertificate,
  isTranscript = false,
  isRequired = false,
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
  isRequired?: boolean;
  trainingEntries: { id: string; title: string; hours: number | null }[];
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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showAll, setShowAll] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const latest = documents[0];
  const trainingTitles = useMemo(
    () => new Map(trainingEntries.map((entry) => [entry.id, entry.title])),
    [trainingEntries],
  );
  const metricLabel = "hours";
  const recordLabel = "Certificate";

  const filteredDocuments = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return documents.filter((document) => {
      const linkedTraining = document.pds_learning_development_id
        ? (trainingTitles.get(document.pds_learning_development_id) ??
          "Linked PDS training")
        : "Not listed in PDS";
      const matchesSearch =
        !query ||
        `${recordLabel.toLocaleLowerCase()} ${document.version} ${linkedTraining} ${document.training_hours ?? ""} ${formatDate(document.uploaded_at)}`
          .toLocaleLowerCase()
          .includes(query);
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "FOR_REVIEW" &&
          ["PENDING", "FOR_REVIEW", "FOR_RESUBMISSION"].includes(
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
    const forReviewCount = documents.filter((document) =>
      ["PENDING", "FOR_REVIEW", "FOR_RESUBMISSION"].includes(document.status),
    ).length;
    const verifiedCount = documents.filter(
      (document) => document.status === "VERIFIED",
    ).length;
    const metricTotal = documents.reduce(
      (total, document) => total + (document.training_hours ?? 0),
      0,
    );

    return (
      <tr>
        <td className="p-0" colSpan={4}>
          <section className="overflow-hidden bg-panel" aria-label={name}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-subtle px-4 py-3 bg-primary">
              <div>
                <h2 className="text-sm font-semibold text-white">{name}</h2>
                <p className="mt-0.5 text-xs text-white/80">
                  {isRequired ? "Required" : "Optional"}
                  {" · "}
                  {documents.length}{" "}
                  {documents.length === 1
                    ? recordLabel.toLowerCase()
                    : `${recordLabel.toLowerCase()}s`}
                  {" · "}
                  {metricTotal} {metricLabel} total
                  {" · "}
                  {forReviewCount} for review
                </p>
              </div>
              <button
                className="inline-flex min-h-10 px-4 items-center gap-2 cursor-pointer rounded-sm bg-white text-sm! font-semibold text-primary transition"
                onClick={() => setUploadOpen(!uploadOpen)}
                type="button"
              >
                Add certificate
              </button>
            </div>

            <div className="flex flex-col gap-2 border-b border-line-subtle px-3 py-3 sm:flex-row sm:items-center">
              <label className="sr-only" htmlFor={`${id}-search`}>
                Search {recordLabel.toLowerCase()}s
              </label>
              <input
                className="min-h-10 min-w-0 flex-1 rounded-sm border border-line bg-panel px-3 text-sm! text-ink outline-none placeholder:text-muted focus:border-primary focus:ring-1 focus:ring-primary/15"
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
                  { key: "ALL", label: `All ${documents.length}` },
                  { key: "FOR_REVIEW", label: `For review ${forReviewCount}` },
                  { key: "VERIFIED", label: `Verified ${verifiedCount}` },
                ].map((filter) => (
                  <button
                    aria-pressed={statusFilter === filter.key}
                    className={`min-h-9 rounded-sm cursor-pointer border px-3 text-xs! font-medium transition ${
                      statusFilter === filter.key
                        ? "border-primary/20 bg-primary-light text-primary"
                        : "border-line text-muted hover:border-primary/40 hover:text-primary"
                    }`}
                    key={filter.key}
                    onClick={() => {
                      setStatusFilter(filter.key);
                      setShowAll(false);
                    }}
                    type="button"
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-xs">
                <thead className="bg-panel-muted text-[10px] uppercase tracking-wider text-muted">
                  <tr>
                    <th className="px-3 py-2 font-medium">#</th>
                    <th className="px-3 py-2 font-medium">{recordLabel}</th>
                    <th className="px-3 py-2 font-medium">Hours</th>
                    <th className="px-3 py-2 font-medium">
                      Linked PDS training
                    </th>
                    <th className="px-3 py-2 font-medium w-32">Status</th>
                    <th className="px-3 py-2 font-medium w-20">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-subtle">
                  {visibleDocuments.map((document) => (
                    <tr className="hover:bg-panel-muted/60" key={document.id}>
                      <td className="whitespace-nowrap px-3 py-3 text-muted">
                        #{document.version}
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-medium text-ink">
                          {recordLabel} #{document.version}
                        </p>
                        <p className="mt-0.5 text-[10px] text-muted">
                          Uploaded{" "}
                          {formatDate(document.uploaded_at, "MMM D, YYYY")}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 font-medium text-ink">
                        {document.training_hours ?? 0} hrs
                      </td>
                      <td className="px-3 py-3 text-muted">
                        {document.pds_learning_development_id
                          ? (trainingTitles.get(
                              document.pds_learning_development_id,
                            ) ?? "Linked PDS training")
                          : "Not listed in PDS"}
                      </td>
                      <td className="px-3 py-3">
                        <WorkflowStatusTag status={document.status} />
                      </td>
                      <td className="px-3 py-3 text-right">
                        <button
                          className="min-h-9 px-2 cursor-pointer text-xs! font-medium text-primary hover:underline disabled:opacity-60"
                          disabled={pending}
                          onClick={() => openDocument(document)}
                          type="button"
                        >
                          {pendingId === document.id ? "Preparing…" : "View"}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!visibleDocuments.length && (
                    <tr>
                      <td
                        className="px-3 py-8 text-center text-sm text-muted"
                        colSpan={6}
                      >
                        No {recordLabel.toLowerCase()}s match this search or
                        filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {filteredDocuments.length > INITIAL_CERTIFICATE_COUNT && (
              <div className="flex items-center justify-between border-t border-line-subtle px-3 py-2 text-xs! text-muted">
                <span>
                  Showing {visibleDocuments.length} of{" "}
                  {filteredDocuments.length}
                </span>
                <button
                  className="min-h-9 px-2 font-medium text-primary hover:underline"
                  onClick={() => setShowAll(!showAll)}
                  type="button"
                >
                  {showAll ? "Show fewer" : "Show more"}
                </button>
              </div>
            )}

            {openError && (
              <p className="px-4 py-2 text-sm text-danger" role="alert">
                {openError}
              </p>
            )}
            {signedUrl && (
              <a
                className="m-3 inline-flex min-h-9 items-center px-2 text-sm font-medium text-primary hover:underline"
                href={signedUrl}
                rel="noreferrer"
                target="_blank"
              >
                Open secure certificate
              </a>
            )}
            <Modal
              destroyOnHidden
              footer={null}
              onCancel={() => setUploadOpen(false)}
              open={uploadOpen}
              title="Add a certificate"
              width={640}
            >
              <p className="mb-4 text-sm text-muted">
                Upload one certificate at a time so its hours can be recorded
                separately.
              </p>
              <DocumentUploadForm
                documentTypeId={id}
                isTrainingCertificate={isTrainingCertificate}
                isTranscript={isTranscript}
                onCancel={() => setUploadOpen(false)}
                trainingEntries={trainingEntries}
                trainingEntriesUnavailable={trainingEntriesUnavailable}
                educationEntries={educationEntries}
                educationEntriesUnavailable={educationEntriesUnavailable}
              />
            </Modal>
          </section>
        </td>
      </tr>
    );
  }

  return (
    <>
      <tr className="transition-colors hover:bg-panel-muted/60">
        <td className="px-4 py-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-sm bg-primary-light text-primary">
              <DocumentTextIcon aria-hidden="true" className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">{name}</p>
              <p className="mt-0.5 truncate text-xs text-muted">
                {latest
                  ? `Version ${latest.version} · ${formatDate(latest.uploaded_at)}${isTranscript ? ` · ${latest.total_units ?? 0} units` : ""}${documents.length > 1 ? ` · ${documents.length - 1} previous versions` : ""}`
                  : isTranscript
                    ? "No TOR uploaded yet"
                    : "No file uploaded yet"}
              </p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
              isRequired
                ? "bg-primary-light text-primary"
                : "bg-panel-muted text-muted"
            }`}
          >
            {isRequired ? "Required" : "Optional"}
          </span>
        </td>
        <td className="px-4 py-3">
          {latest ? (
            <WorkflowStatusTag status={latest.status} />
          ) : (
            <span className="text-sm text-muted">Not submitted</span>
          )}
        </td>
        <td className="px-4 py-3 text-right">
          {latest && (
            <button
              className="mr-2 inline-flex min-h-9 items-center rounded-sm text-xs! border border-line px-3 cursor-pointer font-medium text-ink hover:border-primary hover:text-primary disabled:opacity-60"
              disabled={pending}
              onClick={() => openDocument(latest)}
              type="button"
            >
              {pendingId === latest.id ? "Preparing…" : "View"}
            </button>
          )}
          <button
            className="inline-flex min-h-9 items-center rounded-sm bg-primary px-3 text-xs! font-semibold cursor-pointer text-on-primary hover:bg-primary-dark"
            onClick={() => setUploadOpen(!uploadOpen)}
            type="button"
          >
            Replace
          </button>
        </td>
      </tr>
      {(openError || signedUrl) && (
        <tr>
          <td className="px-4 pb-3 text-sm" colSpan={4}>
            {openError && (
              <p className="text-danger" role="alert">
                {openError}
              </p>
            )}
            {signedUrl && (
              <a
                className="text-primary hover:underline"
                href={signedUrl}
                rel="noreferrer"
                target="_blank"
              >
                {isTranscript ? "Open secure TOR" : "Open secure document"}
              </a>
            )}
          </td>
        </tr>
      )}
      {contextHolder}
      <Modal
        destroyOnHidden
        footer={null}
        onCancel={() => setUploadOpen(false)}
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
              ? "Upload an updated TOR. The previous version will remain in your document history."
              : "Upload your TOR. You can upload an updated version later."
            : "Upload one document at a time and send it for review."}
        </p>
        <DocumentUploadForm
          documentTypeId={id}
          isTrainingCertificate={false}
          isTranscript={isTranscript}
          onCancel={() => setUploadOpen(false)}
          onSuccess={(successMessage) => {
            setUploadOpen(false);
            messageApi.success(successMessage);
          }}
          trainingEntries={trainingEntries}
          trainingEntriesUnavailable={trainingEntriesUnavailable}
          educationEntries={educationEntries}
          educationEntriesUnavailable={educationEntriesUnavailable}
        />
      </Modal>
    </>
  );
}
