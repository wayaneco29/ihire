"use server";

import { getApplicantContext } from "@/lib/auth/server";
import type { Json } from "@/types/database";
import dayjs from "dayjs";
import { revalidatePath } from "next/cache";
import { ValidationError } from "yup";
import { completeAndAdvanceStep, type NavigationResult } from "../action-utils";
import { pdsStepFourSchema, pdsStepFiveSchema } from "../schema";

export async function savePdsEligibilityStep(
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
    values = await pdsStepFourSchema.validate(input, {
      abortEarly: false,
      stripUnknown: true,
    });
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof ValidationError
          ? error.errors[0] ?? "Check the eligibility details."
          : "Check the eligibility details.",
    };
  }

  const { error: draftError } = await applicant.supabase.rpc(
    "save_pds_step_draft_v2",
    {
      p_pds_version_id: pdsVersionId,
      p_step_number: 4,
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
    .from("pds_eligibility")
    .delete()
    .eq("pds_version_id", pdsVersionId);
  if (deleteError) {
    return {
      success: false,
      message: "Your eligibility records could not be updated. Please try again.",
    };
  }

  if (values.eligibility.length > 0) {
    const rows = values.eligibility.map((row, index) => ({
      pds_version_id: pdsVersionId,
      eligibility_name: row.eligibility_name,
      rating: row.rating ?? null,
      exam_date: row.exam_date
        ? dayjs(row.exam_date).format("YYYY-MM-DD")
        : null,
      exam_place: row.exam_place ?? null,
      license_no: row.license_no ?? null,
      license_valid_until: row.license_valid_until
        ? dayjs(row.license_valid_until).format("YYYY-MM-DD")
        : null,
      sort_order: index + 1,
    }));
    const { error: insertError } = await applicant.supabase
      .from("pds_eligibility")
      .insert(rows);
    if (insertError) {
      return {
        success: false,
        message: "Your eligibility records could not be saved. Please try again.",
      };
    }
  }

  const completion = await completeAndAdvanceStep(
    applicant.supabase,
    pdsVersionId,
    4,
  );
  if (!completion.success) return completion;

  revalidatePath("/applicant/pds");
  return completion;
}

export async function savePdsWorkExperienceStep(
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
    values = await pdsStepFiveSchema.validate(input, {
      abortEarly: false,
      stripUnknown: true,
    });
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof ValidationError
          ? error.errors[0] ?? "Check your work experience details."
          : "Check your work experience details.",
    };
  }

  const orderedRows = [...values.workExperience].sort(
    (left, right) =>
      dayjs(right.date_from).valueOf() - dayjs(left.date_from).valueOf(),
  );
  const savedValues = { workExperience: orderedRows };
  const { error: draftError } = await applicant.supabase.rpc(
    "save_pds_step_draft_v2",
    {
      p_pds_version_id: pdsVersionId,
      p_step_number: 5,
      p_payload: JSON.parse(JSON.stringify(savedValues)) as Json,
    },
  );
  if (draftError) {
    return {
      success: false,
      message: "Your PDS draft could not be saved. Please try again.",
    };
  }

  const { error: deleteError } = await applicant.supabase
    .from("pds_work_experience")
    .delete()
    .eq("pds_version_id", pdsVersionId);
  if (deleteError) {
    return {
      success: false,
      message: "Your work experience could not be updated. Please try again.",
    };
  }

  if (orderedRows.length > 0) {
    const rows = orderedRows.map((row, index) => ({
      pds_version_id: pdsVersionId,
      date_from: dayjs(row.date_from).format("YYYY-MM-DD"),
      date_to: row.date_to ? dayjs(row.date_to).format("YYYY-MM-DD") : null,
      position_title: row.position_title,
      agency_company: row.agency_company,
      monthly_salary: row.monthly_salary ?? null,
      salary_grade_step: row.salary_grade_step ?? null,
      appointment_status:
        row.appointment_status === "Other"
          ? row.appointment_status_other
          : row.appointment_status || null,
      is_gov_service: row.is_gov_service,
      duties_description: row.duties_description ?? null,
      sort_order: index + 1,
    }));
    const { error: insertError } = await applicant.supabase
      .from("pds_work_experience")
      .insert(rows);
    if (insertError) {
      return {
        success: false,
        message: "Your work experience could not be saved. Please try again.",
      };
    }
  }

  const completion = await completeAndAdvanceStep(
    applicant.supabase,
    pdsVersionId,
    5,
  );
  if (!completion.success) return completion;

  revalidatePath("/applicant/pds");
  return completion;
}
