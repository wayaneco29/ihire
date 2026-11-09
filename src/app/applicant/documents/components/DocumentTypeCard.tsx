"use client";

import { useMemo, useState, useTransition } from "react";
import { FileTextOutlined } from "@ant-design/icons";
import { Modal } from "antd";
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
  pds_learning_development_id: string | null;
};

const INITIAL_CERTIFICATE_COUNT = 5;

export function DocumentTypeCard({
  id,
  name,
  documents,
  isTrainingCertificate,
  featured = false,
  trainingEntries,
  trainingEntriesUnavailable,
}: {
  id: string;
  name: string;
  documents: DocumentRecord[];
  isTrainingCertificate: boolean;
  featured?: boolean;
  trainingEntries: { id: string; title: string; hours: number | null }[];
  trainingEntriesUnavailable: boolean;
}) {
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

  const filteredDocuments = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return documents.filter((document) => {
      const linkedTraining = document.pds_learning_development_id
        ? (trainingTitles.get(document.pds_learning_development_id) ??
          "Linked PDS training")
        : "Not listed in PDS";
      const matchesSearch =
        !query ||
        `certificate ${document.version} ${linkedTraining} ${document.training_hours ?? ""} ${formatDate(document.uploaded_at)}`
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
  }, [documents, search, statusFilter, trainingTitles]);

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

    return (
      <section
        className="overflow-hidden rounded-md border border-line bg-panel"
        aria-label={name}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-subtle px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-ink">{name}</h2>
            <p className="mt-0.5 text-xs text-muted">
              {documents.length}{" "}
              {documents.length === 1 ? "certificate" : "certificates"}
              {" · "}
              {documents.reduce(
                (total, document) => total + (document.training_hours ?? 0),
                0,
              )}{" "}
              hours total
              {" · "}
              {forReviewCount} for review
            </p>
          </div>
          <button
            className="inline-flex min-h-10 px-4 items-center gap-2 cursor-pointer rounded-sm bg-primary text-sm! font-semibold text-on-primary transition hover:bg-primary-dark"
            onClick={() => setUploadOpen(!uploadOpen)}
            type="button"
          >
            Add certificate
          </button>
        </div>

        <div className="flex flex-col gap-2 border-b border-line-subtle px-3 py-3 sm:flex-row sm:items-center">
          <label className="sr-only" htmlFor={`${id}-search`}>
            Search certificates
          </label>
          <input
            className="min-h-10 min-w-0 flex-1 rounded-sm border border-line bg-panel px-3 text-sm! text-ink outline-none placeholder:text-muted focus:border-primary focus:ring-1 focus:ring-primary/15"
            id={`${id}-search`}
            onChange={(event) => {
              setSearch(event.target.value);
              setShowAll(false);
            }}
            placeholder="Search certificates"
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
                <th className="px-3 py-2 font-medium">Certificate</th>
                <th className="px-3 py-2 font-medium">Hours</th>
                <th className="px-3 py-2 font-medium">Linked PDS training</th>
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
                      Certificate #{document.version}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted">
                      Uploaded {formatDate(document.uploaded_at, "MMM D, YYYY")}
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
                    No certificates match this search or filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filteredDocuments.length > INITIAL_CERTIFICATE_COUNT && (
          <div className="flex items-center justify-between border-t border-line-subtle px-3 py-2 text-xs! text-muted">
            <span>
              Showing {visibleDocuments.length} of {filteredDocuments.length}
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
            isTrainingCertificate
            onCancel={() => setUploadOpen(false)}
            trainingEntries={trainingEntries}
            trainingEntriesUnavailable={trainingEntriesUnavailable}
          />
        </Modal>
      </section>
    );
  }

  return (
    <div
      className={
        featured
          ? "rounded-lg border border-line bg-panel p-3"
          : "border-b border-line-subtle py-2.5 last:border-b-0"
      }
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-light text-primary">
            <FileTextOutlined aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink">{name}</p>
            <p className="mt-0.5 truncate text-xs text-muted">
              {latest
                ? `Version ${latest.version} · ${formatDate(latest.uploaded_at)}${documents.length > 1 ? ` · ${documents.length - 1} previous versions` : ""}`
                : "No file uploaded yet"}
            </p>
          </div>
        </div>
        {latest ? (
          <div className="flex flex-wrap items-center gap-2 pl-11 sm:pl-0">
            <WorkflowStatusTag status={latest.status} />
            <button
              className="inline-flex min-h-9 items-center rounded-sm border border-line px-3 cursor-pointer text-xs! font-medium text-ink hover:border-primary hover:text-primary disabled:opacity-60"
              disabled={pending}
              onClick={() => openDocument(latest)}
              type="button"
            >
              {pendingId === latest.id ? "Preparing…" : "View"}
            </button>
            <button
              className="inline-flex min-h-9 items-center px-2 text-xs! cursor-pointer font-medium text-primary hover:underline"
              onClick={() => setUploadOpen(!uploadOpen)}
              type="button"
            >
              Replace
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 pl-11 sm:pl-0">
            <span className="rounded-full bg-panel-muted px-2.5 py-1 text-[10px] text-muted">
              Not submitted
            </span>
            <button
              className="inline-flex min-h-9 items-center rounded-sm bg-primary px-3 text-xs! font-semibold text-on-primary hover:bg-primary-dark"
              onClick={() => setUploadOpen(!uploadOpen)}
              type="button"
            >
              Upload
            </button>
          </div>
        )}
      </div>
      {uploadOpen && (
        <div className="w-full">
          <DocumentUploadForm
            documentTypeId={id}
            isTrainingCertificate={false}
            onCancel={() => setUploadOpen(false)}
            trainingEntries={trainingEntries}
            trainingEntriesUnavailable={trainingEntriesUnavailable}
          />
        </div>
      )}
    </div>
  );
}
