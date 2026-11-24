"use client";

import Image from "next/image";
import { useEffect, useState, type ReactNode } from "react";
import { Modal } from "antd";
import { Button } from "./Button";

type PreviewResult = {
  success: boolean;
  message: string;
  signedUrl?: string;
  contentType?: string;
};

// Mount with a document-specific key so each document gets a fresh preview.
export function DocumentPreviewModal({
  documentId,
  title,
  loadPreview,
  onClose,
  children,
}: {
  documentId: string;
  title: ReactNode;
  loadPreview: (input: { documentId: string }) => Promise<PreviewResult>;
  onClose: () => void;
  children?: ReactNode;
}) {
  const [result, setResult] = useState<PreviewResult | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    loadPreview({ documentId }).then(
      (preview) => { if (!cancelled) setResult(preview); },
      () => {
        if (!cancelled) setResult({ success: false, message: "The preview could not be loaded. Please try again." });
      },
    );
    return () => { cancelled = true; };
  }, [documentId, loadPreview, attempt]);

  const previewUrl = result?.success ? result.signedUrl : null;
  return (
    <Modal centered destroyOnHidden footer={<Button onClick={onClose} variant="bordered">Close document</Button>} onCancel={onClose} open title={title} width={960}>
      <div className="max-h-[78dvh] overflow-y-auto">
        <div className="bg-panel-muted p-3 sm:p-5">
          {previewUrl ? (
            <>
              {result?.contentType?.startsWith("image/") ? (
                <Image
                  alt="Document preview"
                  className="mx-auto h-auto max-h-[55dvh] w-auto max-w-full rounded-sm object-contain"
                  height={1600} width={1600} unoptimized src={previewUrl}
                />
              ) : result?.contentType === "application/pdf" ? (
                <iframe
                  className="h-[55dvh] min-h-64 w-full rounded-sm border border-line bg-panel"
                  referrerPolicy="no-referrer" src={previewUrl} title="Document preview"
                />
              ) : (
                <p className="p-5 text-center text-sm text-muted">Preview is not available for this file type. Download the file to view it.</p>
              )}
              <a
                className="mt-3 inline-flex min-h-11 items-center rounded-sm px-3 text-sm font-semibold text-primary hover:bg-primary-light"
                download href={previewUrl} target="_blank" rel="noopener noreferrer"
              >
                Download document
              </a>
            </>
          ) : (
            <div className="grid min-h-64 place-content-center gap-3 rounded-sm border border-dashed border-line-strong bg-panel px-5 text-center">
              <p className="text-sm text-muted" role="status">
                {result?.message ?? "Loading secure document preview…"}
              </p>
              {result && (
                <Button variant="bordered" onClick={() => { setResult(null); setAttempt((value) => value + 1); }}>
                  Retry preview
                </Button>
              )}
            </div>
          )}
        </div>
        {previewUrl && children && <div className="mt-4">{children}</div>}
      </div>
    </Modal>
  );
}
