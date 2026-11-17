"use server";

import { revalidatePath } from "next/cache";
import {
  TRAINING_CERTIFICATE_DOCUMENT_TYPE,
  TRANSCRIPT_DOCUMENT_TYPE,
} from "@/constants/documents";
import { EDUCATION_LEVEL_OPTIONS } from "@/constants/pds-options";
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
  | { success: true; version: number; pdsSynced: boolean }
  | { success: false; message: string };

export type SubmitDocumentsResult =
  | { success: true; submittedCount: number; message: string }
  | { success: false; message: string };

export async function submitApplicantDocumentsForReview(): Promise<SubmitDocumentsResult> {
  const applicant = await getApplicantContext();
  if (!applicant) {
    return {
      success: false,
      message: "Sign in as an applicant to submit documents.",
    };
  }

  const { data: submittedCount, error } = await applicant.supabase.rpc(
    "submit_applicant_documents_for_review",
  );
  if (error || submittedCount === null) {
    return {
      success: false,
      message: "Your documents could not be submitted for review. Please try again.",
    };
  }

  revalidatePath("/applicant/documents");
  revalidatePath("/applicant/jobs");
  revalidatePath("/applicant/dashboard");
  return {
    success: true,
    submittedCount,
    message:
      submittedCount > 0
        ? `${submittedCount} document${submittedCount === 1 ? "" : "s"} submitted for review.`
        : "There are no new documents waiting to be submitted.",
  };
}

function parseMetric(
  raw: FormDataEntryValue | null,
  max: number,
  label: string,
  required: boolean,
): { value: number | null; error: string | null } {
  const parsed =
    typeof raw === "string" && raw.trim() !== "" ? Number(raw) : Number.NaN;
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

function parseCertificateDate(
  raw: FormDataEntryValue | null,
): { value: string | null; error: string | null } {
  if (raw === null || (typeof raw === "string" && !raw.trim())) {
    return { value: null, error: null };
  }
  if (typeof raw !== "string") {
    return { value: null, error: "Enter a valid certificate date." };
  }

  const value = raw.trim();
  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, yearText, monthText, dayText] = isoMatch;
    const year = Number(yearText);
    const month = Number(monthText) - 1;
    const day = Number(dayText);
    const date = new Date(Date.UTC(year, month, day));
    if (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month &&
      date.getUTCDate() === day
    ) {
      return { value, error: null };
    }
  }

  const textMatch = value.match(/^([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})$/);
  const months = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
  ];
  if (textMatch) {
    const month = months.findIndex((name) =>
      name.startsWith(textMatch[1].toLowerCase()),
    );
    const day = Number(textMatch[2]);
    const year = Number(textMatch[3]);
    if (month >= 0) {
      const date = new Date(Date.UTC(year, month, day));
      if (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month &&
        date.getUTCDate() === day
      ) {
        return {
          value: `${year.toString().padStart(4, "0")}-${(month + 1)
            .toString()
            .padStart(2, "0")}-${day.toString().padStart(2, "0")}`,
          error: null,
        };
      }
    }
  }

  return { value: null, error: "Enter a valid certificate date." };
}

function parseCertificateText(
  raw: FormDataEntryValue | null,
  label: string,
  maxLength: number,
): { value: string | null; error: string | null } {
  if (raw === null || (typeof raw === "string" && !raw.trim())) {
    return { value: null, error: null };
  }
  if (typeof raw !== "string" || raw.trim().length > maxLength) {
    return {
      value: null,
      error: `Certificate ${label} must be ${maxLength} characters or fewer.`,
    };
  }
  return { value: raw.trim(), error: null };
}

