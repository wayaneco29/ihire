"use server";

import { revalidatePath } from "next/cache";
import {
  TRAINING_CERTIFICATE_DOCUMENT_TYPE,
  TRANSCRIPT_DOCUMENT_TYPE,
} from "@/constants/documents";
import { getApplicantContext } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export type DocumentUploadResult =
  | { success: true; version: number }
  | { success: false; message: string };

function parseMetric(
  raw: FormDataEntryValue | null,
  max: number,
  label: string,
  required: boolean,
): { value: number | null; error: string | null } {
  const parsed = typeof raw === "string" && raw.trim() !== ""
    ? Number(raw)
    : Number.NaN;
  if (!Number.isFinite(parsed)) {
    return required
      ? { value: null, error: `Enter ${label}.` }
      : { value: null, error: null };
  }
  if (
    parsed < 0 ||
    parsed > max ||
    Math.abs(parsed * 100 - Math.round(parsed * 100)) >= 1e-8
  ) {
    return {
      value: null,
      error: `Enter ${label} from 0 to ${max.toLocaleString()}, using at most two decimals.`,
    };
  }
  return { value: parsed, error: null };
}

export async function uploadApplicantDocument(formData: FormData): Promise<DocumentUploadResult> {
  const applicant = await getApplicantContext();
  if (!applicant) {
    return { success: false, message: "Sign in as an applicant to upload documents." };
  }

  const documentTypeId = formData.get("document_type_id");
  const file = formData.get("file");
  if (typeof documentTypeId !== "string" || !/^[0-9a-f-]{36}$/i.test(documentTypeId)) {
    return { success: false, message: "Choose a valid document type." };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, message: "Choose a file to upload." };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { success: false, message: "Files must be 50 MB or smaller." };
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return { success: false, message: "Use a PDF, JPG, PNG, DOC, or DOCX file." };
  }

  const [{ data: documentType, error: typeError }, { data: latest, error: versionError }] =
    await Promise.all([
      applicant.supabase
        .from("document_types")
        .select("id, name")
        .eq("id", documentTypeId)
        .maybeSingle(),
      applicant.supabase
        .from("documents")
        .select("version")
        .eq("applicant_id", applicant.applicant.id)
        .eq("document_type_id", documentTypeId)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  if (typeError) {
    return { success: false, message: "We could not verify the document type. Refresh and try again." };
  }
  if (!documentType) {
    return { success: false, message: "That document type is no longer available." };
  }
  if (versionError) {
    return { success: false, message: "We could not load the current document version. Refresh and try again." };
  }

  const isTrainingCertificate = documentType.name === TRAINING_CERTIFICATE_DOCUMENT_TYPE;
  const isTranscript = documentType.name === TRANSCRIPT_DOCUMENT_TYPE;
  const rawReplacementId = formData.get("replaces_document_id");
  let replacementDocumentId: string | null = null;
  if (rawReplacementId !== null) {
    if (
      !isTrainingCertificate ||
      typeof rawReplacementId !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(rawReplacementId)
    ) {
      return { success: false, message: "Choose a valid certificate to update." };
    }
    replacementDocumentId = rawReplacementId;
    const { data: existingDocument, error: existingDocumentError } =
      await applicant.supabase
        .from("documents")
        .select("id, document_type_id")
        .eq("id", replacementDocumentId)
        .eq("applicant_id", applicant.applicant.id)
        .maybeSingle();
    if (existingDocumentError) {
      return {
        success: false,
        message: "We could not verify this certificate. Refresh and try again.",
      };
    }
    if (
      !existingDocument ||
      existingDocument.document_type_id !== documentTypeId
    ) {
      return {
        success: false,
        message: "That certificate is no longer available to update.",
      };
    }
    const { data: existingReplacement, error: replacementError } =
      await applicant.supabase
        .from("documents")
        .select("id")
        .eq("replaces_document_id", replacementDocumentId)
        .limit(1)
        .maybeSingle();
    if (replacementError) {
      return {
        success: false,
        message: "We could not verify the current certificate version. Refresh and try again.",
      };
    }
    if (existingReplacement) {
      return {
        success: false,
        message: "This certificate already has a newer file. Refresh and update the latest version instead.",
      };
    }
  }
  const hasOcrInput = [
    "ocr_confidence",
    "ocr_training_hours",
    "ocr_total_units",
  ].some((key) => formData.has(key));
  const hasApplicantMetricInput = [
    "certificate_title",
    "training_hours",
    "pds_learning_development_id",
    "total_units",
    "pds_education_id",
  ].some((key) => formData.has(key));
  if (
    (isTrainingCertificate && (formData.has("total_units") || formData.has("pds_education_id") || formData.has("ocr_total_units"))) ||
    (isTranscript && (formData.has("certificate_title") || formData.has("training_hours") || formData.has("pds_learning_development_id") || formData.has("ocr_training_hours"))) ||
    (!isTrainingCertificate && !isTranscript && (hasApplicantMetricInput || hasOcrInput))
  ) {
    return { success: false, message: "Document values do not match this document type." };
  }

  const trainingResult = isTrainingCertificate
    ? parseMetric(formData.get("training_hours"), 999999.99, "certificate hours", true)
    : { value: null, error: null };
  const rawCertificateTitle = isTrainingCertificate
    ? formData.get("certificate_title")
    : null;
  const certificateTitle =
    typeof rawCertificateTitle === "string" ? rawCertificateTitle.trim() : "";
  if (
    isTrainingCertificate &&
    (!certificateTitle || certificateTitle.length > 200)
  ) {
    return {
      success: false,
      message: "Enter a certificate title of 200 characters or fewer.",
    };
  }
  const unitsResult = isTranscript
    ? parseMetric(formData.get("total_units"), 99999999.99, "total transcript units", true)
    : { value: null, error: null };
  if (trainingResult.error || unitsResult.error) {
    return {
      success: false,
      message: trainingResult.error ?? unitsResult.error ?? "Enter a valid document value.",
    };
  }

  let ocrTrainingHours: number | null = null;
  let ocrTotalUnits: number | null = null;
  let ocrConfidence: number | null = null;
  if (hasOcrInput) {
    const rawConfidence = formData.get("ocr_confidence");
    const confidenceResult = parseMetric(
      rawConfidence,
      100,
      "OCR confidence",
      true,
    );
    if (confidenceResult.error) {
      return { success: false, message: confidenceResult.error };
    }
    ocrConfidence = confidenceResult.value;
    if (isTrainingCertificate) {
      const result = parseMetric(
        formData.get("ocr_training_hours"),
        999999.99,
        "OCR training hours",
        false,
      );
      if (result.error) return { success: false, message: result.error };
      ocrTrainingHours = result.value;
    }
    if (isTranscript) {
      const result = parseMetric(
        formData.get("ocr_total_units"),
        99999999.99,
        "OCR transcript units",
        false,
      );
      if (result.error) return { success: false, message: result.error };
      ocrTotalUnits = result.value;
    }
  }

  const rawPdsEntryId = isTrainingCertificate
    ? (formData.get("pds_learning_development_id") ?? "")
    : isTranscript
      ? (formData.get("pds_education_id") ?? "")
      : null;
  let pdsLearningDevelopmentId: string | null = null;
  let pdsEducationId: string | null = null;
  if (isTrainingCertificate || isTranscript) {
    if (typeof rawPdsEntryId !== "string") {
      return {
        success: false,
        message: "Choose a valid PDS entry or leave it unlinked.",
      };
    }
    if (rawPdsEntryId !== "") {
      if (!/^[0-9a-f-]{36}$/i.test(rawPdsEntryId)) {
        return {
          success: false,
          message: "Choose a valid PDS entry or leave it unlinked.",
        };
      }

      const { data: submittedPds, error: pdsError } = await applicant.supabase
        .from("pds_versions")
        .select("id")
        .eq("applicant_id", applicant.applicant.id)
        .eq("status", "SUBMITTED")
        .order("version_no", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (pdsError) {
        return {
          success: false,
          message: "We could not verify your submitted PDS. Refresh and try again.",
        };
      }
      if (!submittedPds) {
        return {
          success: false,
          message: "Submit a PDS before linking this document to an entry.",
        };
      }

      if (isTrainingCertificate) {
        const { data: entry, error: entryError } = await applicant.supabase
          .from("pds_learning_development")
          .select("id")
          .eq("id", rawPdsEntryId)
          .eq("pds_version_id", submittedPds.id)
          .maybeSingle();
        if (entryError) {
          return {
            success: false,
            message: "We could not verify that PDS training entry. Refresh and try again.",
          };
        }
        if (!entry) {
          return {
            success: false,
            message: "That PDS training entry is no longer available. Refresh and choose again.",
          };
        }
        pdsLearningDevelopmentId = entry.id;
      } else {
        const { data: entry, error: entryError } = await applicant.supabase
          .from("pds_education")
          .select("id")
          .eq("id", rawPdsEntryId)
          .eq("pds_version_id", submittedPds.id)
          .maybeSingle();
        if (entryError) {
          return {
            success: false,
            message: "We could not verify that PDS education entry. Refresh and try again.",
          };
        }
        if (!entry) {
          return {
            success: false,
            message: "That PDS education entry is no longer available. Refresh and choose again.",
          };
        }
        pdsEducationId = entry.id;
      }
    }
  }

  const version = (latest?.version ?? 0) + 1;
  const filePath = crypto.randomUUID();
  const admin = createAdminClient();
  const { error: uploadError } = await admin.storage
    .from("applicant-documents")
    .upload(filePath, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    return { success: false, message: "The file could not be uploaded. Please try again." };
  }

  const { error: insertError } = await admin.from("documents").insert({
    applicant_id: applicant.applicant.id,
    document_type_id: documentTypeId,
    file_path: filePath,
    version,
    replaces_document_id: replacementDocumentId,
    status: "PENDING",
    ...(isTrainingCertificate
      ? {
          certificate_title: certificateTitle,
          training_hours: trainingResult.value,
          pds_learning_development_id: pdsLearningDevelopmentId,
        }
      : {}),
    ...(isTranscript
      ? {
          total_units: unitsResult.value,
          pds_education_id: pdsEducationId,
        }
      : {}),
    ...(hasOcrInput
      ? {
          ocr_training_hours: ocrTrainingHours,
          ocr_total_units: ocrTotalUnits,
          ocr_confidence: ocrConfidence,
          ocr_processed_at: new Date().toISOString(),
        }
      : {}),
  });

  if (insertError) {
    await admin.storage.from("applicant-documents").remove([filePath]);
    return {
      success: false,
      message: "The document record could not be saved. Refresh before trying again.",
    };
  }

  revalidatePath("/applicant/documents");
  revalidatePath("/applicant/dashboard");
  return { success: true, version };
}
