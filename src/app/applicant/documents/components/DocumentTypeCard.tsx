"use client";

import { useState, useTransition } from "react";
import { WorkflowStatusTag } from "@/components/ui/WorkflowStatusTag";
import { formatDate } from "@/utils/format-date";
import { createClient } from "@/lib/supabase/client";
import { DocumentUploadForm } from "./DocumentUploadForm";

export type DocumentVersion = {
  id: string;
  file_path: string;
  version: number;
  status: string;
  uploaded_at: string;
  remarks: string | null;
};

export function DocumentTypeCard({
  id,
  name,
  required,
  versions,
}: {
  id: string;
  name: string;
  required: boolean;
  versions: DocumentVersion[];
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const latest = versions[0];

  function openDocument(document: DocumentVersion) {
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

  return (
    <article className="rounded-2xl border border-line bg-panel p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-ink">{name}</h2>
          <p className="mt-1 text-xs text-muted">{required ? "Required document" : "Optional document"}</p>
        </div>
        {latest && <WorkflowStatusTag status={latest.status} />}
      </div>

      {!latest ? (
        <p className="mt-4 rounded-xl bg-panel-muted p-3 text-sm text-muted">No file uploaded yet.</p>
      ) : (
        <div className="mt-4 rounded-xl bg-panel-muted p-4">
          <p className="text-sm font-medium text-ink">Version {latest.version}</p>
          <p className="mt-1 text-xs text-muted">Uploaded {formatDate(latest.uploaded_at, "MMM D, YYYY · h:mm A")}</p>
          {latest.remarks && (
            <div className="mt-3 rounded-lg border border-line bg-panel p-3">
              <p className="text-xs font-semibold text-ink">Latest evaluator remarks</p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-5 text-muted">{latest.remarks}</p>
            </div>
          )}
          <button
            className="mt-3 inline-flex min-h-11 items-center rounded-lg border border-primary px-3 text-sm font-semibold text-primary transition hover:bg-primary-light disabled:opacity-60"
            disabled={pending}
            onClick={() => openDocument(latest)}
            type="button"
          >
            {pendingId === latest.id ? "Preparing file…" : "View latest file"}
          </button>
          {openError && <p className="mt-2 text-sm text-danger" role="alert">{openError}</p>}
          {signedUrl && (
            <a
              className="mt-3 inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-semibold text-primary hover:bg-primary-light hover:text-primary-dark"
              href={signedUrl}
              rel="noreferrer"
              target="_blank"
            >
              Open secure document
            </a>
          )}
        </div>
      )}

      {versions.length > 1 && (
        <details className="mt-4">
          <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium text-primary">Previous versions ({versions.length - 1})</summary>
          <ul className="mt-2 divide-y divide-line-subtle rounded-xl border border-line-subtle px-3">
            {versions.slice(1).map((version) => (
              <li className="flex flex-wrap items-center justify-between gap-3 py-3" key={version.id}>
                <div>
                  <p className="text-sm font-medium text-ink">Version {version.version}</p>
                  <p className="mt-1 text-xs text-muted">{formatDate(version.uploaded_at)}</p>
                  {version.remarks && <p className="mt-1 text-xs text-muted">Remark: {version.remarks}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <WorkflowStatusTag status={version.status} />
                  <button className="min-h-11 rounded-lg px-2 text-sm font-medium text-primary hover:bg-primary-light hover:text-primary-dark" disabled={pending} onClick={() => openDocument(version)} type="button">
                    View
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </details>
      )}

      <DocumentUploadForm documentTypeId={id} />
    </article>
  );
}
