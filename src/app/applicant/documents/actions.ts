"use server";

import { revalidatePath } from "next/cache";
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
        .select("id")
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

  if (typeError || !documentType) {
    return { success: false, message: "That document type is no longer available." };
  }
  if (versionError) {
    return { success: false, message: "We could not load the current document version. Refresh and try again." };
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
