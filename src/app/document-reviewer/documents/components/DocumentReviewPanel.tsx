"use client";

import { useState, useTransition } from "react";
import { yupResolver } from "@hookform/resolvers/yup";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import {
  TRAINING_CERTIFICATE_DOCUMENT_TYPE,
  TRANSCRIPT_DOCUMENT_TYPE,
} from "@/constants/documents";
import { EDUCATION_LEVEL_OPTIONS } from "@/constants/pds-options";
import { FormInput } from "@/components/form/FormInput";
import { FormSelect } from "@/components/form/FormSelect";
import { FormTextArea } from "@/components/form/FormTextArea";
import { Button } from "@/components/ui/Button";
import { WorkflowStatusTag } from "@/components/ui/WorkflowStatusTag";
import { createClient } from "@/lib/supabase/client";
import { submitDocumentReview } from "../../actions";
import {
  createDocumentReviewSchema,
  type DocumentReviewValues,
} from "@/app/document-reviewer/documents/schema";

const reviewOptions = [
  { label: "Verified", value: "VERIFIED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "Request resubmission", value: "FOR_RESUBMISSION" },
];

export function DocumentReviewPanel({
  documentId,
  storageKey,
  documentStatus,
  documentType,
  trainingHours,
  totalUnits,
  currentHighestEducationLevel,
  ocrTrainingHours,
  ocrTotalUnits,
  ocrConfidence,
  previousReview,
  stayOnPageOnSuccess = false,
  hideFileButton = false,
  onReviewSuccess,
}: {
  documentId: string;
  storageKey: string;
  documentStatus: string;
  documentType: string;
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
  stayOnPageOnSuccess?: boolean;
  hideFileButton?: boolean;
  onReviewSuccess?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [viewing, setViewing] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [reviewSucceeded, setReviewSucceeded] = useState(false);
  const includesTrainingHours =
    documentType === TRAINING_CERTIFICATE_DOCUMENT_TYPE;
  const includesTotalUnits = documentType === TRANSCRIPT_DOCUMENT_TYPE;
  const form = useForm<DocumentReviewValues>({
    resolver: yupResolver(
      createDocumentReviewSchema(includesTrainingHours, includesTotalUnits),
    ),
    defaultValues: {
      status: "VERIFIED",
      remarks: "",
      confirmedTrainingHours:
        previousReview?.confirmed_training_hours ??
        trainingHours ??
        ocrTrainingHours,
      confirmedTotalUnits:
        previousReview?.confirmed_total_units ?? totalUnits ?? ocrTotalUnits,
    },
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
    setReviewSucceeded(false);
    startTransition(async () => {
      const result = await submitDocumentReview({
        documentId,
        status: values.status,
        remarks: values.remarks,
        confirmedTrainingHours: values.confirmedTrainingHours ?? null,
        confirmedTotalUnits: values.confirmedTotalUnits ?? null,
      });
      setMessage(result.message);
      setReviewSucceeded(result.success);
      if (result.success) {
        onReviewSuccess?.();
        if (stayOnPageOnSuccess) router.refresh();
        else router.push("/document-reviewer/documents");
      }
    });
  }

  return (
    <section className="rounded-sm border border-line bg-panel p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold text-ink">Document review</h2>
        <WorkflowStatusTag status={documentStatus} />
      </div>
      <p className="mt-2 text-sm leading-6 text-muted">
        The stored object uses an opaque key. The applicant’s original filename
        is not shown here.
      </p>
      {!hideFileButton && (
        <>
          <Button
            className="mt-4 !rounded-sm !px-4 !text-sm"
            disabled={viewing || pending}
            onClick={viewFile}
            type="button"
            variant="bordered"
          >
            {viewing ? "Creating secure link…" : "Open document"}
          </Button>
          {fileError && (
            <p className="mt-2 text-sm text-danger" role="alert">
              {fileError}
            </p>
          )}
        </>
      )}

      {previousReview && (
        <div className="mt-5 rounded-sm bg-panel-muted p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-ink">Your latest review</p>
            <WorkflowStatusTag status={previousReview.status} />
          </div>
          {previousReview.remarks && (
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">
              {previousReview.remarks}
            </p>
          )}
          {(previousReview.confirmed_training_hours != null ||
            previousReview.confirmed_total_units != null) && (
            <p className="mt-2 text-sm text-muted">
              Confirmed value:{" "}
              {previousReview.confirmed_training_hours != null
                ? `${previousReview.confirmed_training_hours} hours`
                : `${previousReview.confirmed_total_units} units`}
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
          {(includesTrainingHours || includesTotalUnits) && (
            <div className="rounded-sm border border-line-subtle bg-panel-muted p-3">
              <p className="text-sm font-medium text-ink">
                Reviewer-confirmed value
              </p>
              <p className="mt-1 text-xs leading-5 text-muted">
                {includesTrainingHours
                  ? `Applicant entered ${trainingHours ?? "no"} hours.`
                  : `Applicant entered ${totalUnits ?? "no"} units.`}
                {includesTotalUnits &&
                  currentHighestEducationLevel &&
                  ` Applicant indicated ${EDUCATION_LEVEL_OPTIONS.find(({ value }) => value === currentHighestEducationLevel)?.label ?? currentHighestEducationLevel} as their current highest educational attainment.`}
                {(ocrConfidence != null ||
                  ocrTrainingHours != null ||
                  ocrTotalUnits != null) &&
                  ` OCR suggested ${includesTrainingHours ? ocrTrainingHours ?? "no value" : ocrTotalUnits ?? "no value"} with ${ocrConfidence ?? 0}% confidence.`}{" "}
                Check the source document and confirm or correct the value.
              </p>
              {includesTrainingHours && (
                <FormInput
                  control={form.control}
                  label="Confirmed training hours"
                  min={0}
                  name="confirmedTrainingHours"
                  required
                  step="0.01"
                  type="number"
                />
              )}
              {includesTotalUnits && (
                <FormInput
                  control={form.control}
                  label="Confirmed transcript units"
                  min={0}
                  name="confirmedTotalUnits"
                  required
                  step="0.01"
                  type="number"
                />
              )}
            </div>
          )}
          <FormTextArea
            control={form.control}
            label="Remarks for the applicant"
            maxLength={2000}
            name="remarks"
            placeholder="Explain any issue and the information or document they should provide."
            rows={4}
            showCount
          />
          <Button
            disabled={pending}
            type="submit"
            variant="filled"
          >
            {pending ? "Saving review…" : "Save review"}
          </Button>
          {message && (
            <p
              className={`text-sm ${reviewSucceeded ? "text-primary" : "text-danger"}`}
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
