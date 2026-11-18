"use server";

import { getApplicantContext } from "@/lib/auth/server";
import type { Json } from "@/types/database";
import dayjs from "dayjs";
import { revalidatePath } from "next/cache";
import { ValidationError } from "yup";
import { completeAndAdvanceStep, type NavigationResult } from "../action-utils";
import { pdsStepEightSchema, pdsStepNineSchema } from "../schema";

export async function savePdsOtherInfoStep(
  pdsVersionId: string,
  input: unknown,
): Promise<NavigationResult> {
  if (!/^[0-9a-f-]{36}$/i.test(pdsVersionId)) {
    return { success: false, message: "This PDS draft is not available." };
  }

  const applicant = await getApplicantContext();
  if (!applicant) {
    return { success: false, message: "Applicant access is required." };
  }

  let values;
  try {
    values = await pdsStepEightSchema.validate(input, {
      abortEarly: false,
      stripUnknown: true,
    });
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof ValidationError
          ? error.errors[0] ?? "Check your other information."
          : "Check your other information.",
    };
  }

  const { error: draftError } = await applicant.supabase.rpc(
    "save_pds_step_draft_v2",
    {
      p_pds_version_id: pdsVersionId,
      p_step_number: 8,
      p_payload: JSON.parse(JSON.stringify(values)) as Json,
    },
  );
  if (draftError) {
    return {
      success: false,
      message: "Your PDS draft could not be saved. Please try again.",
    };
  }

  const { error: deleteError } = await applicant.supabase
    .from("pds_other_info")
    .delete()
    .eq("pds_version_id", pdsVersionId);
  if (deleteError) {
    return {
      success: false,
      message: "Your entries could not be updated. Please try again.",
    };
  }

  if (values.otherInfo.length > 0) {
    const rows = values.otherInfo.map((row, index) => ({
      pds_version_id: pdsVersionId,
      category: row.category,
      description: row.description,
      sort_order: index + 1,
    }));
    const { error: insertError } = await applicant.supabase
      .from("pds_other_info")
      .insert(rows);
    if (insertError) {
      return {
        success: false,
        message: "Your entries could not be saved. Please try again.",
      };
    }
  }

  const completion = await completeAndAdvanceStep(
    applicant.supabase,
    pdsVersionId,
    8,
  );
  if (!completion.success) return completion;

  revalidatePath("/applicant/pds");
  return completion;
}

export async function savePdsQuestionnaireStep(
  pdsVersionId: string,
  input: unknown,
): Promise<NavigationResult> {
  if (!/^[0-9a-f-]{36}$/i.test(pdsVersionId)) {
    return { success: false, message: "This PDS draft is not available." };
  }

  const applicant = await getApplicantContext();
  if (!applicant) {
    return { success: false, message: "Applicant access is required." };
  }

  let values;
  try {
    values = await pdsStepNineSchema.validate(input, {
      abortEarly: false,
      stripUnknown: true,
    });
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof ValidationError
          ? error.errors[0] ?? "Answer each questionnaire item and provide requested details."
          : "Answer each questionnaire item and provide requested details.",
    };
  }

  const { error: draftError } = await applicant.supabase.rpc(
    "save_pds_step_draft_v2",
    {
      p_pds_version_id: pdsVersionId,
      p_step_number: 9,
      p_payload: JSON.parse(JSON.stringify(values)) as Json,
    },
  );
  if (draftError) {
    return {
      success: false,
      message: "Your PDS draft could not be saved. Please try again.",
    };
  }

  const { error: deleteError } = await applicant.supabase
    .from("pds_questionnaire")
    .delete()
    .eq("pds_version_id", pdsVersionId);
  if (deleteError) {
    return {
      success: false,
      message: "Your questionnaire answers could not be updated. Please try again.",
    };
  }

  const rows = values.questionnaire.map((row) => ({
    pds_version_id: pdsVersionId,
    question_code: row.question_code,
    answer: row.answer,
    details:
      row.answer && row.question_code === "39"
        ? row.country
        : row.answer &&
            ["34A", "34B", "35A", "35B", "36", "37", "38A", "38B", "40A"].includes(
              row.question_code,
            )
          ? row.details
          : null,
    date_filed:
      row.answer && row.question_code === "35B" && row.date_filed
        ? dayjs(row.date_filed).format("YYYY-MM-DD")
        : null,
    case_status:
      row.answer && row.question_code === "35B" ? row.case_status : null,
    id_no:
      row.answer && ["40B", "40C"].includes(row.question_code)
        ? row.id_no
        : null,
  }));
  const { error: insertError } = await applicant.supabase
    .from("pds_questionnaire")
    .insert(rows);
  if (insertError) {
    return {
      success: false,
      message: "Your questionnaire answers could not be saved. Please try again.",
    };
  }

  const completion = await completeAndAdvanceStep(
    applicant.supabase,
    pdsVersionId,
    9,
  );
  if (!completion.success) return completion;

  revalidatePath("/applicant/pds");
  return completion;
}
