"use client";

import { useState, useTransition } from "react";
import { yupResolver } from "@hookform/resolvers/yup";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { FormSelect } from "@/components/form/FormSelect";
import { FormTextArea } from "@/components/form/FormTextArea";
import { WorkflowStatusTag } from "@/components/ui/WorkflowStatusTag";
import { createClient } from "@/lib/supabase/client";
import { submitDocumentReview } from "../actions";
import { documentReviewSchema, type DocumentReviewValues } from "../schema";

const reviewOptions = [
  { label: "Verified", value: "VERIFIED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "Request resubmission", value: "FOR_RESUBMISSION" },
];

export function DocumentReviewPanel({
  applicationId,
  documentId,
  storageKey,
  documentStatus,
  previousReview,
}: {
  applicationId: string;
  documentId: string;
  storageKey: string;
  documentStatus: string;
  previousReview: {
    status: string;
    remarks: string | null;
    reviewed_at: string;
  } | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [viewing, setViewing] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const form = useForm<DocumentReviewValues>({
    resolver: yupResolver(documentReviewSchema),
    defaultValues: { status: "VERIFIED", remarks: "" },
  });

  function viewFile() {
    setFileError(null);
    setViewing(true);
    const preview = window.open("about:blank", "_blank");
    if (preview) preview.opener = null;
    startTransition(async () => {
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from("applicant-documents")
        .createSignedUrl(storageKey, 60);
      setViewing(false);
      if (error || !data?.signedUrl) {
        preview?.close();
        setFileError("A secure link could not be created. Please try again.");
        return;
      }
      if (preview) preview.location.replace(data.signedUrl);
      else
        setFileError(
          "Your browser blocked the file window. Allow pop-ups and try again.",
        );
    });
  }

  function submitReview(values: DocumentReviewValues) {
    setMessage(null);
    startTransition(async () => {
      const result = await submitDocumentReview({
        applicationId,
        documentId,
        status: values.status,
        remarks: values.remarks,
      });
      setMessage(result.message);
      if (result.success) router.refresh();
    });
  }

  return (
    <section className="rounded-2xl border border-line bg-panel p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold text-ink">Document review</h2>
        <WorkflowStatusTag status={documentStatus} />
      </div>
      <p className="mt-2 text-sm leading-6 text-muted">
        The stored object uses an opaque key. The applicant’s original filename
        is not shown here.
      </p>
      <button
        className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg border border-primary px-4 text-sm font-semibold text-primary transition hover:bg-primary-light disabled:opacity-60"
        disabled={viewing || pending}
        onClick={viewFile}
        type="button"
      >
        {viewing ? "Creating secure link…" : "Open document"}
      </button>
      {fileError && (
        <p className="mt-2 text-sm text-danger" role="alert">
          {fileError}
        </p>
      )}

      {previousReview && (
        <div className="mt-5 rounded-md bg-panel-muted p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-ink">Your latest review</p>
            <WorkflowStatusTag status={previousReview.status} />
          </div>
          {previousReview.remarks && (
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">
              {previousReview.remarks}
            </p>
          )}
        </div>
      )}

      {documentStatus === "FOR_REVIEW" ? (
        <form
          className="mt-5 space-y-4 border-t border-line-subtle pt-5"
          onSubmit={form.handleSubmit(submitReview)}
        >
          <FormSelect
            control={form.control}
            label="Review result"
            name="status"
            options={reviewOptions}
            required
          />
          <FormTextArea
            control={form.control}
            label="Remarks for the applicant"
            maxLength={2000}
            name="remarks"
            placeholder="Explain any issue and the information or document they should provide."
            rows={4}
            showCount
          />
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
            disabled={pending}
            type="submit"
          >
            {pending ? "Saving review…" : "Save review"}
          </button>
          {message && (
            <p
              className={`text-sm ${message === "Document review saved." ? "text-primary" : "text-danger"}`}
              role="status"
            >
              {message}
            </p>
          )}
        </form>
      ) : (
        <p className="mt-5 border-t border-line-subtle pt-4 text-sm text-muted">
          This document is not currently waiting for review.
        </p>
      )}
    </section>
  );
}
