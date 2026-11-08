"use server";

import { revalidatePath } from "next/cache";
import { TRAINING_CERTIFICATE_DOCUMENT_TYPE } from "@/constants/documents";
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
  let trainingHours: number | null = null;
  let pdsLearningDevelopmentId: string | null = null;

  if (isTrainingCertificate) {
    const rawHours = formData.get("training_hours");
    const rawLearningId = formData.get("pds_learning_development_id");
    const parsedHours = typeof rawHours === "string" && rawHours.trim() !== ""
      ? Number(rawHours)
      : Number.NaN;

    if (
      !Number.isFinite(parsedHours) ||
      parsedHours < 0 ||
      parsedHours > 999999.99 ||
      Math.abs(parsedHours * 100 - Math.round(parsedHours * 100)) >= 1e-8
    ) {
      return { success: false, message: "Enter certificate hours from 0 to 999,999.99, using at most two decimals." };
    }

    trainingHours = parsedHours;
    if (typeof rawLearningId !== "string") {
      return { success: false, message: "Choose a valid PDS training entry or leave it unlinked." };
    }
    if (rawLearningId !== "") {
      if (!/^[0-9a-f-]{36}$/i.test(rawLearningId)) {
        return { success: false, message: "Choose a valid PDS training entry or leave it unlinked." };
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
        return { success: false, message: "We could not verify your submitted PDS. Refresh and try again." };
      }
      if (!submittedPds) {
        return { success: false, message: "Submit a PDS before linking this certificate to a training entry." };
      }

      const { data: learningEntry, error: learningError } = await applicant.supabase
        .from("pds_learning_development")
        .select("id")
        .eq("id", rawLearningId)
        .eq("pds_version_id", submittedPds.id)
        .maybeSingle();

      if (learningError) {
        return { success: false, message: "We could not verify that PDS training entry. Refresh and try again." };
      }
      if (!learningEntry) {
        return { success: false, message: "That PDS training entry is no longer available. Refresh and choose again." };
      }

      pdsLearningDevelopmentId = learningEntry.id;
    }
  } else if (formData.has("training_hours") || formData.has("pds_learning_development_id")) {
    return { success: false, message: "Hours can only be recorded for Training and Seminar Certificates." };
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
    status: "PENDING",
    ...(isTrainingCertificate
      ? {
          training_hours: trainingHours,
          pds_learning_development_id: pdsLearningDevelopmentId,
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
