"use server";

import { revalidatePath } from "next/cache";
import {
  TRAINING_CERTIFICATE_DOCUMENT_TYPE,
  TRANSCRIPT_DOCUMENT_TYPE,
} from "@/constants/documents";
import { getDocumentReviewerContext } from "@/lib/auth/server";
import { DOCUMENT_REVIEW_STATUSES } from "./documents/schema";

export async function createDocumentReviewerPreviewUrl(input: {
  documentId: string;
}): Promise<{
  success: boolean;
  message: string;
  signedUrl?: string;
  contentType?: string;
}> {
  if (
    !input ||
    typeof input !== "object" ||
    typeof input.documentId !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(input.documentId)
  ) {
    return { success: false, message: "Enter a valid document." };
  }

  const reviewer = await getDocumentReviewerContext();
  if (!reviewer) {
    return { success: false, message: "Document Reviewer access is required." };
  }

  const { data: document, error: documentError } = await reviewer.supabase
    .from("v_document_review_queue")
    .select("storage_key")
    .eq("document_id", input.documentId)
    .maybeSingle();

  if (documentError || !document) {
    return {
      success: false,
      message: "This document is no longer available for preview.",
    };
  }

  const { data: files, error: fileError } = await reviewer.supabase.storage
    .from("applicant-documents")
    .list("", { limit: 1000, search: document.storage_key });
  if (fileError) {
    return {
      success: false,
      message: "Document details could not be loaded. Please try again.",
    };
  }
  const file = files.find((item) => item.name === document.storage_key);
  if (!file) {
    return {
      success: false,
      message: "This document file is no longer available.",
    };
  }

  const { data, error } = await reviewer.supabase.storage
    .from("applicant-documents")
    .createSignedUrl(document.storage_key, 60);
  if (error || !data?.signedUrl) {
    return {
      success: false,
      message: "A secure preview link could not be created. Please try again.",
    };
  }

  return {
    success: true,
    message: "Secure document preview ready.",
    signedUrl: data.signedUrl,
    contentType:
      typeof file.metadata?.mimetype === "string"
        ? file.metadata.mimetype
        : undefined,
  };
}

export async function submitDocumentReview(input: {
  documentId: string;
  status: string;
  remarks: string;
  confirmedTrainingHours: number | null;
  confirmedTotalUnits: number | null;
}): Promise<{ success: boolean; message: string }> {
  if (
    !input ||
    typeof input !== "object" ||
    typeof input.documentId !== "string" ||
    typeof input.status !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(input.documentId) ||
    !DOCUMENT_REVIEW_STATUSES.includes(
      input.status as (typeof DOCUMENT_REVIEW_STATUSES)[number],
    ) ||
    typeof input.remarks !== "string" ||
    input.remarks.length > 2000 ||
    (input.confirmedTrainingHours !== null &&
      typeof input.confirmedTrainingHours !== "number") ||
    (input.confirmedTotalUnits !== null &&
      typeof input.confirmedTotalUnits !== "number")
  ) {
    return { success: false, message: "Enter a valid document review." };
  }

  const reviewer = await getDocumentReviewerContext();
  if (!reviewer) {
    return { success: false, message: "Document Reviewer access is required." };
  }

  const { data: document, error: documentError } = await reviewer.supabase
    .from("v_document_review_queue")
    .select("document_id, applicant_number, document_status, document_type")
    .eq("document_id", input.documentId)
    .maybeSingle();

  if (documentError || !document) {
    return {
      success: false,
      message: "This document is no longer available for review.",
    };
  }
  if (document.document_status !== "FOR_REVIEW") {
    return {
      success: false,
      message:
        "This document is no longer waiting for review. Refresh the page.",
    };
  }

  const includesTrainingHours =
    document.document_type === TRAINING_CERTIFICATE_DOCUMENT_TYPE;
  const includesTotalUnits = document.document_type === TRANSCRIPT_DOCUMENT_TYPE;
  const isValidMetric = (value: number | null, max: number) =>
    value === null ||
    (Number.isFinite(value) &&
      value >= 0 &&
      value <= max &&
      Math.abs(value * 100 - Math.round(value * 100)) < 1e-8);
  if (
    !isValidMetric(input.confirmedTrainingHours, 999999.99) ||
    !isValidMetric(input.confirmedTotalUnits, 99999999.99) ||
    (includesTrainingHours &&
      input.status === "VERIFIED" &&
      input.confirmedTrainingHours === null) ||
    (includesTotalUnits &&
      input.status === "VERIFIED" &&
      input.confirmedTotalUnits === null) ||
    (!includesTrainingHours && input.confirmedTrainingHours !== null) ||
    (!includesTotalUnits && input.confirmedTotalUnits !== null)
  ) {
    return {
      success: false,
      message: "Enter valid reviewer-confirmed values for this document type.",
    };
  }

  const { error } = await reviewer.supabase.from("document_reviews").insert({
    document_id: input.documentId,
    reviewer_id: reviewer.user.id,
    status: input.status as (typeof DOCUMENT_REVIEW_STATUSES)[number],
    remarks: input.remarks.trim() || null,
    confirmed_training_hours:
      input.status === "VERIFIED" && includesTrainingHours
        ? input.confirmedTrainingHours
        : null,
    confirmed_total_units:
      input.status === "VERIFIED" && includesTotalUnits
        ? input.confirmedTotalUnits
        : null,
  });

  if (error) {
    return {
      success: false,
      message: "The review could not be saved. Refresh and try again.",
    };
  }

  revalidatePath(`/document-reviewer/documents/${input.documentId}`);
  revalidatePath("/document-reviewer/documents");
  revalidatePath(
    `/document-reviewer/applicants/${encodeURIComponent(document.applicant_number)}`,
  );
  return { success: true, message: "Document review saved." };
}
