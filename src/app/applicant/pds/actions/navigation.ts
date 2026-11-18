"use server";

import { createClient } from "@/lib/supabase/server";
import { getApplicantContext } from "@/lib/auth/server";
import type { Json } from "@/types/database";
import type { NavigationResult } from "../action-utils";

export async function setPdsWizardStep(
  pdsVersionId: string,
  targetStep: number,
): Promise<NavigationResult> {
  if (
    !/^[0-9a-f-]{36}$/i.test(pdsVersionId) ||
    !Number.isInteger(targetStep) ||
    targetStep < 1 ||
    targetStep > 11
  ) {
    return { success: false, message: "That PDS step is not available." };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, message: "Sign in again to continue your PDS." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "APPLICANT") {
    return { success: false, message: "Applicant access is required." };
  }

  const { data, error } = await supabase.rpc("set_pds_current_step_v2", {
    p_pds_version_id: pdsVersionId,
    p_step_number: targetStep,
  });

  if (error || data === null) {
    return {
      success: false,
      message: "You can only open a finished step or your next unfinished step.",
    };
  }

  return { success: true, currentStep: data };
}

export async function savePdsStepDraft(
  pdsVersionId: string,
  step: number,
  payload: Json,
): Promise<{ success: boolean; message?: string }> {
  if (
    !/^[0-9a-f-]{36}$/i.test(pdsVersionId) ||
    !Number.isInteger(step) ||
    step < 1 ||
    step > 11 ||
    !payload ||
    Array.isArray(payload) ||
    typeof payload !== "object"
  ) {
    return { success: false, message: "This section could not be saved." };
  }

  const applicant = await getApplicantContext();
  if (!applicant) {
    return { success: false, message: "Applicant access is required." };
  }

  const { error } = await applicant.supabase.rpc("save_pds_step_draft_v2", {
    p_pds_version_id: pdsVersionId,
    p_step_number: step,
    p_payload: payload,
  });

  if (error) {
    return { success: false, message: "Your changes could not be saved yet." };
  }
  return { success: true };
}
