"use server";

import { getApplicantContext } from "@/lib/auth/server";
import type { Json } from "@/types/database";
import { revalidatePath } from "next/cache";
import { ValidationError } from "yup";
import { completeAndAdvanceStep, type NavigationResult } from "../action-utils";
import { pdsStepTenSchema, pdsStepElevenSchema } from "../schema";

export async function savePdsReferencesStep(
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
    values = await pdsStepTenSchema.validate(input, {
      abortEarly: false,
      stripUnknown: true,
    });
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof ValidationError
          ? error.errors[0] ?? "Enter exactly three references and confirm they are unrelated."
          : "Enter exactly three references and confirm they are unrelated.",
    };
  }

  const { error: draftError } = await applicant.supabase.rpc(
    "save_pds_step_draft",
    {
      p_pds_version_id: pdsVersionId,
      p_step_number: 10,
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
    .from("pds_references")
    .delete()
    .eq("pds_version_id", pdsVersionId);
  if (deleteError) {
    return {
      success: false,
      message: "Your references could not be updated. Please try again.",
    };
  }

  const rows = values.references.map((row, index) => ({
    pds_version_id: pdsVersionId,
    name: row.name,
    address: row.address,
    contact: row.contact,
    sort_order: index + 1,
  }));
  const { error: insertError } = await applicant.supabase
    .from("pds_references")
    .insert(rows);
  if (insertError) {
    return {
      success: false,
      message: "Your references could not be saved. Please try again.",
    };
  }

  const completion = await completeAndAdvanceStep(
    applicant.supabase,
    pdsVersionId,
    10,
  );
  if (!completion.success) return completion;

  revalidatePath("/applicant/pds");
  return completion;
}

export async function submitPdsVersion(
  pdsVersionId: string,
  input: unknown,
): Promise<{ success: boolean; message?: string }> {
  if (!/^[0-9a-f-]{36}$/i.test(pdsVersionId)) {
    return { success: false, message: "This PDS draft is not available." };
  }

  const applicant = await getApplicantContext();
  if (!applicant) {
    return { success: false, message: "Applicant access is required." };
  }

  try {
    await pdsStepElevenSchema.validate(input, { abortEarly: false });
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof ValidationError
          ? error.errors[0] ?? "Confirm that you reviewed your PDS."
          : "Confirm that you reviewed your PDS.",
    };
  }

  const completion = await completeAndAdvanceStep(
    applicant.supabase,
    pdsVersionId,
    11,
  );
  if (!completion.success) {
    return {
      success: false,
      message: "Complete steps 1 through 10 before submitting your PDS.",
    };
  }

  const { error } = await applicant.supabase.rpc("submit_pds_version", {
    p_pds_version_id: pdsVersionId,
  });
  if (error) {
    return {
      success: false,
      message:
        "Your PDS could not be submitted. Review the completed sections and try again.",
    };
  }

  revalidatePath("/applicant/pds");
  revalidatePath("/applicant");
  revalidatePath("/applicant/dashboard");
  return { success: true };
}
