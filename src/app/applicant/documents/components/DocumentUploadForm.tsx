"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { yupResolver } from "@hookform/resolvers/yup";
import type { UploadFile } from "antd";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { FormInput } from "@/components/form/FormInput";
import { FormDatePicker } from "@/components/form/FormDatePicker";
import { FormSelect } from "@/components/form/FormSelect";
import { FormUpload } from "@/components/form/FormUpload";
import { EDUCATION_LEVEL_OPTIONS } from "@/constants/pds-options";
import type { DocumentOcrResult } from "../ocr";
import { documentUploadSchema, type DocumentUploadValues } from "../schema";
import { uploadApplicantDocument } from "../actions";

const ACCEPTED_FILES = ".pdf,.jpg,.jpeg,.png,.doc,.docx";

type TrainingEntry = {
  id: string;
  title: string;
  hours: number | null;
  sort_order: number;
};
type ReplacementDocument = {
  id: string;
  certificate_title: string | null;
  certificate_type: string | null;
  certificate_issuer: string | null;
  certificate_date: string | null;
  training_hours: number | null;
  pds_learning_development_id: string | null;
};

export function DocumentUploadForm({
  documentTypeId,
  isTrainingCertificate,
  onCancel,
  onSuccess,
  trainingEntries,
  trainingEntriesUnavailable,
  onProcessingChange,
  isTranscript = false,
  replacementDocument = null,
  educationEntries = [],
  educationEntriesUnavailable = false,
}: {
  documentTypeId: string;
  isTrainingCertificate: boolean;
  isTranscript?: boolean;
  replacementDocument?: ReplacementDocument | null;
  onCancel: () => void;
  onSuccess?: (message: string) => void;
  onProcessingChange?: (processing: boolean) => void;
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
  const [processingFile, setProcessingFile] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const ocrRequestId = useRef(0);
  const hasMetrics = isTrainingCertificate || isTranscript;
  const busy = pending || processingFile;
  const form = useForm<DocumentUploadValues>({
    resolver: yupResolver(
      documentUploadSchema(isTrainingCertificate, isTranscript),
    ),
    defaultValues: {
      files: [],
      certificateTitle: replacementDocument?.certificate_title ?? "",
      trainingHours: replacementDocument?.training_hours ?? null,
      certificateType: replacementDocument?.certificate_type ?? "",
      certificateIssuer: replacementDocument?.certificate_issuer ?? "",
      certificateDate: replacementDocument?.certificate_date ?? null,
      totalUnits: null,
      pdsLearningDevelopmentId: trainingEntries.some(
        (entry) =>
          entry.id === replacementDocument?.pds_learning_development_id,
      )
        ? (replacementDocument?.pds_learning_development_id ?? "")
        : "",
      pdsEducationId: "",
      currentHighestEducationLevel: "",
    },
  });

  useEffect(() => {
    onProcessingChange?.(busy);
  }, [busy, onProcessingChange]);

  useEffect(
    () => () => {
      onProcessingChange?.(false);
    },
    [onProcessingChange],
  );

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  function onSelectedFileChange(file: File | undefined) {
    const requestId = ++ocrRequestId.current;
    setSelectedFile(file ?? null);
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
    setOcrResult(null);
    setOcrProgress(null);
    setOcrError(null);
    if (!replacementDocument) {
      form.setValue("certificateTitle", "");
      form.setValue("trainingHours", null);
      form.setValue("certificateType", "");
      form.setValue("certificateIssuer", "");
      form.setValue("certificateDate", null);
      form.setValue("totalUnits", null);
    }
    const canReadInBrowser =
      file &&
      hasMetrics &&
      (file.type.startsWith("image/") ||
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf"));
    if (canReadInBrowser) {
      void processSelectedFile(file, requestId);
    } else {
      setProcessingFile(false);
    }
  }

  async function processSelectedFile(file: File, requestId: number) {
    setProcessingFile(true);
    try {
      await runOcr(file, requestId);
    } finally {
      if (requestId === ocrRequestId.current) {
        setProcessingFile(false);
        setOcrProgress(null);
      }
    }
  }

  async function runOcr(
    file: File,
    requestId: number,
  ): Promise<DocumentOcrResult | null> {
    setOcrError(null);
    setOcrProgress(0);
    try {
      const { readDocumentValues } = await import("../ocr");
      const result = await readDocumentValues(file, (progress) => {
        if (requestId === ocrRequestId.current) setOcrProgress(progress);
      });
      if (requestId !== ocrRequestId.current) return null;
      setOcrResult(result);
      if (isTrainingCertificate) {
        const { certificate } = result;
        if (certificate.type !== "Unknown") {
          form.setValue("certificateType", certificate.type, {
            shouldValidate: true,
          });
        }
        if (certificate.issuer) {
          form.setValue("certificateIssuer", certificate.issuer, {
            shouldValidate: true,
          });
        }
        if (certificate.date) {
          form.setValue("certificateDate", certificate.date, {
            shouldValidate: true,
          });
        }
        if (certificate.activity && !form.getValues("certificateTitle")) {
          form.setValue("certificateTitle", certificate.activity, {
            shouldValidate: true,
          });
        }
        if (certificate.hours != null) {
          form.setValue("trainingHours", certificate.hours, {
            shouldValidate: true,
          });
        } else if (result.trainingHours != null) {
          form.setValue("trainingHours", result.trainingHours, {
            shouldValidate: true,
          });
        }
      } else if (
        isTranscript &&
        result.totalUnits != null &&
        form.getValues("totalUnits") == null
      ) {
        form.setValue("totalUnits", result.totalUnits, {
          shouldValidate: true,
        });
      }
      return result;
    } catch (error) {
      if (requestId !== ocrRequestId.current) return null;
      setOcrError(
        error instanceof Error
          ? error.message
          : "OCR could not read this file. Enter the value manually.",
      );
      return null;
    }
  }

  function submit(values: DocumentUploadValues) {
    if (busy) return;
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
    if (replacementDocument) {
      formData.set("replaces_document_id", replacementDocument.id);
    }
    if (isTrainingCertificate) {
      formData.set("certificate_title", values.certificateTitle ?? "");
      formData.set("training_hours", String(values.trainingHours));
      formData.set("certificate_type", values.certificateType ?? "");
      formData.set("certificate_issuer", values.certificateIssuer ?? "");
      formData.set("certificate_date", values.certificateDate ?? "");
      formData.set(
        "pds_learning_development_id",
        values.pdsLearningDevelopmentId ?? "",
      );
    }
    if (isTranscript) {
      formData.set("total_units", String(values.totalUnits));
      formData.set("pds_education_id", values.pdsEducationId ?? "");
      formData.set(
        "current_highest_education_level",
        values.currentHighestEducationLevel ?? "",
      );
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
        certificateTitle: "",
        trainingHours: null,
        certificateType: "",
        certificateIssuer: "",
        certificateDate: null,
        totalUnits: null,
        pdsLearningDevelopmentId: "",
        pdsEducationId: "",
        currentHighestEducationLevel: "",
      });
      setSelectedFile(null);
      setPreviewUrl(null);
      setOcrResult(null);
      setOcrProgress(null);
      const pdsSyncMessage = result.pdsSynced
        ? " The linked PDS training entry was updated in your draft. Submit the updated PDS when ready."
        : "";
      const uploadSuccessMessage = replacementDocument
        ? `Certificate file updated. The new version with ${values.trainingHours} hours has been sent for review.`
        : isTrainingCertificate
          ? `Certificate uploaded with ${values.trainingHours} hours and sent for review. Add another certificate or close this form.`
          : isTranscript
            ? `Transcript uploaded with ${values.totalUnits} units and your current highest educational attainment recorded. It has been sent for review.`
            : `Version ${result.version} uploaded and sent for review.`;
      const successMessage = `${uploadSuccessMessage}${pdsSyncMessage}`;
      if (onSuccess) onSuccess(successMessage);
      else setMessage(successMessage);
      router.refresh();
    });
  }

  return (
    <form
      className="border-t border-line-subtle bg-panel-muted/60 px-4 py-4 sm:px-5"
      aria-busy={busy}
      onSubmit={(event) => void form.handleSubmit(submit)(event)}
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
        disabled={busy}
        onFileChange={onSelectedFileChange}
        previewAlt={
          selectedFile ? `Preview of ${selectedFile.name}` : undefined
        }
        previewName={selectedFile?.name}
        previewUrl={selectedFile?.type.startsWith("image/") ? previewUrl : null}
      />
      {selectedFile &&
        previewUrl &&
        !selectedFile.type.startsWith("image/") && (
          <div className="mt-3 rounded-sm border border-line-subtle bg-panel p-3">
            <p className="mb-2 truncate text-sm font-medium text-ink">
              Preview: {selectedFile.name}
            </p>
            {selectedFile.type === "application/pdf" ||
            selectedFile.name.toLowerCase().endsWith(".pdf") ? (
              <iframe
                className={`h-80 w-full rounded-sm border-0 ${busy ? "pointer-events-none" : ""}`}
                src={previewUrl}
                title={`Preview of ${selectedFile.name}`}
              />
            ) : (
              <p className="text-sm text-muted">
                A preview is not available for this file type.
              </p>
            )}
          </div>
        )}
      {isTrainingCertificate && (
        <div className="mt-3">
          <FormInput
            control={form.control}
            disabled={busy}
            label="Certificate title"
            maxLength={200}
            name="certificateTitle"
            placeholder="e.g. First Aid and Basic Life Support"
            required
          />
        </div>
      )}
      {isTrainingCertificate && (
        <div className="mt-3 grid gap-x-4 sm:grid-cols-2">
          <FormInput
            control={form.control}
            disabled={busy}
            label="Certificate type"
            maxLength={200}
            name="certificateType"
            placeholder="e.g. Certificate of Participation"
          />
          <FormInput
            control={form.control}
            disabled={busy}
            label="Issuer"
            maxLength={500}
            name="certificateIssuer"
            placeholder="Organization that issued the certificate"
          />
          <FormDatePicker
            control={form.control}
            disabled={busy}
            format="MMMM D, YYYY"
            label="Certificate date"
            name="certificateDate"
            valueFormat="YYYY-MM-DD"
          />
          <div>
            <FormInput
              control={form.control}
              disabled={busy}
              placeholder="e.g. 8"
              label="Certificate hours"
              min={0}
              name="trainingHours"
              required
              step="0.01"
              type="number"
            />
          </div>
        </div>
      )}
      {isTranscript && (
        <div className="mt-3 grid gap-x-4 sm:grid-cols-2">
          <FormSelect
            control={form.control}
            disabled={busy}
            hint="Choose the highest education level you have attained, using the same levels as your PDS."
            label="Current highest educational attainment"
            name="currentHighestEducationLevel"
            options={[...EDUCATION_LEVEL_OPTIONS]}
            placeholder="Choose education level"
            required
          />
          <div>
            <FormInput
              control={form.control}
              disabled={busy}
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
              disabled={busy}
              hint="Link the transcript to an education entry in your submitted PDS."
              label="Matching PDS education (optional)"
              name="pdsEducationId"
              options={[
                {
                  label: "Not listed in my PDS",
                  value: "",
                },
                ...educationEntries.map((entry) => ({
                  label: [entry.degreeCourse || entry.level, entry.schoolName]
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
          className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-sm bg-primary px-4 text-sm font-semibold text-on-primary transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
          disabled={
            busy || (isTrainingCertificate && trainingEntriesUnavailable)
          }
          type="submit"
        >
          {pending
            ? "Uploading…"
            : isTrainingCertificate
              ? replacementDocument
                ? "Update certificate file"
                : "Upload certificate"
              : "Upload document"}
        </button>
        <button
          className="inline-flex min-h-11 cursor-pointer items-center rounded-sm px-3 text-sm font-medium text-muted hover:bg-panel"
          disabled={busy}
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
