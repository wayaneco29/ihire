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
  trainingEntries,
  trainingEntriesUnavailable,
}: {
  documentTypeId: string;
  isTrainingCertificate: boolean;
  trainingEntries: TrainingEntry[];
  trainingEntriesUnavailable: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const form = useForm<DocumentUploadValues>({
    resolver: yupResolver(documentUploadSchema),
    defaultValues: { files: [], trainingHours: null, pdsLearningDevelopmentId: "" },
  });

  function submit(values: DocumentUploadValues) {
    setMessage(null);
    const uploadFile = values.files[0]?.originFileObj as File | undefined;
    if (!uploadFile) {
      setMessage("Choose a document file.");
      return;
    }
    if (isTrainingCertificate && values.trainingHours == null) {
      form.setError("trainingHours", { message: "Enter the hours rendered on the certificate." });
      return;
    }

    const formData = new FormData();
    formData.set("document_type_id", documentTypeId);
    formData.set("file", uploadFile);
    if (isTrainingCertificate) {
      formData.set("training_hours", String(values.trainingHours));
      formData.set("pds_learning_development_id", values.pdsLearningDevelopmentId ?? "");
    }
    startTransition(async () => {
      const result = await uploadApplicantDocument(formData);
      if (!result.success) {
        setMessage(result.message);
        return;
      }
      form.reset({ files: [] as UploadFile[], trainingHours: null, pdsLearningDevelopmentId: "" });
      setMessage(
        isTrainingCertificate
          ? `Certificate uploaded with ${values.trainingHours} hours and sent for review.`
          : `Version ${result.version} uploaded and sent for review.`,
      );
      router.refresh();
    });
  }

  return (
    <form className="mt-4 border-t border-line-subtle pt-4" onSubmit={form.handleSubmit(submit)}>
      <FormUpload
        accept={ACCEPTED_FILES}
        control={form.control}
        hint="PDF, JPG, PNG, DOC, or DOCX · 50 MB maximum"
        label="Choose a file"
        maxCount={1}
        name="files"
      />
      {isTrainingCertificate && (
        <>
          <div className="mt-4">
            <FormInput
              control={form.control}
              hint="Enter the hours shown on the certificate. Decimals are allowed."
              label="Hours rendered"
              min={0}
              name="trainingHours"
              required
              step="0.01"
              type="number"
            />
          </div>
          <div className="mt-4">
            <FormSelect
              control={form.control}
              hint="Link this certificate to the matching PDS entry to avoid counting the training twice."
              label="Matching PDS training (optional)"
              name="pdsLearningDevelopmentId"
              options={[
                { label: "Not listed in my PDS; count as separate training", value: "" },
                ...trainingEntries.map((entry) => ({
                  label: `${entry.title} (${entry.hours ?? 0} PDS hours)`,
                  value: entry.id,
                })),
              ]}
            />
          </div>
          {trainingEntriesUnavailable && (
            <p className="mt-3 text-sm text-danger" role="alert">
              Your PDS training entries could not be loaded. Refresh before uploading this certificate.
            </p>
          )}
        </>
      )}
      <button
        className="mt-3 inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
        disabled={pending || (isTrainingCertificate && trainingEntriesUnavailable)}
        type="submit"
      >
        {pending ? "Uploading…" : "Upload document"}
      </button>
      {message && <p className="mt-3 text-sm text-muted" role="status">{message}</p>}
    </form>
  );
}
