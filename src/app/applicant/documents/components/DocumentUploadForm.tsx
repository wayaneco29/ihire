"use client";

import { useState, useTransition } from "react";
import { yupResolver } from "@hookform/resolvers/yup";
import type { UploadFile } from "antd";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { FormInput } from "@/components/form/FormInput";
import { FormSelect } from "@/components/form/FormSelect";
import { FormUpload } from "@/components/form/FormUpload";
import { documentUploadSchema, type DocumentUploadValues } from "../schema";
import { uploadApplicantDocument } from "../actions";

const ACCEPTED_FILES = ".pdf,.jpg,.jpeg,.png,.doc,.docx";

type TrainingEntry = { id: string; title: string; hours: number | null };

export function DocumentUploadForm({
  documentTypeId,
  isTrainingCertificate,
  onCancel,
  onSuccess,
  trainingEntries,
  trainingEntriesUnavailable,
}: {
  documentTypeId: string;
  isTrainingCertificate: boolean;
  onCancel: () => void;
  onSuccess?: (message: string) => void;
  trainingEntries: TrainingEntry[];
  trainingEntriesUnavailable: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [uploadSucceeded, setUploadSucceeded] = useState(false);
  const form = useForm<DocumentUploadValues>({
    resolver: yupResolver(documentUploadSchema),
    defaultValues: {
      files: [],
      trainingHours: null,
      pdsLearningDevelopmentId: "",
    },
  });

  function submit(values: DocumentUploadValues) {
    setMessage(null);
    setUploadSucceeded(false);
    const uploadFile = values.files[0]?.originFileObj as File | undefined;
    if (!uploadFile) {
      setMessage("Choose a document file.");
      return;
    }
    if (isTrainingCertificate && values.trainingHours == null) {
      form.setError("trainingHours", {
        message: "Enter the hours rendered on the certificate.",
      });
      return;
    }

    const formData = new FormData();
    formData.set("document_type_id", documentTypeId);
    formData.set("file", uploadFile);
    if (isTrainingCertificate) {
      formData.set("training_hours", String(values.trainingHours));
      formData.set(
        "pds_learning_development_id",
        values.pdsLearningDevelopmentId ?? "",
      );
    }
    startTransition(async () => {
      const result = await uploadApplicantDocument(formData);
      if (!result.success) {
        setMessage(result.message);
        return;
      }
      setUploadSucceeded(true);
      form.reset({
        files: [] as UploadFile[],
        trainingHours: null,
        pdsLearningDevelopmentId: "",
      });
      const successMessage = isTrainingCertificate
        ? `Certificate uploaded with ${values.trainingHours} hours and sent for review. Add another certificate or close this form.`
        : `Version ${result.version} uploaded and sent for review.`;
      if (onSuccess) onSuccess(successMessage);
      else setMessage(successMessage);
      router.refresh();
    });
  }

  return (
    <form
      className="border-t border-line-subtle bg-panel-muted/60 px-4 py-4 sm:px-5"
      onSubmit={form.handleSubmit(submit)}
    >
      {message && (
        <p
          className={`mb-3 text-sm ${uploadSucceeded ? "text-primary" : "text-danger"}`}
          role="status"
        >
          {message}
        </p>
      )}
      <FormUpload
        accept={ACCEPTED_FILES}
        control={form.control}
        drag
        hint={
          isTrainingCertificate
            ? "Select one certificate per upload so each entry has its own hours."
            : "PDF, JPG, PNG, DOC, or DOCX · up to 50 MB"
        }
        label={isTrainingCertificate ? "Certificate file" : "Document file"}
        maxCount={1}
        name="files"
      />
      {isTrainingCertificate && (
        <div className="mt-3 grid gap-x-4 sm:grid-cols-2">
          <div>
            <FormInput
              control={form.control}
              hint="Hours shown on the certificate. Decimals allowed."
              placeholder="e.g. 8"
              label="Hours rendered"
              min={0}
              name="trainingHours"
              required
              step="0.01"
              type="number"
            />
          </div>
          <div>
            <FormSelect
              control={form.control}
              hint="Linking prevents the same PDS training from being counted twice."
              label="Matching PDS training (optional)"
              name="pdsLearningDevelopmentId"
              options={[
                {
                  label: "Not listed in my PDS; count as separate training",
                  value: "",
                },
                ...trainingEntries.map((entry) => ({
                  label: `${entry.title} (${entry.hours ?? 0} PDS hours)`,
                  value: entry.id,
                })),
              ]}
            />
          </div>
        </div>
      )}
      {trainingEntriesUnavailable && isTrainingCertificate && (
        <p className="mb-3 text-sm text-danger" role="alert">
          Your PDS training entries could not be loaded. Refresh before
          uploading this certificate.
        </p>
      )}
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <button
          className="inline-flex min-h-11 items-center justify-center rounded-sm bg-primary px-4 text-sm font-semibold text-on-primary transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
          disabled={
            pending || (isTrainingCertificate && trainingEntriesUnavailable)
          }
          type="submit"
        >
          {pending
            ? "Uploading…"
            : isTrainingCertificate
              ? "Upload certificate"
              : "Upload document"}
        </button>
        <button
          className="inline-flex min-h-11 items-center rounded-sm px-3 text-sm font-medium text-muted hover:bg-panel"
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
