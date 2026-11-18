"use server";

import { getApplicantContext } from "@/lib/auth/server";
import type { Json } from "@/types/database";
import dayjs from "dayjs";
import { revalidatePath } from "next/cache";
import { ValidationError } from "yup";
import { completeAndAdvanceStep, type NavigationResult } from "../action-utils";
import { pdsStepSixSchema, pdsStepSevenSchema } from "../schema";

export async function savePdsVoluntaryWorkStep(
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
    values = await pdsStepSixSchema.validate(input, {
      abortEarly: false,
      stripUnknown: true,
    });
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof ValidationError
          ? error.errors[0] ?? "Check your voluntary work details."
          : "Check your voluntary work details.",
    };
  }

  const { error: draftError } = await applicant.supabase.rpc(
    "save_pds_step_draft_v2",
    {
      p_pds_version_id: pdsVersionId,
      p_step_number: 6,
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
    .from("pds_voluntary_work")
    .delete()
    .eq("pds_version_id", pdsVersionId);
  if (deleteError) {
    return {
      success: false,
      message: "Your voluntary work could not be updated. Please try again.",
    };
  }

  if (values.voluntaryWork.length > 0) {
    const rows = values.voluntaryWork.map((row, index) => ({
      pds_version_id: pdsVersionId,
      organization_name_address: row.organization_name_address,
      date_from: row.date_from ? dayjs(row.date_from).format("YYYY-MM-DD") : null,
      date_to: row.date_to ? dayjs(row.date_to).format("YYYY-MM-DD") : null,
      hours: row.hours ?? null,
      position_nature: row.position_nature ?? null,
      sort_order: index + 1,
    }));
    const { error: insertError } = await applicant.supabase
      .from("pds_voluntary_work")
      .insert(rows);
    if (insertError) {
      return {
        success: false,
        message: "Your voluntary work could not be saved. Please try again.",
      };
    }
  }

  const completion = await completeAndAdvanceStep(
    applicant.supabase,
    pdsVersionId,
    6,
  );
  if (!completion.success) return completion;

  revalidatePath("/applicant/pds");
  return completion;
}

export async function savePdsLearningStep(
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
    values = await pdsStepSevenSchema.validate(input, {
      abortEarly: false,
      stripUnknown: true,
    });
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof ValidationError
          ? error.errors[0] ?? "Check your training details."
          : "Check your training details.",
    };
  }

  const { error: draftError } = await applicant.supabase.rpc(
    "save_pds_step_draft_v2",
    {
      p_pds_version_id: pdsVersionId,
      p_step_number: 7,
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
    .from("pds_learning_development")
    .delete()
    .eq("pds_version_id", pdsVersionId);
  if (deleteError) {
    return {
      success: false,
      message: "Your training history could not be updated. Please try again.",
    };
  }

  if (values.learningDevelopment.length > 0) {
    const rows = values.learningDevelopment.map((row, index) => ({
      pds_version_id: pdsVersionId,
      title: row.title,
      date_from: row.date_from ? dayjs(row.date_from).format("YYYY-MM-DD") : null,
      date_to: row.date_to ? dayjs(row.date_to).format("YYYY-MM-DD") : null,
      hours: row.hours ?? null,
      ld_type:
        row.ld_type === "Other" ? row.ld_type_other : row.ld_type || null,
      conducted_by: row.conducted_by ?? null,
      sort_order: index + 1,
    }));
    const { error: insertError } = await applicant.supabase
      .from("pds_learning_development")
      .insert(rows);
    if (insertError) {
      return {
        success: false,
        message: "Your training history could not be saved. Please try again.",
      };
    }
  }

  const completion = await completeAndAdvanceStep(
    applicant.supabase,
    pdsVersionId,
    7,
  );
  if (!completion.success) return completion;

  revalidatePath("/applicant/pds");
  return completion;
}
