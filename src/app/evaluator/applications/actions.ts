"use server";

import { revalidatePath } from "next/cache";
import { getEvaluatorContext } from "@/lib/auth/server";
import { APPLICATION_EVALUATION_RESULTS } from "./schema";

export async function submitApplicationEvaluation(input: {
  applicationId: string;
  result: string;
  remarks: string;
}): Promise<{ success: boolean; message: string }> {
  if (
    !input ||
    typeof input !== "object" ||
    typeof input.applicationId !== "string" ||
    typeof input.result !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(input.applicationId) ||
    !APPLICATION_EVALUATION_RESULTS.includes(input.result as (typeof APPLICATION_EVALUATION_RESULTS)[number]) ||
    typeof input.remarks !== "string" ||
    input.remarks.length > 2000
  ) {
    return { success: false, message: "Enter a valid application evaluation." };
  }

  const evaluator = await getEvaluatorContext();
  if (!evaluator) {
    return { success: false, message: "Evaluator access is required." };
  }

  const { data: application, error: applicationError } = await evaluator.supabase
    .from("v_anonymized_applicants")
    .select("application_id, application_status")
    .eq("application_id", input.applicationId)
    .maybeSingle();
  if (applicationError || !application) {
    return { success: false, message: "This application is no longer available for review." };
  }
  if (["HIRED", "REJECTED"].includes(application.application_status)) {
    return { success: false, message: "This application already has a final hiring decision." };
  }

  const [requiredTypesResult, documentsResult] = await Promise.all([
    evaluator.supabase
      .from("document_types")
      .select("name")
      .eq("is_required", true),
    evaluator.supabase
      .from("v_anonymized_documents")
      .select("document_type, document_status, uploaded_at")
      .eq("application_id", input.applicationId)
      .order("uploaded_at", { ascending: false }),
  ]);

  if (requiredTypesResult.error || documentsResult.error) {
    return { success: false, message: "Required document statuses could not be checked. Refresh and try again." };
  }

  const latestByType = new Map<string, string>();
  for (const document of documentsResult.data ?? []) {
    if (!latestByType.has(document.document_type)) {
      latestByType.set(document.document_type, document.document_status);
    }
  }
  const missingTypes = (requiredTypesResult.data ?? [])
    .filter((type) => latestByType.get(type.name) !== "VERIFIED")
    .map((type) => type.name);

  if (missingTypes.length) {
    return {
      success: false,
      message: `Required documents must be uploaded and verified first: ${missingTypes.join(", ")}.`,
    };
  }

  const { error } = await evaluator.supabase.from("application_evaluations").insert({
    application_id: input.applicationId,
    evaluator_id: evaluator.user.id,
    result: input.result,
    remarks: input.remarks.trim() || null,
  });

  if (error) {
    return { success: false, message: "The evaluation could not be saved. Refresh and try again." };
  }

  revalidatePath(`/evaluator/applications/${input.applicationId}`);
  revalidatePath("/evaluator/reviews");
  return { success: true, message: "Application evaluation saved." };
}
