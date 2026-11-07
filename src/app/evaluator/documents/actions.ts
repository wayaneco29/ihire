"use server";

import { revalidatePath } from "next/cache";
import { getEvaluatorContext } from "@/lib/auth/server";
import { DOCUMENT_REVIEW_STATUSES } from "./schema";

export async function submitDocumentReview(input: {
  applicationId: string;
  documentId: string;
  status: string;
  remarks: string;
}): Promise<{ success: boolean; message: string }> {
  if (
    !input ||
    typeof input !== "object" ||
    typeof input.applicationId !== "string" ||
    typeof input.documentId !== "string" ||
    typeof input.status !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(input.applicationId) ||
    !/^[0-9a-f-]{36}$/i.test(input.documentId) ||
    !DOCUMENT_REVIEW_STATUSES.includes(input.status as (typeof DOCUMENT_REVIEW_STATUSES)[number]) ||
    typeof input.remarks !== "string" ||
    input.remarks.length > 2000
  ) {
    return { success: false, message: "Enter a valid document review." };
  }

  const evaluator = await getEvaluatorContext();
  if (!evaluator) {
    return { success: false, message: "Evaluator access is required." };
  }

  const { data: document, error: documentError } = await evaluator.supabase
    .from("v_anonymized_documents")
    .select("document_id, document_status")
    .eq("application_id", input.applicationId)
    .eq("document_id", input.documentId)
    .maybeSingle();

  if (documentError || !document) {
    return { success: false, message: "This document is no longer available for review." };
  }
  if (document.document_status !== "FOR_REVIEW") {
    return { success: false, message: "This document is no longer waiting for review. Refresh the page." };
  }

  const { error } = await evaluator.supabase.from("document_reviews").insert({
    document_id: input.documentId,
    evaluator_id: evaluator.user.id,
    status: input.status as (typeof DOCUMENT_REVIEW_STATUSES)[number],
    remarks: input.remarks.trim() || null,
  });

  if (error) {
    return { success: false, message: "The review could not be saved. Refresh and try again." };
  }

  revalidatePath(`/evaluator/documents/${input.documentId}`);
  revalidatePath(`/evaluator/applications/${input.applicationId}`);
  revalidatePath("/evaluator/reviews");
  return { success: true, message: "Document review saved." };
}