export async function uploadApplicantDocument(
  formData: FormData,
): Promise<DocumentUploadResult> {
  const applicant = await getApplicantContext();
  if (!applicant) {
    return {
      success: false,
      message: "Sign in as an applicant to upload documents.",
    };
  }

  const documentTypeId = formData.get("document_type_id");
  const file = formData.get("file");
  if (
    typeof documentTypeId !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(documentTypeId)
  ) {
    return { success: false, message: "Choose a valid document type." };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, message: "Choose a file to upload." };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { success: false, message: "Files must be 50 MB or smaller." };
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return {
      success: false,
      message: "Use a PDF, JPG, PNG, DOC, or DOCX file.",
    };
  }

  const [
    { data: documentType, error: typeError },
    { data: latest, error: versionError },
  ] = await Promise.all([
    applicant.supabase
      .from("document_types")
      .select("id, name")
      .eq("id", documentTypeId)
      .maybeSingle(),
    applicant.supabase
      .from("documents")
      .select("version, status")
      .eq("applicant_id", applicant.applicant.id)
      .eq("document_type_id", documentTypeId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (typeError) {
    return {
      success: false,
      message: "We could not verify the document type. Refresh and try again.",
    };
  }
  if (!documentType) {
    return {
      success: false,
      message: "That document type is no longer available.",
    };
  }
  if (versionError) {
    return {
      success: false,
      message:
        "We could not load the current document version. Refresh and try again.",
    };
  }
  if (
    latest?.status === "VERIFIED" &&
    documentType.name !== TRAINING_CERTIFICATE_DOCUMENT_TYPE
  ) {
    return {
      success: false,
      message:
        "This document is verified and locked. Contact the Document Reviewer if it needs to be reopened.",
    };
  }

  const isTrainingCertificate =
    documentType.name === TRAINING_CERTIFICATE_DOCUMENT_TYPE;
  const isTranscript = documentType.name === TRANSCRIPT_DOCUMENT_TYPE;
  const rawReplacementId = formData.get("replaces_document_id");
  let replacementDocumentId: string | null = null;
  if (rawReplacementId !== null) {
    if (
      !isTrainingCertificate ||
      typeof rawReplacementId !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(rawReplacementId)
    ) {
      return {
        success: false,
        message: "Choose a valid certificate to update.",
      };
    }
    replacementDocumentId = rawReplacementId;
    const { data: existingDocument, error: existingDocumentError } =
      await applicant.supabase
        .from("documents")
        .select("id, document_type_id, status")
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
    if (existingDocument.status === "VERIFIED") {
      return {
        success: false,
        message:
          "This document is verified and locked. It cannot be replaced.",
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
        message:
          "We could not verify the current certificate version. Refresh and try again.",
      };
    }
    if (existingReplacement) {
      return {
        success: false,
        message:
          "This certificate already has a newer file. Refresh and update the latest version instead.",
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
    "certificate_type",
    "certificate_issuer",
    "certificate_date",
    "training_hours",
    "pds_learning_development_id",
    "total_units",
    "pds_education_id",
    "current_highest_education_level",
  ].some((key) => formData.has(key));
  if (
    (isTrainingCertificate &&
      (formData.has("total_units") ||
        formData.has("pds_education_id") ||
        formData.has("current_highest_education_level") ||
        formData.has("ocr_total_units"))) ||
    (isTranscript &&
      (formData.has("certificate_title") ||
        formData.has("certificate_type") ||
        formData.has("certificate_issuer") ||
        formData.has("certificate_date") ||
        formData.has("training_hours") ||
        formData.has("pds_learning_development_id") ||
        formData.has("ocr_training_hours"))) ||
    (!isTrainingCertificate &&
      !isTranscript &&
      (hasApplicantMetricInput || hasOcrInput))
  ) {
    return {
      success: false,
      message: "Document values do not match this document type.",
    };
  }

  const trainingResult = isTrainingCertificate
    ? parseMetric(
        formData.get("training_hours"),
        999999.99,
        "certificate hours",
        true,
      )
    : { value: null, error: null };
  const rawCertificateTitle = isTrainingCertificate
    ? formData.get("certificate_title")
    : null;
  const certificateTitle =
    typeof rawCertificateTitle === "string" ? rawCertificateTitle.trim() : "";
  const certificateTypeResult = isTrainingCertificate
    ? parseCertificateText(formData.get("certificate_type"), "type", 200)
    : { value: null, error: null };
  const certificateIssuerResult = isTrainingCertificate
    ? parseCertificateText(formData.get("certificate_issuer"), "issuer", 500)
    : { value: null, error: null };
  const certificateDateResult = isTrainingCertificate
    ? parseCertificateDate(formData.get("certificate_date"))
    : { value: null, error: null };
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
    ? parseMetric(
        formData.get("total_units"),
        99999999.99,
        "total transcript units",
        true,
      )
    : { value: null, error: null };
  const rawHighestEducationLevel = isTranscript
    ? formData.get("current_highest_education_level")
    : null;
  const currentHighestEducationLevel =
    typeof rawHighestEducationLevel === "string"
      ? (EDUCATION_LEVEL_OPTIONS.find(
          ({ value }) => value === rawHighestEducationLevel,
        )?.value ?? null)
      : null;
  if (
    trainingResult.error ||
    unitsResult.error ||
    certificateTypeResult.error ||
    certificateIssuerResult.error ||
    certificateDateResult.error
  ) {
    return {
      success: false,
      message:
        trainingResult.error ??
        unitsResult.error ??
        certificateTypeResult.error ??
        certificateIssuerResult.error ??
        certificateDateResult.error ??
        "Enter a valid document value.",
    };
  }
  if (isTranscript && !currentHighestEducationLevel) {
    return {
      success: false,
      message: "Choose your current highest educational attainment.",
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
  let pdsLearningDevelopmentSortOrder: number | null = null;
  let pdsLearningDevelopmentNeedsClone = false;
  let pdsDraftVersionId: string | null = null;
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

      const { data: pdsVersions, error: pdsError } = await applicant.supabase
        .from("pds_versions")
        .select("id, status, version_no")
        .eq("applicant_id", applicant.applicant.id)
        .in("status", isTrainingCertificate ? ["DRAFT", "SUBMITTED"] : ["SUBMITTED"])
        .order("version_no", { ascending: false });
      if (pdsError) {
        return {
          success: false,
          message:
            "We could not verify your PDS. Refresh and try again.",
        };
      }
      const activePds =
        pdsVersions?.find((pds) => pds.status === "DRAFT") ??
        pdsVersions?.find((pds) => pds.status === "SUBMITTED");
      if (!activePds) {
        return {
          success: false,
          message: "Complete a PDS before linking this document to an entry.",
        };
      }

      if (isTrainingCertificate) {
        const { data: entry, error: entryError } = await applicant.supabase
          .from("pds_learning_development")
          .select("id, sort_order")
          .eq("id", rawPdsEntryId)
          .eq("pds_version_id", activePds.id)
          .maybeSingle();
        if (entryError) {
          return {
            success: false,
            message:
              "We could not verify that PDS training entry. Refresh and try again.",
          };
        }
        if (!entry) {
          return {
            success: false,
            message:
              "That PDS training entry is no longer available. Refresh and choose again.",
          };
        }
        pdsLearningDevelopmentId = entry.id;
        pdsLearningDevelopmentSortOrder = entry.sort_order;
        if (activePds.status === "DRAFT") {
          pdsDraftVersionId = activePds.id;
        } else {
          pdsLearningDevelopmentNeedsClone = true;
        }
      } else {
        const submittedPds = pdsVersions?.find(
          (pds) => pds.status === "SUBMITTED",
        );
        if (!submittedPds) {
          return {
            success: false,
            message: "Submit a PDS before linking this document to an entry.",
          };
        }
        const { data: entry, error: entryError } = await applicant.supabase
          .from("pds_education")
          .select("id")
          .eq("id", rawPdsEntryId)
          .eq("pds_version_id", submittedPds.id)
          .maybeSingle();
        if (entryError) {
          return {
            success: false,
            message:
              "We could not verify that PDS education entry. Refresh and try again.",
          };
        }
        if (!entry) {
          return {
            success: false,
            message:
              "That PDS education entry is no longer available. Refresh and choose again.",
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
    return {
      success: false,
      message: "The file could not be uploaded. Please try again.",
    };
  }

  let pdsSynced = false;
  let pdsSyncSnapshot:
    | {
        id: string;
        pds_version_id: string;
        title: string;
        date_from: string | null;
        date_to: string | null;
        hours: number | null;
        conducted_by: string | null;
      }
    | null = null;
  if (
    isTrainingCertificate &&
    pdsLearningDevelopmentId &&
    pdsLearningDevelopmentSortOrder !== null
  ) {
    if (pdsLearningDevelopmentNeedsClone) {
      const { data: clonedDraftId, error: cloneError } =
        await applicant.supabase.rpc("clone_pds_version");
      if (cloneError || !clonedDraftId) {
        await admin.storage.from("applicant-documents").remove([filePath]);
        return {
          success: false,
          message:
            "A PDS draft could not be prepared for syncing. Refresh and try again.",
        };
      }
      pdsDraftVersionId = clonedDraftId;
      const { data: draftEntry, error: draftEntryError } =
        await applicant.supabase
          .from("pds_learning_development")
          .select("id")
          .eq("pds_version_id", clonedDraftId)
          .eq("sort_order", pdsLearningDevelopmentSortOrder)
          .maybeSingle();
      if (draftEntryError || !draftEntry) {
        await admin.storage.from("applicant-documents").remove([filePath]);
        return {
          success: false,
          message:
            "The linked training entry could not be found in your PDS draft. Refresh and try again.",
        };
      }
      pdsLearningDevelopmentId = draftEntry.id;
    }

    if (!pdsDraftVersionId) {
      await admin.storage.from("applicant-documents").remove([filePath]);
      return {
        success: false,
        message: "The linked training entry is not in an editable PDS draft.",
      };
    }

    const { data: existingDraftEntry, error: existingDraftEntryError } =
      await applicant.supabase
        .from("pds_learning_development")
        .select("id, pds_version_id, title, date_from, date_to, hours, conducted_by")
        .eq("id", pdsLearningDevelopmentId)
        .eq("pds_version_id", pdsDraftVersionId)
        .maybeSingle();
    if (existingDraftEntryError || !existingDraftEntry) {
      await admin.storage.from("applicant-documents").remove([filePath]);
      return {
        success: false,
        message:
          "The linked training entry could not be updated in your PDS draft.",
      };
    }
    pdsSyncSnapshot = existingDraftEntry;
    const pdsUpdate = await applicant.supabase
      .from("pds_learning_development")
      .update({
        title: certificateTitle,
        hours: trainingResult.value,
        ...(certificateIssuerResult.value
          ? { conducted_by: certificateIssuerResult.value }
          : {}),
        ...(certificateDateResult.value
          ? {
              date_from: certificateDateResult.value,
              date_to: certificateDateResult.value,
            }
          : {}),
      })
      .eq("id", pdsLearningDevelopmentId)
      .eq("pds_version_id", pdsDraftVersionId);
    if (pdsUpdate.error) {
      await admin.storage.from("applicant-documents").remove([filePath]);
      return {
        success: false,
        message:
          "The linked training entry could not be synced to your PDS draft. Refresh and try again.",
      };
    }
    pdsSynced = true;
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
          certificate_type: certificateTypeResult.value,
          certificate_issuer: certificateIssuerResult.value,
          certificate_date: certificateDateResult.value,
          training_hours: trainingResult.value,
          pds_learning_development_id: pdsLearningDevelopmentId,
        }
      : {}),
    ...(isTranscript
      ? {
          total_units: unitsResult.value,
          pds_education_id: pdsEducationId,
          current_highest_education_level: currentHighestEducationLevel,
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
    if (pdsSyncSnapshot) {
      const { error: rollbackError } = await applicant.supabase
        .from("pds_learning_development")
        .update({
          title: pdsSyncSnapshot.title,
          date_from: pdsSyncSnapshot.date_from,
          date_to: pdsSyncSnapshot.date_to,
          hours: pdsSyncSnapshot.hours,
          conducted_by: pdsSyncSnapshot.conducted_by,
        })
        .eq("id", pdsSyncSnapshot.id)
        .eq("pds_version_id", pdsSyncSnapshot.pds_version_id);
      if (rollbackError) {
        await admin.storage.from("applicant-documents").remove([filePath]);
        return {
          success: false,
          message:
            "The document could not be saved, and the PDS draft sync could not be reverted. Review your PDS draft before retrying.",
        };
      }
    }
    await admin.storage.from("applicant-documents").remove([filePath]);
    return {
      success: false,
      message:
        "The document record could not be saved. Refresh before trying again.",
    };
  }

  revalidatePath("/applicant/documents");
  revalidatePath("/applicant/dashboard");
  revalidatePath("/applicant/pds");
  return { success: true, version, pdsSynced };
}
