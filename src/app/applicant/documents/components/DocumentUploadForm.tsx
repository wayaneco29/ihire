"use client";

import { useRef, useState, useTransition } from "react";
import { yupResolver } from "@hookform/resolvers/yup";
import type { UploadFile } from "antd";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { FormInput } from "@/components/form/FormInput";
import { FormSelect } from "@/components/form/FormSelect";
import { FormUpload } from "@/components/form/FormUpload";
import type { DocumentOcrResult } from "../ocr";
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
  isTranscript = false,
  educationEntries = [],
  educationEntriesUnavailable = false,
}: {
  documentTypeId: string;
  isTrainingCertificate: boolean;
  isTranscript?: boolean;
  onCancel: () => void;
  onSuccess?: (message: string) => void;
  trainingEntries: TrainingEntry[];
  trainingEntriesUnavailable: boolean;
  educationEntries?: {
    id: string;
    level: string;
    schoolName: string | null;
    degreeCourse: string | null;
  }[];
  educationEntriesUnavailable?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [uploadSucceeded, setUploadSucceeded] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [ocrResult, setOcrResult] = useState<DocumentOcrResult | null>(null);
  const [ocrProgress, setOcrProgress] = useState<number | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const ocrRequestId = useRef(0);
  const hasMetrics = isTrainingCertificate || isTranscript;
  const form = useForm<DocumentUploadValues>({
    resolver: yupResolver(documentUploadSchema),
    defaultValues: {
      files: [],
      trainingHours: null,
      totalUnits: null,
      pdsLearningDevelopmentId: "",
      pdsEducationId: "",
    },
  });

  function onSelectedFileChange(file: File | undefined) {
    const requestId = ++ocrRequestId.current;
    setSelectedFile(file ?? null);
    setOcrResult(null);
    setOcrProgress(null);
    setOcrError(null);
    form.setValue("trainingHours", null);
    form.setValue("totalUnits", null);
    if (
      file &&
      hasMetrics &&
      (file.type.startsWith("image/") ||
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf"))
    ) {
      void runOcr(file, requestId);
    }
  }

  async function runOcr(file: File, requestId: number) {
    setOcrError(null);
    setOcrProgress(0);
    try {
      const { readDocumentValues } = await import("../ocr");
      const result = await readDocumentValues(file, (progress) => {
        if (requestId === ocrRequestId.current) setOcrProgress(progress);
      });
      if (requestId !== ocrRequestId.current) return;
      setOcrResult(result);
      setOcrProgress(null);
      if (
        isTrainingCertificate &&
        result.trainingHours != null &&
        form.getValues("trainingHours") == null
      ) {
        form.setValue("trainingHours", result.trainingHours, {
          shouldValidate: true,
        });
      }
      if (
        isTranscript &&
        result.totalUnits != null &&
        form.getValues("totalUnits") == null
      ) {
        form.setValue("totalUnits", result.totalUnits, {
          shouldValidate: true,
        });
      }
    } catch (error) {
      if (requestId !== ocrRequestId.current) return;
      setOcrError(
        error instanceof Error
          ? error.message
          : "OCR could not read this file. Enter the value manually.",
      );
      setOcrProgress(null);
    }
  }

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
    if (isTranscript && values.totalUnits == null) {
      form.setError("totalUnits", {
        message: "Enter the total units shown on the transcript.",
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
    if (isTranscript) {
      formData.set("total_units", String(values.totalUnits));
      formData.set("pds_education_id", values.pdsEducationId ?? "");
    }
    if (ocrResult) {
      formData.set("ocr_confidence", String(ocrResult.confidence));
      if (ocrResult.trainingHours != null) {
        formData.set("ocr_training_hours", String(ocrResult.trainingHours));
      }
      if (ocrResult.totalUnits != null) {
        formData.set("ocr_total_units", String(ocrResult.totalUnits));
      }
    }
    startTransition(async () => {
      const result = await uploadApplicantDocument(formData);
      if (!result.success) {
        setMessage(result.message);
        return;
      }
      ocrRequestId.current += 1;
      setUploadSucceeded(true);
      form.reset({
        files: [] as UploadFile[],
        trainingHours: null,
        totalUnits: null,
        pdsLearningDevelopmentId: "",
        pdsEducationId: "",
      });
      setSelectedFile(null);
      setOcrResult(null);
      setOcrProgress(null);
      const successMessage = isTrainingCertificate
        ? `Certificate uploaded with ${values.trainingHours} hours and sent for review. Add another certificate or close this form.`
        : isTranscript
          ? `Transcript uploaded with ${values.totalUnits} units and sent for review.`
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
        onFileChange={onSelectedFileChange}
      />
      {hasMetrics && (
        <div className="mt-3 rounded-sm border border-line-subtle bg-panel p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-ink">Read values from file</p>
              <p className="mt-0.5 text-xs text-muted">
                Supported PDFs and images are read automatically in your
                browser. Review and correct every value before uploading.
              </p>
            </div>
          </div>
          {ocrProgress !== null && (
            <p className="mt-2 text-xs text-muted" role="status">
              Reading document automatically: {ocrProgress}% complete. This
              may take a little while.
            </p>
          )}
          {ocrError && (
            <p className="mt-2 text-xs text-danger" role="alert">
              {ocrError} You can still enter the value manually.
              {selectedFile && (
                <button
                  className="ml-1 font-semibold underline"
                  onClick={() => {
                    const requestId = ++ocrRequestId.current;
                    void runOcr(selectedFile, requestId);
                  }}
                  type="button"
                >
                  Try OCR again
                </button>
              )}
            </p>
          )}
          {ocrResult && (
            <p className="mt-2 text-xs text-muted" role="status">
              OCR confidence {ocrResult.confidence}%. Suggested{" "}
              {isTrainingCertificate
                ? `${ocrResult.trainingHours ?? "no"} hours`
                : `${ocrResult.totalUnits ?? "no"} units`}
              . Verify the document and correct the field below.
            </p>
          )}
        </div>
      )}
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
      {isTranscript && (
        <div className="mt-3 grid gap-x-4 sm:grid-cols-2">
          <div>
            <FormInput
              control={form.control}
              hint="Total units shown on the transcript. Decimals allowed."
              placeholder="e.g. 120"
              label="Total units"
              min={0}
              name="totalUnits"
              required
              step="0.01"
              type="number"
            />
          </div>
          <div>
            <FormSelect
              control={form.control}
              hint="Link the transcript to an education entry in your submitted PDS."
              label="Matching PDS education (optional)"
              name="pdsEducationId"
              options={[
                {
                  label: "Not listed in my PDS",
                  value: "",
                },
                ...educationEntries.map((entry) => ({
                  label: [
                    entry.degreeCourse || entry.level,
                    entry.schoolName,
                  ]
                    .filter(Boolean)
                    .join(" · "),
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
      {educationEntriesUnavailable && isTranscript && (
        <p className="mb-3 text-sm text-danger" role="alert">
          Your PDS education entries could not be loaded. You can still upload
          the transcript without linking it.
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
